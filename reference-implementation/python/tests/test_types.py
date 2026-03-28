"""Tests for OSP Pydantic model validation — v1.1."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from osp.types import (
    A2AAgentCard,
    A2ACapability,
    BudgetAlert,
    BudgetConstraint,
    BudgetStatus,
    BurnRate,
    CanaryConfig,
    ComplianceFramework,
    CostBreakdownItem,
    CostEstimate,
    CredentialBundle,
    CredentialBundleRef,
    CredentialType,
    Currency,
    DependencyEvent,
    DependencyGraph,
    EncryptionMethod,
    EscrowProfile,
    FinOpsConfig,
    FulfillmentProof,
    HealthStatus,
    MCPConfig,
    NHIConfig,
    NHIEvent,
    NHIToken,
    NHITokenMode,
    NHITokenType,
    ObservabilityConfig,
    OSPErrorBody,
    PaymentDetails,
    PaymentMethod,
    Price,
    ProviderEndpoints,
    ProvisionError,
    ProvisionErrorCode,
    ProvisionRequest,
    ProvisionResponse,
    ProvisionStatus,
    ResourceStatus,
    ResourceWarning,
    Scorecards,
    ServiceCategory,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    TTLEvent,
    UsageDimension,
    UsageMetering,
    UsageReport,
    UsageThresholdData,
    WarningType,
    WebhookEvent,
    WebhookEventData,
    WebhookEventError,
    WebhookEventType,
)


# ---------------------------------------------------------------------------
# Price
# ---------------------------------------------------------------------------

class TestPrice:
    def test_valid_price(self) -> None:
        p = Price(amount="9.99", currency="USD", interval="P1M")
        assert p.amount == "9.99"
        assert p.currency == Currency.USD
        assert p.interval == "P1M"

    def test_free_price(self) -> None:
        p = Price(amount="0.00")
        assert p.amount == "0.00"
        assert p.currency == Currency.USD
        assert p.interval is None

    def test_one_time_price(self) -> None:
        p = Price(amount="100.00", currency="EUR")
        assert p.interval is None


# ---------------------------------------------------------------------------
# ServiceTier
# ---------------------------------------------------------------------------

class TestServiceTier:
    def test_valid_tier(self, sample_tier: ServiceTier) -> None:
        assert sample_tier.tier_id == "free"
        assert sample_tier.name == "Free Tier"
        assert sample_tier.price.amount == "0.00"
        assert "auto-backup" in sample_tier.features

    def test_empty_id_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceTier(tier_id="", name="Bad", price=Price(amount="0"))

    def test_empty_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceTier(tier_id="ok", name="", price=Price(amount="0"))

    def test_defaults(self) -> None:
        t = ServiceTier(tier_id="basic", name="Basic", price=Price(amount="5.00"))
        assert t.limits is None
        assert t.features is None
        assert t.sla is None
        assert t.ttl_seconds is None

    def test_sla_and_ttl(self) -> None:
        t = ServiceTier(
            tier_id="pro",
            name="Pro",
            price=Price(amount="25.00"),
            sla="99.9%",
            ttl_seconds=86400,
        )
        assert t.sla == "99.9%"
        assert t.ttl_seconds == 86400

    def test_escrow_profile(self) -> None:
        t = ServiceTier(
            tier_id="paid",
            name="Paid",
            price=Price(amount="10.00"),
            escrow_profile=EscrowProfile(
                timeout_seconds=3600,
                verification_window_seconds=900,
            ),
        )
        assert t.escrow_profile.timeout_seconds == 3600


# ---------------------------------------------------------------------------
# ServiceOffering
# ---------------------------------------------------------------------------

class TestServiceOffering:
    def test_valid_offering(self, sample_offering: ServiceOffering) -> None:
        assert sample_offering.offering_id == "test-provider/postgres"
        assert len(sample_offering.tiers) == 2

    def test_no_tiers_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceOffering(offering_id="bad", name="No Tiers", tiers=[])

    def test_category_enum(self) -> None:
        o = ServiceOffering(
            offering_id="svc",
            name="Service",
            category="database",
            tiers=[ServiceTier(tier_id="t", name="T", price=Price(amount="0"))],
        )
        assert o.category == ServiceCategory.database

    def test_dependencies(self) -> None:
        o = ServiceOffering(
            offering_id="svc",
            name="Service",
            tiers=[ServiceTier(tier_id="t", name="T", price=Price(amount="0"))],
            dependencies=["dep1", "dep2"],
        )
        assert o.dependencies == ["dep1", "dep2"]

    def test_canary_config(self) -> None:
        o = ServiceOffering(
            offering_id="svc",
            name="Service",
            tiers=[ServiceTier(tier_id="t", name="T", price=Price(amount="0"))],
            canary=CanaryConfig(enabled=True, strategies=["percentage"]),
        )
        assert o.canary.enabled is True


# ---------------------------------------------------------------------------
# ServiceManifest
# ---------------------------------------------------------------------------

class TestServiceManifest:
    def test_valid_manifest(self, sample_manifest: ServiceManifest) -> None:
        assert sample_manifest.display_name == "Test Provider"
        assert len(sample_manifest.offerings) == 1
        assert sample_manifest.osp_spec_version == "1.1"

    def test_no_offerings_rejected(self, sample_endpoints) -> None:
        with pytest.raises(ValidationError):
            ServiceManifest(
                manifest_id="mf_bad",
                provider_id="bad.com",
                display_name="Bad",
                offerings=[],
                endpoints=sample_endpoints,
            )

    def test_serialization_round_trip(self, sample_manifest: ServiceManifest) -> None:
        data = sample_manifest.model_dump(mode="json")
        rebuilt = ServiceManifest.model_validate(data)
        assert rebuilt == sample_manifest

    def test_a2a_field(self, sample_manifest: ServiceManifest) -> None:
        assert sample_manifest.a2a is not None
        assert sample_manifest.a2a.agent_id == "test-agent"
        assert A2ACapability.provision in sample_manifest.a2a.capabilities

    def test_nhi_field(self, sample_manifest: ServiceManifest) -> None:
        assert sample_manifest.nhi is not None
        assert sample_manifest.nhi.short_lived_tokens is True
        assert sample_manifest.nhi.token_ttl_seconds == 3600

    def test_finops_field(self, sample_manifest: ServiceManifest) -> None:
        assert sample_manifest.finops is not None
        assert sample_manifest.finops.budget_enforcement is True

    def test_mcp_field(self, sample_manifest: ServiceManifest) -> None:
        assert sample_manifest.mcp is not None
        assert "test_query" in sample_manifest.mcp.tools


# ---------------------------------------------------------------------------
# ProvisionRequest
# ---------------------------------------------------------------------------

class TestProvisionRequest:
    def test_minimal_request(self) -> None:
        r = ProvisionRequest(
            offering_id="test/postgres",
            tier_id="free",
            project_name="my-db",
            nonce="abc123",
        )
        assert r.region is None
        assert r.config is None

    def test_full_request(self) -> None:
        r = ProvisionRequest(
            offering_id="test/postgres",
            tier_id="pro",
            project_name="my-db",
            nonce="abc123",
            region="us-east-1",
            config={"extensions": ["pgvector"]},
            nhi_token_mode="short_lived",
            budget=BudgetConstraint(max_monthly_cost="50.00", currency="USD"),
            trace_context="trace-ctx-123",
            ttl_seconds=86400,
        )
        assert r.nhi_token_mode == NHITokenMode.short_lived
        assert r.budget.max_monthly_cost == "50.00"
        assert r.trace_context == "trace-ctx-123"

    def test_empty_offering_id_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ProvisionRequest(
                offering_id="", tier_id="free",
                project_name="db", nonce="x",
            )

    def test_delegation_fields(self) -> None:
        r = ProvisionRequest(
            offering_id="test/db",
            tier_id="free",
            project_name="db",
            nonce="x",
            delegating_agent_id="agent-007",
            delegation_proof="proof-xyz",
        )
        assert r.delegating_agent_id == "agent-007"


# ---------------------------------------------------------------------------
# ProvisionResponse
# ---------------------------------------------------------------------------

class TestProvisionResponse:
    def test_valid_response(self, sample_provision_response: ProvisionResponse) -> None:
        assert sample_provision_response.resource_id == "res_abc123"
        assert sample_provision_response.status == ProvisionStatus.active

    def test_without_credentials(self) -> None:
        r = ProvisionResponse(resource_id="res_1", status="provisioning")
        assert r.credentials is None

    def test_v11_fields(self) -> None:
        r = ProvisionResponse(
            resource_id="res_v11",
            status="active",
            cost_estimate=CostEstimate(monthly_estimate="25.00", currency="USD"),
            trace_id="trace_123",
            dependency_impact=["dep1"],
        )
        assert r.cost_estimate.monthly_estimate == "25.00"
        assert r.trace_id == "trace_123"
        assert r.dependency_impact == ["dep1"]

    def test_nhi_token(self) -> None:
        r = ProvisionResponse(
            resource_id="res_nhi",
            status="active",
            nhi_token=NHIToken(
                token="eyJ...",
                token_type="bearer",
                expires_at="2026-03-28T12:00:00Z",
            ),
        )
        assert r.nhi_token.token_type == NHITokenType.bearer


# ---------------------------------------------------------------------------
# CredentialBundle
# ---------------------------------------------------------------------------

class TestCredentialBundle:
    def test_valid_bundle(self, sample_credentials: CredentialBundle) -> None:
        assert "connection_string" in sample_credentials.credentials

    def test_v11_fields(self) -> None:
        c = CredentialBundle(
            resource_id="res_1",
            credentials={"KEY": "val"},
            issued_at="2026-01-01T00:00:00Z",
            nhi_identity_id="nhi-123",
            osp_uri="osp://provider.com/svc/KEY",
        )
        assert c.nhi_identity_id == "nhi-123"
        assert c.osp_uri == "osp://provider.com/svc/KEY"


# ---------------------------------------------------------------------------
# ResourceStatus
# ---------------------------------------------------------------------------

class TestResourceStatus:
    def test_valid_status(self, sample_resource_status: ResourceStatus) -> None:
        assert sample_resource_status.status == ProvisionStatus.active
        assert sample_resource_status.region == "us-east-1"


# ---------------------------------------------------------------------------
# UsageReport
# ---------------------------------------------------------------------------

class TestUsageReport:
    def test_valid_report(self, sample_usage_report: UsageReport) -> None:
        assert sample_usage_report.resource_id == "res_abc123"
        assert len(sample_usage_report.dimensions) == 2

    def test_v11_fields(self) -> None:
        report = UsageReport(
            resource_id="res_1",
            period_start="2026-03-01T00:00:00Z",
            period_end="2026-03-28T00:00:00Z",
            budget_status=BudgetStatus(
                budget_limit="100.00",
                consumed="25.00",
                percent_used=25.0,
            ),
            burn_rate=BurnRate(
                hourly_rate="0.10",
                daily_rate="2.40",
            ),
            trace_id="trace_456",
        )
        assert report.budget_status.percent_used == 25.0
        assert report.burn_rate.hourly_rate == "0.10"
        assert report.trace_id == "trace_456"


# ---------------------------------------------------------------------------
# HealthStatus
# ---------------------------------------------------------------------------

class TestHealthStatus:
    def test_valid_health(self, sample_health_status: HealthStatus) -> None:
        assert sample_health_status.status == "healthy"
        assert sample_health_status.version == "1.2.3"


# ---------------------------------------------------------------------------
# v1.1 Models
# ---------------------------------------------------------------------------

class TestA2AAgentCard:
    def test_valid_card(self) -> None:
        card = A2AAgentCard(
            agent_id="agent-1",
            capabilities=["provision", "rotate"],
            task_lifecycle=True,
        )
        assert card.agent_id == "agent-1"
        assert len(card.capabilities) == 2

    def test_empty_card(self) -> None:
        card = A2AAgentCard()
        assert card.agent_id is None


class TestNHIConfig:
    def test_valid_config(self) -> None:
        cfg = NHIConfig(
            short_lived_tokens=True,
            token_ttl_seconds=3600,
            federation=["oidc", "spiffe"],
        )
        assert cfg.token_ttl_seconds == 3600
        assert len(cfg.federation) == 2


class TestFinOpsConfig:
    def test_valid_config(self) -> None:
        cfg = FinOpsConfig(
            budget_enforcement=True,
            anomaly_detection=True,
            burn_rate_tracking=True,
        )
        assert cfg.budget_enforcement is True


class TestDependencyGraph:
    def test_valid_graph(self) -> None:
        g = DependencyGraph(auto_generate=True, impact_analysis=True)
        assert g.auto_generate is True


class TestScorecards:
    def test_valid_scorecards(self) -> None:
        s = Scorecards(
            maturity_scores={"security": 85, "reliability": 92},
            compliance=["soc2", "gdpr"],
            guided_remediation=True,
        )
        assert s.maturity_scores["security"] == 85
        assert ComplianceFramework.soc2 in s.compliance


class TestObservabilityConfig:
    def test_valid_config(self) -> None:
        cfg = ObservabilityConfig(
            otel_endpoint="https://otel.example.com",
            trace_propagation=["w3c"],
            audit_log=True,
        )
        assert cfg.otel_endpoint == "https://otel.example.com"


class TestMCPConfig:
    def test_valid_config(self) -> None:
        cfg = MCPConfig(
            tools=["query", "create"],
            streamable_http=True,
            skills_url="https://example.com/skills.md",
        )
        assert len(cfg.tools) == 2


class TestCostEstimate:
    def test_with_breakdown(self) -> None:
        est = CostEstimate(
            monthly_estimate="25.00",
            currency="USD",
            breakdown=[
                CostBreakdownItem(
                    dimension="compute",
                    estimated_usage="720 hours",
                    unit_price="0.035",
                    estimated_cost="25.20",
                ),
            ],
        )
        assert len(est.breakdown) == 1


class TestProvisionError:
    def test_valid_error(self) -> None:
        e = ProvisionError(
            code="budget_exceeded",
            message="Budget limit reached",
            retry_after_seconds=60,
        )
        assert e.code == ProvisionErrorCode.budget_exceeded


# ---------------------------------------------------------------------------
# Webhook Events
# ---------------------------------------------------------------------------

class TestWebhookEvent:
    def test_valid_event(self) -> None:
        evt = WebhookEvent(
            event_id="evt_123",
            event_type="provision.completed",
            resource_id="res_123",
            offering_id="test/postgres",
            timestamp="2026-03-27T12:00:00Z",
            provider_signature="sig",
            trace_id="trace_123",
        )
        assert evt.event_type == WebhookEventType.provision_completed
        assert evt.trace_id == "trace_123"

    def test_budget_alert_event(self) -> None:
        data = WebhookEventData(
            budget_alert=BudgetAlert(
                budget_limit="100.00",
                current_spend="80.00",
                percent_used=80.0,
                action="alert",
            ),
        )
        assert data.budget_alert.action == "alert"

    def test_nhi_event(self) -> None:
        data = WebhookEventData(
            nhi_event=NHIEvent(
                identity_id="nhi-1",
                token_type="bearer",
                expires_at="2026-03-28T12:00:00Z",
            ),
        )
        assert data.nhi_event.identity_id == "nhi-1"

    def test_dependency_event(self) -> None:
        data = WebhookEventData(
            dependency_event=DependencyEvent(
                dependency_resource_id="res_dep",
                health_status="degraded",
                affected_resources=["res_1", "res_2"],
            ),
        )
        assert data.dependency_event.health_status == "degraded"

    def test_ttl_event(self) -> None:
        data = WebhookEventData(
            ttl_event=TTLEvent(
                ttl_remaining_seconds=3600,
                action="warning",
                extension_available=True,
            ),
        )
        assert data.ttl_event.ttl_remaining_seconds == 3600


# ---------------------------------------------------------------------------
# OSPErrorBody
# ---------------------------------------------------------------------------

class TestOSPErrorBody:
    def test_valid_error(self) -> None:
        e = OSPErrorBody(error="not_found", code="NOT_FOUND")
        assert e.error == "not_found"

    def test_with_details(self) -> None:
        e = OSPErrorBody(
            error="validation_error",
            code="VALIDATION",
            details={"field": "tier_id"},
        )
        assert e.details["field"] == "tier_id"


# ---------------------------------------------------------------------------
# Enum coverage
# ---------------------------------------------------------------------------

class TestEnums:
    def test_currency_values(self) -> None:
        assert Currency.USDC.value == "USDC"

    def test_service_category_values(self) -> None:
        assert ServiceCategory.email.value == "email"

    def test_payment_method_values(self) -> None:
        assert PaymentMethod.sardis_wallet.value == "sardis_wallet"

    def test_provision_status_values(self) -> None:
        assert ProvisionStatus.active.value == "active"

    def test_encryption_method_values(self) -> None:
        assert EncryptionMethod.aes_256_gcm.value == "aes-256-gcm"

    def test_credential_type_values(self) -> None:
        assert CredentialType.short_lived_token.value == "short_lived_token"

    def test_webhook_event_type_values(self) -> None:
        assert WebhookEventType.budget_alert.value == "budget.alert"
        assert WebhookEventType.nhi_token_expiring.value == "nhi.token_expiring"
        assert WebhookEventType.environment_ttl_expired.value == "environment.ttl_expired"

    def test_warning_type_values(self) -> None:
        assert WarningType.budget_threshold.value == "budget_threshold"
        assert WarningType.ttl_expiring.value == "ttl_expiring"
