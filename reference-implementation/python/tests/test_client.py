"""Tests for OSPClient with retries, backoff, caching, and v1.1 features."""

from __future__ import annotations

import pytest
import respx
import httpx

from osp.client import OSPClient, OSPClientError, RetryConfig
from osp.types import (
    BudgetConstraint,
    CredentialBundle,
    HealthStatus,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    UsageReport,
)


PROVIDER = "https://test-provider.com"


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
        assert manifest.display_name == "Test Provider"
        assert len(manifest.offerings) == 1

    @respx.mock
    async def test_discover_caches(self, sample_manifest: ServiceManifest) -> None:
        route = respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            first = await client.discover(PROVIDER)
            second = await client.discover(PROVIDER)

        assert first == second
        assert route.call_count == 1

    @respx.mock
    async def test_clear_cache_forces_refetch(self, sample_manifest: ServiceManifest) -> None:
        route = respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            await client.discover(PROVIDER)
            client.clear_cache()
            await client.discover(PROVIDER)

        assert route.call_count == 2

    @respx.mock
    async def test_discover_trailing_slash(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            manifest = await client.discover(PROVIDER + "/")

        assert manifest.display_name == "Test Provider"

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
        registry = "https://registry.test.com"
        respx.get(f"{registry}/v1/manifests", params={"category": "database"}).mock(
            return_value=httpx.Response(
                200,
                json=[sample_manifest.model_dump(mode="json")],
            ),
        )

        async with OSPClient(registry_url=registry) as client:
            manifests = await client.discover_from_registry(category="database")

        assert len(manifests) == 1

    @respx.mock
    async def test_discover_from_registry_no_filter(self, sample_manifest: ServiceManifest) -> None:
        registry = "https://registry.test.com"
        respx.get(f"{registry}/v1/manifests").mock(
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
        sample_manifest: ServiceManifest,
        sample_provision_response: ProvisionResponse,
    ) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(
                201,
                json=sample_provision_response.model_dump(mode="json"),
            ),
        )

        async with OSPClient() as client:
            resp = await client.provision(
                PROVIDER,
                ProvisionRequest(
                    offering_id="test-provider/postgres",
                    tier_id="free",
                    project_name="my-db",
                    nonce="nonce-123",
                ),
            )

        assert resp.resource_id == "res_abc123"
        assert resp.credentials is not None

    @respx.mock
    async def test_provision_error(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(
                400,
                json={"error": "invalid_request", "code": "INVALID_REQUEST"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.provision(
                    PROVIDER,
                    ProvisionRequest(
                        offering_id="test/pg",
                        tier_id="bad",
                        project_name="db",
                        nonce="x",
                    ),
                )

        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "INVALID_REQUEST"

    @respx.mock
    async def test_provision_v11_fields(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(
                201,
                json={
                    "resource_id": "res_v11",
                    "status": "active",
                    "cost_estimate": {"monthly_estimate": "25.00", "currency": "USD"},
                    "trace_id": "trace_123",
                },
            ),
        )

        async with OSPClient() as client:
            resp = await client.provision(
                PROVIDER,
                ProvisionRequest(
                    offering_id="test-provider/postgres",
                    tier_id="pro",
                    project_name="v11-db",
                    nonce="nonce-v11",
                    nhi_token_mode="short_lived",
                    budget=BudgetConstraint(max_monthly_cost="50.00", currency="USD"),
                    trace_context="trace-ctx",
                ),
            )

        assert resp.cost_estimate.monthly_estimate == "25.00"
        assert resp.trace_id == "trace_123"


class TestDeprovision:
    @respx.mock
    async def test_deprovision_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.delete(f"{PROVIDER}/osp/v1/resources/res_abc123").mock(
            return_value=httpx.Response(204),
        )

        async with OSPClient() as client:
            await client.deprovision(PROVIDER, "res_abc123")

    @respx.mock
    async def test_deprovision_not_found(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.delete(f"{PROVIDER}/osp/v1/resources/res_missing").mock(
            return_value=httpx.Response(
                404,
                json={"error": "not_found", "code": "NOT_FOUND"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.deprovision(PROVIDER, "res_missing")

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

class TestCredentials:
    @respx.mock
    async def test_get_credentials(
        self,
        sample_manifest: ServiceManifest,
        sample_credentials: CredentialBundle,
    ) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/credentials").mock(
            return_value=httpx.Response(200, json=sample_credentials.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            creds = await client.get_credentials(PROVIDER, "res_abc123")

        assert "connection_string" in creds.credentials

    @respx.mock
    async def test_rotate_credentials(
        self,
        sample_manifest: ServiceManifest,
    ) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/resources/res_abc123/credentials/rotate").mock(
            return_value=httpx.Response(
                200,
                json={
                    "resource_id": "res_abc123",
                    "credentials": {"api_key": "sk_rotated_789"},
                    "issued_at": "2026-03-27T12:00:00Z",
                },
            ),
        )

        async with OSPClient() as client:
            creds = await client.rotate_credentials(PROVIDER, "res_abc123")

        assert creds.credentials["api_key"] == "sk_rotated_789"


# ---------------------------------------------------------------------------
# Status & Usage
# ---------------------------------------------------------------------------

class TestStatus:
    @respx.mock
    async def test_get_status(
        self,
        sample_manifest: ServiceManifest,
        sample_resource_status: ResourceStatus,
    ) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/status").mock(
            return_value=httpx.Response(200, json=sample_resource_status.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            status = await client.get_status(PROVIDER, "res_abc123")

        assert status.status.value == "active"
        assert status.region == "us-east-1"


class TestUsage:
    @respx.mock
    async def test_get_usage(
        self,
        sample_manifest: ServiceManifest,
        sample_usage_report: UsageReport,
    ) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/usage").mock(
            return_value=httpx.Response(200, json=sample_usage_report.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            usage = await client.get_usage(PROVIDER, "res_abc123")

        assert usage.resource_id == "res_abc123"
        assert len(usage.dimensions) == 2

    @respx.mock
    async def test_no_usage_endpoint(self, sample_manifest: ServiceManifest) -> None:
        # Override endpoints to remove usage
        manifest_data = sample_manifest.model_dump(mode="json")
        manifest_data["endpoints"]["usage"] = None
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=manifest_data),
        )

        async with OSPClient() as client:
            with pytest.raises(OSPClientError, match="usage endpoint"):
                await client.get_usage(PROVIDER, "res_abc123")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    @respx.mock
    async def test_check_health(
        self,
        sample_manifest: ServiceManifest,
        sample_health_status: HealthStatus,
    ) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/health").mock(
            return_value=httpx.Response(200, json=sample_health_status.model_dump(mode="json")),
        )

        async with OSPClient() as client:
            health = await client.check_health(PROVIDER)

        assert health.status == "healthy"
        assert health.latency_ms is not None
        assert health.latency_ms >= 0


# ---------------------------------------------------------------------------
# Retry behavior
# ---------------------------------------------------------------------------

class TestRetry:
    @respx.mock
    async def test_retries_on_500(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        attempt = {"count": 0}

        def handler(request):
            attempt["count"] += 1
            if attempt["count"] < 3:
                return httpx.Response(500, text="Server Error")
            return httpx.Response(
                200,
                json={"status": "healthy", "checked_at": "2026-03-27T12:00:00Z"},
            )

        respx.get(f"{PROVIDER}/osp/v1/health").mock(side_effect=handler)

        async with OSPClient(retry=RetryConfig(max_retries=3, base_delay=0.01, max_delay=0.05)) as client:
            health = await client.check_health(PROVIDER)

        assert health.status == "healthy"
        assert attempt["count"] == 3

    @respx.mock
    async def test_retries_on_429_with_retry_after(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        attempt = {"count": 0}

        def handler(request):
            attempt["count"] += 1
            if attempt["count"] == 1:
                return httpx.Response(
                    429,
                    json={"error": "rate_limited"},
                    headers={"Retry-After": "0.01"},
                )
            return httpx.Response(
                200,
                json={"status": "healthy", "checked_at": "2026-03-27T12:00:00Z"},
            )

        respx.get(f"{PROVIDER}/osp/v1/health").mock(side_effect=handler)

        async with OSPClient(retry=RetryConfig(max_retries=3, base_delay=0.01)) as client:
            health = await client.check_health(PROVIDER)

        assert health.status == "healthy"
        assert attempt["count"] == 2

    @respx.mock
    async def test_no_retry_on_400(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        attempt = {"count": 0}

        def handler(request):
            attempt["count"] += 1
            return httpx.Response(400, json={"error": "bad_request", "code": "BAD_REQUEST"})

        respx.get(f"{PROVIDER}/osp/v1/resources/res_1/status").mock(side_effect=handler)

        async with OSPClient(retry=RetryConfig(max_retries=3, base_delay=0.01)) as client:
            with pytest.raises(OSPClientError):
                await client.get_status(PROVIDER, "res_1")

        assert attempt["count"] == 1

    @respx.mock
    async def test_exhausted_retries(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        attempt = {"count": 0}

        def handler(request):
            attempt["count"] += 1
            return httpx.Response(503, text="Service Unavailable")

        respx.get(f"{PROVIDER}/osp/v1/health").mock(side_effect=handler)

        async with OSPClient(retry=RetryConfig(max_retries=2, base_delay=0.01)) as client:
            with pytest.raises(OSPClientError):
                await client.check_health(PROVIDER)

        assert attempt["count"] == 3  # 1 initial + 2 retries


# ---------------------------------------------------------------------------
# Context manager
# ---------------------------------------------------------------------------

class TestContextManager:
    @respx.mock
    async def test_async_context_manager_closes(self) -> None:
        async with OSPClient() as client:
            assert not client._http.is_closed

        assert client._http.is_closed


# ---------------------------------------------------------------------------
# Constructor options
# ---------------------------------------------------------------------------

class TestConstructor:
    def test_default_options(self) -> None:
        client = OSPClient()
        assert client.registry_url == "https://registry.osp.dev"

    def test_custom_options(self) -> None:
        client = OSPClient(
            registry_url="https://custom.com",
            auth_token="my-token",
            timeout=5.0,
            retry=RetryConfig(max_retries=5, base_delay=0.1),
        )
        assert client.registry_url == "https://custom.com"

    def test_custom_headers(self) -> None:
        client = OSPClient(headers={"X-Custom": "val"})
        assert client._http.headers.get("X-Custom") == "val"
        assert "osp-python" in client._http.headers.get("User-Agent", "")

    def test_auth_token_in_headers(self) -> None:
        client = OSPClient(auth_token="test-token")
        assert client._http.headers.get("Authorization") == "Bearer test-token"
