"""Shared fixtures for OSP tests."""

from __future__ import annotations

import pytest

from osp.types import (
    A2AAgentCard,
    CredentialBundle,
    FinOpsConfig,
    HealthStatus,
    MCPConfig,
    NHIConfig,
    Price,
    ProviderEndpoints,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    UsageDimension,
    UsageReport,
)


@pytest.fixture()
def sample_tier() -> ServiceTier:
    return ServiceTier(
        tier_id="free",
        name="Free Tier",
        price=Price(amount="0.00", currency="USD"),
        limits={"max_rows": 10_000, "max_connections": 5},
        features=["auto-backup", "shared-cpu"],
    )


@pytest.fixture()
def sample_pro_tier() -> ServiceTier:
    return ServiceTier(
        tier_id="pro",
        name="Pro Tier",
        price=Price(amount="29.99", currency="USD", interval="P1M"),
        limits={"max_rows": 1_000_000, "max_connections": 100},
        features=["auto-backup", "dedicated-cpu", "point-in-time-recovery"],
        sla="99.9%",
    )


@pytest.fixture()
def sample_offering(sample_tier: ServiceTier, sample_pro_tier: ServiceTier) -> ServiceOffering:
    return ServiceOffering(
        offering_id="test-provider/postgres",
        name="Managed PostgreSQL",
        description="Fully managed PostgreSQL databases.",
        category="database",
        tiers=[sample_tier, sample_pro_tier],
        credentials_schema={
            "type": "object",
            "properties": {
                "connection_string": {"type": "string"},
                "api_key": {"type": "string"},
            },
        },
        estimated_provision_seconds=30,
        fulfillment_proof_type="api_key_delivery",
        regions=["us-east-1", "eu-west-1"],
        dependencies=[],
    )


@pytest.fixture()
def sample_endpoints() -> ProviderEndpoints:
    return ProviderEndpoints(
        provision="/osp/v1/provision",
        deprovision="/osp/v1/resources/:resource_id",
        credentials="/osp/v1/resources/:resource_id/credentials",
        rotate="/osp/v1/resources/:resource_id/credentials/rotate",
        status="/osp/v1/resources/:resource_id/status",
        usage="/osp/v1/resources/:resource_id/usage",
        health="/osp/v1/health",
    )


@pytest.fixture()
def sample_manifest(sample_offering: ServiceOffering, sample_endpoints: ProviderEndpoints) -> ServiceManifest:
    return ServiceManifest(
        manifest_id="mf_test_provider",
        manifest_version=1,
        previous_version=None,
        osp_spec_version="1.1",
        provider_id="test-provider.com",
        display_name="Test Provider",
        provider_url="https://test-provider.com",
        provider_public_key="dGVzdC1rZXk",
        offerings=[sample_offering],
        accepted_payment_methods=["free", "stripe_spt"],
        trust_tier_required=0,
        endpoints=sample_endpoints,
        a2a=A2AAgentCard(
            agent_id="test-agent",
            capabilities=["provision", "deprovision"],
            task_lifecycle=True,
        ),
        nhi=NHIConfig(
            short_lived_tokens=True,
            token_ttl_seconds=3600,
            federation=["oidc"],
        ),
        finops=FinOpsConfig(
            budget_enforcement=True,
            cost_in_pr=True,
        ),
        mcp=MCPConfig(
            tools=["test_query"],
            streamable_http=False,
        ),
        effective_at="2026-01-01T00:00:00Z",
        provider_signature="dGVzdC1zaWc",
    )


@pytest.fixture()
def sample_credentials() -> CredentialBundle:
    return CredentialBundle(
        resource_id="res_abc123",
        credentials={
            "connection_string": "postgres://user:pass@host:5432/db",
            "api_key": "sk_test_123",
        },
        issued_at="2026-01-15T10:30:00Z",
    )


@pytest.fixture()
def sample_provision_response(sample_credentials: CredentialBundle) -> ProvisionResponse:
    return ProvisionResponse(
        resource_id="res_abc123",
        status="active",
        message="Database ready.",
        credentials=sample_credentials,
        dashboard_url="https://test-provider.com/dashboard/res_abc123",
    )


@pytest.fixture()
def sample_resource_status() -> ResourceStatus:
    return ResourceStatus(
        resource_id="res_abc123",
        status="active",
        offering_id="test-provider/postgres",
        tier_id="free",
        region="us-east-1",
        created_at="2026-01-15T10:30:00Z",
        updated_at="2026-01-15T10:31:00Z",
    )


@pytest.fixture()
def sample_usage_report() -> UsageReport:
    return UsageReport(
        resource_id="res_abc123",
        period_start="2026-03-01T00:00:00Z",
        period_end="2026-03-27T00:00:00Z",
        dimensions=[
            UsageDimension(name="storage_bytes", value=1_048_576, unit="bytes"),
            UsageDimension(name="api_calls", value=15420, unit="calls"),
        ],
        total_cost=Price(amount="0.00", currency="USD"),
    )


@pytest.fixture()
def sample_health_status() -> HealthStatus:
    return HealthStatus(
        status="healthy",
        version="1.2.3",
        checked_at="2026-03-27T12:00:00Z",
    )
