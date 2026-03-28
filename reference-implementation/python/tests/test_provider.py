"""Tests for OSPProvider using FastAPI TestClient — v1.1."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from osp.provider import OSPProvider
from osp.types import (
    CredentialBundle,
    HealthStatus,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    UsageDimension,
    UsageReport,
)


# ---------------------------------------------------------------------------
# Concrete test provider
# ---------------------------------------------------------------------------

class FakeProvider(OSPProvider):
    """In-memory provider for testing."""

    def __init__(self, manifest: ServiceManifest) -> None:
        super().__init__(manifest)
        self._resources: dict[str, dict[str, Any]] = {}
        self._counter = 0

    async def on_provision(self, request: ProvisionRequest) -> ProvisionResponse:
        self._counter += 1
        resource_id = f"res_{self._counter:04d}"
        self._resources[resource_id] = {
            "offering_id": request.offering_id,
            "tier_id": request.tier_id,
            "config": request.config,
        }
        return ProvisionResponse(
            resource_id=resource_id,
            status="active",
            message="Created successfully.",
            credentials=CredentialBundle(
                resource_id=resource_id,
                credentials={"API_KEY": f"key_{resource_id}"},
                issued_at="2026-01-01T00:00:00Z",
            ),
        )

    async def on_deprovision(self, resource_id: str) -> None:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        del self._resources[resource_id]

    async def on_get_credentials(self, resource_id: str) -> CredentialBundle:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        return CredentialBundle(
            resource_id=resource_id,
            credentials={"API_KEY": f"key_{resource_id}"},
            issued_at="2026-01-01T00:00:00Z",
        )

    async def on_rotate_credentials(self, resource_id: str) -> CredentialBundle:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        return CredentialBundle(
            resource_id=resource_id,
            credentials={"API_KEY": f"rotated_key_{resource_id}"},
            issued_at="2026-01-01T00:00:00Z",
        )

    async def on_get_status(self, resource_id: str) -> ResourceStatus:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        return ResourceStatus(
            resource_id=resource_id,
            status="active",
            offering_id=self._resources[resource_id]["offering_id"],
            tier_id=self._resources[resource_id]["tier_id"],
            created_at="2026-01-01T00:00:00Z",
        )

    async def on_get_usage(self, resource_id: str) -> UsageReport:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        return UsageReport(
            resource_id=resource_id,
            period_start="2026-03-01T00:00:00Z",
            period_end="2026-03-27T00:00:00Z",
            dimensions=[
                UsageDimension(name="api_calls", value=100, unit="requests"),
            ],
        )

    async def on_health_check(self) -> HealthStatus:
        return HealthStatus(
            status="healthy",
            version="1.0.0",
            checked_at="2026-03-27T12:00:00Z",
        )


@pytest.fixture()
def fake_provider(sample_manifest: ServiceManifest) -> FakeProvider:
    return FakeProvider(manifest=sample_manifest)


@pytest.fixture()
def test_client(fake_provider: FakeProvider) -> TestClient:
    return TestClient(fake_provider.app)


# ---------------------------------------------------------------------------
# Manifest endpoint
# ---------------------------------------------------------------------------

class TestManifestEndpoint:
    def test_well_known_returns_manifest(
        self,
        test_client: TestClient,
        sample_manifest: ServiceManifest,
    ) -> None:
        resp = test_client.get("/.well-known/osp.json")
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == sample_manifest.display_name
        assert len(data["offerings"]) == 1

    def test_manifest_has_v11_fields(self, test_client: TestClient) -> None:
        resp = test_client.get("/.well-known/osp.json")
        data = resp.json()
        assert data.get("osp_spec_version") == "1.1"
        assert "a2a" in data
        assert "nhi" in data
        assert "finops" in data
        assert "mcp" in data


# ---------------------------------------------------------------------------
# Provisioning
# ---------------------------------------------------------------------------

class TestProvisionEndpoint:
    def test_provision_creates_resource(self, test_client: TestClient) -> None:
        resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "project_name": "my-db",
                "nonce": "abc123",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["resource_id"] == "res_0001"
        assert data["status"] == "active"
        assert "API_KEY" in data["credentials"]["credentials"]

    def test_provision_with_v11_fields(self, test_client: TestClient) -> None:
        resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "pro",
                "project_name": "v11-db",
                "nonce": "nonce-v11",
                "nhi_token_mode": "short_lived",
                "budget": {"max_monthly_cost": "50.00", "currency": "USD"},
                "trace_context": "trace-ctx",
            },
        )
        assert resp.status_code == 201

    def test_provision_validation_error(self, test_client: TestClient) -> None:
        resp = test_client.post(
            "/osp/v1/provision",
            json={"offering_id": "", "tier_id": "free", "project_name": "db", "nonce": "x"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Deprovision
# ---------------------------------------------------------------------------

class TestDeprovisionEndpoint:
    def test_deprovision_success(self, test_client: TestClient) -> None:
        create_resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "project_name": "db",
                "nonce": "x",
            },
        )
        resource_id = create_resp.json()["resource_id"]

        resp = test_client.delete(f"/osp/v1/resources/{resource_id}")
        assert resp.status_code == 204

    def test_deprovision_not_found(self, test_client: TestClient) -> None:
        resp = test_client.delete("/osp/v1/resources/nonexistent")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

class TestCredentialsEndpoint:
    def test_get_credentials(self, test_client: TestClient) -> None:
        create_resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "project_name": "db",
                "nonce": "x",
            },
        )
        resource_id = create_resp.json()["resource_id"]

        resp = test_client.get(f"/osp/v1/resources/{resource_id}/credentials")
        assert resp.status_code == 200
        assert "API_KEY" in resp.json()["credentials"]

    def test_rotate_credentials(self, test_client: TestClient) -> None:
        create_resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "project_name": "db",
                "nonce": "x",
            },
        )
        resource_id = create_resp.json()["resource_id"]

        resp = test_client.post(f"/osp/v1/resources/{resource_id}/credentials/rotate")
        assert resp.status_code == 200
        creds = resp.json()["credentials"]
        assert creds["API_KEY"].startswith("rotated_key_")

    def test_credentials_not_found(self, test_client: TestClient) -> None:
        resp = test_client.get("/osp/v1/resources/nonexistent/credentials")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

class TestStatusEndpoint:
    def test_get_status(self, test_client: TestClient) -> None:
        create_resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "project_name": "db",
                "nonce": "x",
            },
        )
        resource_id = create_resp.json()["resource_id"]

        resp = test_client.get(f"/osp/v1/resources/{resource_id}/status")
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"


# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

class TestUsageEndpoint:
    def test_get_usage(self, test_client: TestClient) -> None:
        create_resp = test_client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "project_name": "db",
                "nonce": "x",
            },
        )
        resource_id = create_resp.json()["resource_id"]

        resp = test_client.get(f"/osp/v1/resources/{resource_id}/usage")
        assert resp.status_code == 200
        data = resp.json()
        assert data["resource_id"] == resource_id
        assert len(data["dimensions"]) == 1


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_check(self, test_client: TestClient) -> None:
        resp = test_client.get("/osp/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


# ---------------------------------------------------------------------------
# Not-implemented hooks
# ---------------------------------------------------------------------------

class TestNotImplementedHooks:
    def test_bare_provider_returns_501(self, sample_manifest: ServiceManifest) -> None:
        bare = OSPProvider(manifest=sample_manifest)
        client = TestClient(bare.app, raise_server_exceptions=False)

        resp = client.post(
            "/osp/v1/provision",
            json={
                "offering_id": "test/pg",
                "tier_id": "free",
                "project_name": "db",
                "nonce": "x",
            },
        )
        assert resp.status_code == 501
        assert resp.json()["error"] == "not_implemented"
