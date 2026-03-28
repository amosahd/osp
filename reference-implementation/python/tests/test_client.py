"""Tests for OSPClient using respx for HTTP mocking."""

from __future__ import annotations

import pytest
import respx
import httpx

from osp.client import OSPClient, OSPClientError
from osp.types import (
    CredentialBundle,
    ProvisionRequest,
    ProvisionResponse,
    ServiceManifest,
    UsageReport,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PROVIDER = "https://db.example.com"


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

class TestDiscover:
    @respx.mock
    async def test_discover_success(self, sample_manifest: ServiceManifest) -> None:
        route = respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            manifest = await client.discover(PROVIDER)

        assert route.called
        assert manifest.provider_name == sample_manifest.provider_name
        assert len(manifest.services) == 1

    @respx.mock
    async def test_discover_trailing_slash(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            manifest = await client.discover(PROVIDER + "/")

        assert manifest.provider_name == sample_manifest.provider_name

    @respx.mock
    async def test_discover_not_found(self) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(404),
        )

        async with OSPClient() as client:
            with pytest.raises(httpx.HTTPStatusError):
                await client.discover(PROVIDER)


class TestDiscoverFromRegistry:
    @respx.mock
    async def test_discover_from_registry(self, sample_manifest: ServiceManifest) -> None:
        registry = "https://registry.example.com"
        respx.get(f"{registry}/v1/services", params={"category": "database"}).mock(
            return_value=httpx.Response(
                200,
                json=[sample_manifest.model_dump(mode="json")],
            ),
        )

        async with OSPClient(registry_url=registry) as client:
            manifests = await client.discover_from_registry(category="database")

        assert len(manifests) == 1
        assert manifests[0].provider_name == sample_manifest.provider_name

    @respx.mock
    async def test_discover_from_registry_no_filter(self, sample_manifest: ServiceManifest) -> None:
        registry = "https://registry.example.com"
        respx.get(f"{registry}/v1/services").mock(
            return_value=httpx.Response(
                200,
                json=[sample_manifest.model_dump(mode="json")],
            ),
        )

        async with OSPClient(registry_url=registry) as client:
            manifests = await client.discover_from_registry()

        assert len(manifests) == 1


# ---------------------------------------------------------------------------
# Provisioning
# ---------------------------------------------------------------------------

class TestProvision:
    @respx.mock
    async def test_provision_success(
        self,
        sample_provision_response: ProvisionResponse,
    ) -> None:
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(
                201,
                json=sample_provision_response.model_dump(mode="json"),
            ),
        )

        async with OSPClient() as client:
            resp = await client.provision(
                PROVIDER,
                ProvisionRequest(service_id="postgres", tier_id="free"),
            )

        assert resp.resource_id == "res_abc123"
        assert resp.credentials_bundle is not None

    @respx.mock
    async def test_provision_error(self) -> None:
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(
                400,
                json={"error": "invalid_request", "message": "Unknown tier"},
            ),
        )

        async with OSPClient() as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.provision(
                    PROVIDER,
                    ProvisionRequest(service_id="postgres", tier_id="nonexistent"),
                )

        assert exc_info.value.status_code == 400
        assert exc_info.value.error == "invalid_request"


class TestDeprovision:
    @respx.mock
    async def test_deprovision_success(self) -> None:
        respx.delete(f"{PROVIDER}/osp/v1/resources/res_abc123").mock(
            return_value=httpx.Response(204),
        )

        async with OSPClient() as client:
            await client.deprovision(PROVIDER, "res_abc123")
        # No exception means success

    @respx.mock
    async def test_deprovision_not_found(self) -> None:
        respx.delete(f"{PROVIDER}/osp/v1/resources/res_missing").mock(
            return_value=httpx.Response(
                404,
                json={"error": "not_found", "message": "Resource not found"},
            ),
        )

        async with OSPClient() as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.deprovision(PROVIDER, "res_missing")

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

class TestCredentials:
    @respx.mock
    async def test_get_credentials(self, sample_credentials: CredentialBundle) -> None:
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/credentials").mock(
            return_value=httpx.Response(
                200,
                json=sample_credentials.model_dump(mode="json"),
            ),
        )

        async with OSPClient() as client:
            creds = await client.get_credentials(PROVIDER, "res_abc123")

        assert "DATABASE_URL" in creds.credentials

    @respx.mock
    async def test_rotate_credentials(self, sample_credentials: CredentialBundle) -> None:
        respx.post(f"{PROVIDER}/osp/v1/resources/res_abc123/credentials/rotate").mock(
            return_value=httpx.Response(
                200,
                json=sample_credentials.model_dump(mode="json"),
            ),
        )

        async with OSPClient() as client:
            creds = await client.rotate_credentials(PROVIDER, "res_abc123")

        assert "API_KEY" in creds.credentials


# ---------------------------------------------------------------------------
# Status & Usage
# ---------------------------------------------------------------------------

class TestStatus:
    @respx.mock
    async def test_get_status(self) -> None:
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/status").mock(
            return_value=httpx.Response(
                200,
                json={"resource_id": "res_abc123", "status": "provisioned", "uptime_seconds": 3600},
            ),
        )

        async with OSPClient() as client:
            status = await client.get_status(PROVIDER, "res_abc123")

        assert status["status"] == "provisioned"


class TestUsage:
    @respx.mock
    async def test_get_usage(self, sample_usage_report: UsageReport) -> None:
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/usage").mock(
            return_value=httpx.Response(
                200,
                json=sample_usage_report.model_dump(mode="json"),
            ),
        )

        async with OSPClient() as client:
            usage = await client.get_usage(PROVIDER, "res_abc123")

        assert usage.resource_id == "res_abc123"
        assert len(usage.metrics) == 2


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    @respx.mock
    async def test_check_health(self) -> None:
        respx.get(f"{PROVIDER}/osp/v1/health").mock(
            return_value=httpx.Response(200, json={"healthy": True}),
        )

        async with OSPClient() as client:
            health = await client.check_health(PROVIDER)

        assert health["healthy"] is True


# ---------------------------------------------------------------------------
# Context manager
# ---------------------------------------------------------------------------

class TestContextManager:
    @respx.mock
    async def test_async_context_manager_closes(self) -> None:
        async with OSPClient() as client:
            assert not client._http.is_closed

        assert client._http.is_closed
