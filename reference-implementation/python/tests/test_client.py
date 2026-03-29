"""Tests for OSPClient with retries, backoff, caching, and v1.1 features."""

from __future__ import annotations

import pytest
import respx
import httpx

from osp.client import OSPClient, OSPClientError, RetryConfig
from osp.types import (
    AgentIdentity,
    BudgetConstraint,
    CredentialBundle,
    DisputeRequest,
    EstimateRequest,
    ExportRequest,
    HealthStatus,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    UsageReport,
    WebhookRegistrationRequest,
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


# ---------------------------------------------------------------------------
# Estimate
# ---------------------------------------------------------------------------

class TestEstimate:
    @respx.mock
    async def test_estimate_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/estimate").mock(
            return_value=httpx.Response(200, json={
                "offering_id": "test-provider/postgres",
                "tier_id": "pro",
                "estimate": {
                    "base_cost": {"amount": "25.00", "currency": "USD", "interval": "monthly"},
                    "total_monthly": "31.63",
                    "total_for_period": "94.89",
                    "currency": "USD",
                    "billing_periods": 3,
                },
                "comparison_hint": "26% more expensive than neon",
                "valid_until": "2026-03-27T13:00:00Z",
            }),
        )

        async with OSPClient() as client:
            resp = await client.estimate(
                PROVIDER,
                EstimateRequest(
                    offering_id="test-provider/postgres",
                    tier_id="pro",
                    region="us-east-1",
                    estimated_usage={"storage_gb": 25},
                    billing_periods=3,
                ),
            )

        assert resp.offering_id == "test-provider/postgres"
        assert resp.estimate["total_monthly"] == "31.63"
        assert resp.comparison_hint is not None
        assert resp.valid_until == "2026-03-27T13:00:00Z"

    @respx.mock
    async def test_estimate_bad_request(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/estimate").mock(
            return_value=httpx.Response(
                400, json={"error": "Invalid offering_id", "code": "BAD_REQUEST"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.estimate(
                    PROVIDER,
                    EstimateRequest(offering_id="bad/id", tier_id="free"),
                )

        assert exc_info.value.status_code == 400

    @respx.mock
    async def test_estimate_not_found(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/estimate").mock(
            return_value=httpx.Response(
                404, json={"error": "Offering not found", "code": "NOT_FOUND"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.estimate(
                    PROVIDER,
                    EstimateRequest(offering_id="missing/offer", tier_id="pro"),
                )

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Dispute
# ---------------------------------------------------------------------------

class TestDispute:
    @respx.mock
    async def test_dispute_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/dispute/res_abc123").mock(
            return_value=httpx.Response(201, json={
                "dispute_id": "disp_001",
                "resource_id": "res_abc123",
                "reason_code": "service_not_delivered",
                "status": "filed",
                "filed_at": "2026-03-27T14:30:00Z",
                "osp_dispute_receipt": "eyJhbGciOiJFZERTQSJ9...",
                "settlement_rails": ["sardis_escrow", "stripe_chargeback"],
                "provider_response_deadline": "2026-03-30T14:30:00Z",
            }),
        )

        async with OSPClient() as client:
            resp = await client.dispute(
                PROVIDER,
                "res_abc123",
                DisputeRequest(
                    reason_code="service_not_delivered",
                    description="DB connection refused for 6 hours",
                    evidence_hash="sha256:a1b2c3d4",
                ),
            )

        assert resp.dispute_id == "disp_001"
        assert resp.status == "filed"
        assert resp.osp_dispute_receipt is not None
        assert "sardis_escrow" in resp.settlement_rails

    @respx.mock
    async def test_dispute_conflict(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/dispute/res_abc123").mock(
            return_value=httpx.Response(
                409, json={"error": "Active dispute exists", "code": "CONFLICT"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.dispute(
                    PROVIDER,
                    "res_abc123",
                    DisputeRequest(reason_code="billing_mismatch"),
                )

        assert exc_info.value.status_code == 409

    @respx.mock
    async def test_dispute_not_found(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/dispute/res_missing").mock(
            return_value=httpx.Response(
                404, json={"error": "Resource not found", "code": "NOT_FOUND"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.dispute(
                    PROVIDER,
                    "res_missing",
                    DisputeRequest(reason_code="credentials_invalid"),
                )

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class TestEvents:
    @respx.mock
    async def test_get_events_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/events/res_abc123").mock(
            return_value=httpx.Response(200, json={
                "resource_id": "res_abc123",
                "events": [
                    {
                        "event_id": "evt_001",
                        "event_type": "resource.provisioned",
                        "timestamp": "2026-03-27T12:00:00Z",
                        "details": {"tier_id": "pro", "region": "us-east-1"},
                    },
                    {
                        "event_id": "evt_002",
                        "event_type": "credentials.issued",
                        "timestamp": "2026-03-27T12:00:01Z",
                        "details": {"scope": "admin"},
                    },
                ],
                "has_more": False,
                "cursor": "evt_002",
            }),
        )

        async with OSPClient() as client:
            resp = await client.get_events(PROVIDER, "res_abc123")

        assert resp.resource_id == "res_abc123"
        assert len(resp.events) == 2
        assert resp.events[0].event_type == "resource.provisioned"
        assert resp.has_more is False
        assert resp.cursor == "evt_002"

    @respx.mock
    async def test_get_events_with_filters(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        route = respx.get(f"{PROVIDER}/osp/v1/events/res_abc123").mock(
            return_value=httpx.Response(200, json={
                "resource_id": "res_abc123",
                "events": [],
                "has_more": False,
            }),
        )

        async with OSPClient() as client:
            resp = await client.get_events(
                PROVIDER,
                "res_abc123",
                since="2026-03-27T00:00:00Z",
                limit=10,
                event_type="resource.provisioned",
            )

        assert route.called
        request = route.calls[0].request
        assert "since=2026-03-27" in str(request.url)
        assert "limit=10" in str(request.url)
        assert "event_type=resource.provisioned" in str(request.url)

    @respx.mock
    async def test_get_events_not_found(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/events/res_missing").mock(
            return_value=httpx.Response(
                404, json={"error": "Resource not found", "code": "NOT_FOUND"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.get_events(PROVIDER, "res_missing")

        assert exc_info.value.status_code == 404

    @respx.mock
    async def test_get_events_not_implemented(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/events/res_abc123").mock(
            return_value=httpx.Response(
                501, json={"error": "Not implemented", "code": "NOT_IMPLEMENTED"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.get_events(PROVIDER, "res_abc123")

        assert exc_info.value.status_code == 501


# ---------------------------------------------------------------------------
# Webhook Management
# ---------------------------------------------------------------------------

class TestWebhooks:
    @respx.mock
    async def test_register_webhook_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/webhooks/res_abc123").mock(
            return_value=httpx.Response(200, json={
                "webhook_id": "wh_abc123",
                "resource_id": "res_abc123",
                "webhook_url": "https://agent.example.com/hooks/osp",
                "events": ["resource.status_changed", "credentials.rotated"],
                "secret": "whsec_new_secret",
                "created_at": "2026-03-27T14:00:00Z",
            }),
        )

        async with OSPClient() as client:
            resp = await client.register_webhook(
                PROVIDER,
                "res_abc123",
                WebhookRegistrationRequest(
                    webhook_url="https://agent.example.com/hooks/osp",
                    events=["resource.status_changed", "credentials.rotated"],
                    secret_rotation=True,
                ),
            )

        assert resp.webhook_id == "wh_abc123"
        assert resp.webhook_url == "https://agent.example.com/hooks/osp"
        assert resp.secret == "whsec_new_secret"
        assert len(resp.events) == 2

    @respx.mock
    async def test_register_webhook_without_secret_rotation(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/webhooks/res_abc123").mock(
            return_value=httpx.Response(200, json={
                "webhook_id": "wh_abc123",
                "resource_id": "res_abc123",
                "webhook_url": "https://agent.example.com/hooks/osp",
                "events": ["resource.status_changed"],
            }),
        )

        async with OSPClient() as client:
            resp = await client.register_webhook(
                PROVIDER,
                "res_abc123",
                WebhookRegistrationRequest(
                    webhook_url="https://agent.example.com/hooks/osp",
                    events=["resource.status_changed"],
                ),
            )

        assert resp.webhook_id == "wh_abc123"
        assert resp.secret is None

    @respx.mock
    async def test_register_webhook_error(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/webhooks/res_abc123").mock(
            return_value=httpx.Response(
                400, json={"error": "Invalid webhook URL", "code": "BAD_REQUEST"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.register_webhook(
                    PROVIDER,
                    "res_abc123",
                    WebhookRegistrationRequest(webhook_url="not-https"),
                )

        assert exc_info.value.status_code == 400

    @respx.mock
    async def test_delete_webhook_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.delete(f"{PROVIDER}/osp/v1/webhooks/res_abc123").mock(
            return_value=httpx.Response(204),
        )

        async with OSPClient() as client:
            await client.delete_webhook(PROVIDER, "res_abc123")

    @respx.mock
    async def test_delete_webhook_not_found(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.delete(f"{PROVIDER}/osp/v1/webhooks/res_missing").mock(
            return_value=httpx.Response(
                404, json={"error": "Resource not found", "code": "NOT_FOUND"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.delete_webhook(PROVIDER, "res_missing")

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

class TestExport:
    @respx.mock
    async def test_export_resource_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/export/res_abc123").mock(
            return_value=httpx.Response(200, json={
                "export_id": "exp_xyz789",
                "resource_id": "res_abc123",
                "status": "exporting",
                "format": "pg_dump",
                "estimated_ready_seconds": 60,
                "poll_url": "/osp/v1/export/exp_xyz789/status",
            }),
        )

        async with OSPClient() as client:
            resp = await client.export_resource(
                PROVIDER,
                "res_abc123",
                ExportRequest(
                    format="pg_dump",
                    include_data=True,
                    include_schema=True,
                    encryption_key="base64url_agent_public_key",
                ),
            )

        assert resp.export_id == "exp_xyz789"
        assert resp.status == "exporting"
        assert resp.format == "pg_dump"
        assert resp.estimated_ready_seconds == 60
        assert resp.poll_url == "/osp/v1/export/exp_xyz789/status"

    @respx.mock
    async def test_export_resource_ready(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/export/res_abc123").mock(
            return_value=httpx.Response(200, json={
                "export_id": "exp_xyz789",
                "resource_id": "res_abc123",
                "status": "ready",
                "format": "pg_dump",
                "download_url": "https://exports.provider.com/exp_xyz789.enc",
                "download_expires_at": "2026-03-27T16:00:00Z",
                "size_bytes": 104857600,
                "checksum": "sha256:a1b2c3",
                "metadata": {"postgres_version": "17", "tables": 24},
            }),
        )

        async with OSPClient() as client:
            resp = await client.export_resource(
                PROVIDER,
                "res_abc123",
                ExportRequest(format="pg_dump", include_data=True),
            )

        assert resp.status == "ready"
        assert resp.download_url is not None
        assert resp.size_bytes == 104857600
        assert resp.checksum == "sha256:a1b2c3"

    @respx.mock
    async def test_export_resource_not_found(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/export/res_missing").mock(
            return_value=httpx.Response(
                404, json={"error": "Resource not found", "code": "NOT_FOUND"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.export_resource(
                    PROVIDER,
                    "res_missing",
                    ExportRequest(format="pg_dump"),
                )

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Cost Summary
# ---------------------------------------------------------------------------

class TestCostSummary:
    @respx.mock
    async def test_get_cost_summary_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/resources/cost-summary").mock(
            return_value=httpx.Response(200, json={
                "total_cost": 42.50,
                "currency": "USD",
                "period": {"start": "2026-03-01", "end": "2026-03-31"},
                "resources": [
                    {
                        "resource_id": "res_abc123",
                        "offering_id": "test-provider/postgres",
                        "cost": 42.50,
                        "usage_summary": "25 GB storage, 1M API calls",
                    },
                ],
                "projected_monthly": 55.00,
            }),
        )

        async with OSPClient() as client:
            resp = await client.get_cost_summary(
                PROVIDER,
                period_start="2026-03-01",
                period_end="2026-03-31",
                currency="USD",
            )

        assert resp.total_cost == 42.50
        assert resp.currency == "USD"
        assert len(resp.resources) == 1
        assert resp.projected_monthly == 55.00

    @respx.mock
    async def test_get_cost_summary_with_pagination(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        route = respx.get(f"{PROVIDER}/osp/v1/resources/cost-summary").mock(
            return_value=httpx.Response(200, json={
                "total_cost": 100.00,
                "currency": "USD",
                "period": {"start": "2026-03-01", "end": "2026-03-31"},
                "resources": [],
                "projected_monthly": 130.00,
            }),
        )

        async with OSPClient() as client:
            await client.get_cost_summary(PROVIDER, limit=5, offset=10)

        request = route.calls[0].request
        assert "limit=5" in str(request.url)
        assert "offset=10" in str(request.url)

    @respx.mock
    async def test_get_cost_summary_no_usage_endpoint(self, sample_manifest: ServiceManifest) -> None:
        manifest_data = sample_manifest.model_dump(mode="json")
        manifest_data["endpoints"]["usage"] = None
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=manifest_data),
        )

        async with OSPClient() as client:
            with pytest.raises(OSPClientError, match="usage endpoint"):
                await client.get_cost_summary(PROVIDER)


# ---------------------------------------------------------------------------
# Sandbox Mode
# ---------------------------------------------------------------------------

class TestSandboxMode:
    @respx.mock
    async def test_provision_sandbox(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(201, json={
                "resource_id": "res_sandbox_7f3b",
                "status": "active",
                "sandbox": True,
                "credentials": {
                    "resource_id": "res_sandbox_7f3b",
                    "credentials": {
                        "connection_uri": "postgresql://sandbox_user:pass@sandbox-db:5432/db",
                    },
                    "issued_at": "2026-03-27T12:00:00Z",
                    "sandbox": True,
                },
                "expires_at": "2026-03-28T12:00:00Z",
            }),
        )

        async with OSPClient() as client:
            resp = await client.provision(
                PROVIDER,
                ProvisionRequest(
                    offering_id="test-provider/postgres",
                    tier_id="free",
                    project_name="sandbox-test",
                    nonce="nonce-sandbox",
                    mode="sandbox",
                ),
            )

        assert resp.resource_id == "res_sandbox_7f3b"
        assert resp.sandbox is True
        assert resp.credentials is not None
        assert resp.credentials.sandbox is True
        assert resp.expires_at is not None

    @respx.mock
    async def test_sandbox_rate_limited(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(
                429,
                json={"error": "Sandbox limit exceeded", "code": "RATE_LIMITED"},
                headers={"Retry-After": "60"},
            ),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.provision(
                    PROVIDER,
                    ProvisionRequest(
                        offering_id="test-provider/postgres",
                        tier_id="free",
                        project_name="sandbox-spam",
                        nonce="nonce-spam",
                        mode="sandbox",
                    ),
                )

        assert exc_info.value.status_code == 429


# ---------------------------------------------------------------------------
# Agent Attestation (identity in provision request)
# ---------------------------------------------------------------------------

class TestAgentAttestation:
    @respx.mock
    async def test_provision_with_agent_identity(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        route = respx.post(f"{PROVIDER}/osp/v1/provision").mock(
            return_value=httpx.Response(201, json={
                "resource_id": "res_identity_001",
                "status": "active",
            }),
        )

        async with OSPClient(auth_token="agent-attestation-token") as client:
            resp = await client.provision(
                PROVIDER,
                ProvisionRequest(
                    offering_id="test-provider/postgres",
                    tier_id="free",
                    project_name="id-test",
                    nonce="nonce-id",
                    agent_identity=AgentIdentity(
                        method="ed25519_did",
                        credential="did:key:z6Mk...",
                        nonce_signature="sig_abc123",
                    ),
                ),
            )

        assert resp.resource_id == "res_identity_001"
        # Verify the request body contained agent_identity
        request = route.calls[0].request
        import json
        body = json.loads(request.content)
        assert body["agent_identity"]["method"] == "ed25519_did"
        assert body["agent_identity"]["credential"] == "did:key:z6Mk..."

    @respx.mock
    async def test_auth_token_sent_as_bearer(self, sample_manifest: ServiceManifest) -> None:
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        route = respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/status").mock(
            return_value=httpx.Response(200, json={
                "resource_id": "res_abc123",
                "status": "active",
                "offering_id": "test-provider/postgres",
                "tier_id": "free",
                "created_at": "2026-03-27T12:00:00Z",
            }),
        )

        async with OSPClient(auth_token="my-attestation-token") as client:
            await client.get_status(PROVIDER, "res_abc123")

        request = route.calls[0].request
        assert request.headers["Authorization"] == "Bearer my-attestation-token"


# ---------------------------------------------------------------------------
# Version Negotiation
# ---------------------------------------------------------------------------

class TestVersionNegotiation:
    @respx.mock
    async def test_version_not_supported(self, sample_manifest: ServiceManifest) -> None:
        """Provider returns 406 when it doesn't support the requested version."""
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/resources/res_abc123/status").mock(
            return_value=httpx.Response(406, json={
                "error": "OSP version 1.0 is not supported",
                "code": "VERSION_NOT_SUPPORTED",
                "details": {
                    "supported_versions": ["1.1", "2.0"],
                    "recommended_version": "1.1",
                },
            }),
        )

        async with OSPClient(retry=RetryConfig(max_retries=0)) as client:
            with pytest.raises(OSPClientError) as exc_info:
                await client.get_status(PROVIDER, "res_abc123")

        assert exc_info.value.status_code == 406
        assert exc_info.value.code == "VERSION_NOT_SUPPORTED"
        assert "supported_versions" in exc_info.value.details

    @respx.mock
    async def test_health_returns_supported_versions(self, sample_manifest: ServiceManifest) -> None:
        """Health endpoint returns supported protocol versions."""
        respx.get(f"{PROVIDER}/.well-known/osp.json").mock(
            return_value=httpx.Response(200, json=sample_manifest.model_dump(mode="json")),
        )
        respx.get(f"{PROVIDER}/osp/v1/health").mock(
            return_value=httpx.Response(200, json={
                "status": "healthy",
                "version": "1.2.3",
                "supported_versions": ["1.0", "1.1"],
                "uptime_seconds": 86400,
                "checks": [
                    {"name": "database", "status": "healthy", "latency_ms": 5},
                ],
            }),
        )

        async with OSPClient() as client:
            resp = await client.get_health(PROVIDER)

        assert resp.status == "healthy"
        assert "1.0" in resp.supported_versions
        assert "1.1" in resp.supported_versions
        assert resp.uptime_seconds == 86400
