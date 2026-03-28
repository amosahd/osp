"""Tests for OSP Pydantic model validation."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from osp.types import (
    BillingCycle,
    CredentialBundle,
    Currency,
    OSPError,
    Price,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    UsageMetric,
    UsageReport,
)


# ---------------------------------------------------------------------------
# Price
# ---------------------------------------------------------------------------

class TestPrice:
    def test_valid_price(self) -> None:
        p = Price(amount=9.99, currency="USD", billing_cycle="monthly")
        assert p.amount == 9.99
        assert p.currency == Currency.USD
        assert p.billing_cycle == BillingCycle.monthly

    def test_free_price(self) -> None:
        p = Price(amount=0)
        assert p.amount == 0
        assert p.currency == Currency.USD  # default
        assert p.billing_cycle == BillingCycle.monthly  # default

    def test_negative_amount_rejected(self) -> None:
        with pytest.raises(ValidationError):
            Price(amount=-1)

    def test_invalid_currency_rejected(self) -> None:
        with pytest.raises(ValidationError):
            Price(amount=10, currency="INVALID")


# ---------------------------------------------------------------------------
# ServiceTier
# ---------------------------------------------------------------------------

class TestServiceTier:
    def test_valid_tier(self, sample_tier: ServiceTier) -> None:
        assert sample_tier.id == "free"
        assert sample_tier.name == "Free Tier"
        assert sample_tier.price.amount == 0
        assert "auto-backup" in sample_tier.features

    def test_empty_id_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceTier(
                id="",
                name="Bad",
                price=Price(amount=0),
            )

    def test_empty_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceTier(
                id="ok",
                name="",
                price=Price(amount=0),
            )

    def test_defaults(self) -> None:
        t = ServiceTier(id="basic", name="Basic", price=Price(amount=5))
        assert t.description == ""
        assert t.limits == {}
        assert t.features == []


# ---------------------------------------------------------------------------
# ServiceOffering
# ---------------------------------------------------------------------------

class TestServiceOffering:
    def test_valid_offering(self, sample_offering: ServiceOffering) -> None:
        assert sample_offering.id == "postgres"
        assert len(sample_offering.tiers) == 2

    def test_no_tiers_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceOffering(
                id="bad",
                name="No Tiers",
                tiers=[],
            )

    def test_defaults(self, sample_tier: ServiceTier) -> None:
        o = ServiceOffering(id="svc", name="Service", tiers=[sample_tier])
        assert o.description == ""
        assert o.category == ""
        assert o.documentation_url is None


# ---------------------------------------------------------------------------
# ServiceManifest
# ---------------------------------------------------------------------------

class TestServiceManifest:
    def test_valid_manifest(self, sample_manifest: ServiceManifest) -> None:
        assert sample_manifest.provider_name == "Example DB Provider"
        assert len(sample_manifest.services) == 1
        assert sample_manifest.osp_version == "0.1.0"

    def test_no_services_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceManifest(
                provider_name="Bad Provider",
                provider_url="https://example.com",
                services=[],
            )

    def test_empty_provider_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ServiceManifest(
                provider_name="",
                provider_url="https://example.com",
                services=[
                    ServiceOffering(
                        id="x",
                        name="X",
                        tiers=[ServiceTier(id="t", name="T", price=Price(amount=0))],
                    )
                ],
            )

    def test_serialization_round_trip(self, sample_manifest: ServiceManifest) -> None:
        data = sample_manifest.model_dump(mode="json")
        rebuilt = ServiceManifest.model_validate(data)
        assert rebuilt == sample_manifest


# ---------------------------------------------------------------------------
# ProvisionRequest
# ---------------------------------------------------------------------------

class TestProvisionRequest:
    def test_minimal_request(self) -> None:
        r = ProvisionRequest(service_id="postgres", tier_id="free")
        assert r.parameters == {}
        assert r.agent_id is None
        assert r.idempotency_key is None

    def test_full_request(self) -> None:
        r = ProvisionRequest(
            service_id="postgres",
            tier_id="pro",
            parameters={"region": "us-east-1", "name": "my-db"},
            agent_id="agent-007",
            idempotency_key="idem-123",
        )
        assert r.parameters["region"] == "us-east-1"

    def test_empty_service_id_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ProvisionRequest(service_id="", tier_id="free")


# ---------------------------------------------------------------------------
# ProvisionResponse
# ---------------------------------------------------------------------------

class TestProvisionResponse:
    def test_valid_response(self, sample_provision_response: ProvisionResponse) -> None:
        assert sample_provision_response.resource_id == "res_abc123"
        assert sample_provision_response.status == ResourceStatus.provisioned
        assert sample_provision_response.credentials_bundle is not None

    def test_without_credentials(self) -> None:
        r = ProvisionResponse(resource_id="res_1", status="provisioning")
        assert r.credentials_bundle is None
        assert r.status == ResourceStatus.provisioning


# ---------------------------------------------------------------------------
# CredentialBundle
# ---------------------------------------------------------------------------

class TestCredentialBundle:
    def test_valid_bundle(self, sample_credentials: CredentialBundle) -> None:
        assert "DATABASE_URL" in sample_credentials.credentials
        assert sample_credentials.expires_at is None

    def test_with_expiry(self) -> None:
        dt = datetime(2030, 1, 1, tzinfo=timezone.utc)
        c = CredentialBundle(credentials={"KEY": "val"}, expires_at=dt)
        assert c.expires_at == dt

    def test_empty_credentials_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CredentialBundle(credentials={})


# ---------------------------------------------------------------------------
# UsageReport
# ---------------------------------------------------------------------------

class TestUsageReport:
    def test_valid_report(self, sample_usage_report: UsageReport) -> None:
        assert sample_usage_report.resource_id == "res_abc123"
        assert len(sample_usage_report.metrics) == 2

    def test_metric_fields(self) -> None:
        m = UsageMetric(name="api_calls", value=42, unit="requests", limit=1000)
        assert m.name == "api_calls"
        assert m.value == 42


# ---------------------------------------------------------------------------
# OSPError
# ---------------------------------------------------------------------------

class TestOSPError:
    def test_valid_error(self) -> None:
        e = OSPError(error="not_found", message="Resource not found")
        assert e.error == "not_found"
        assert e.details == {}

    def test_with_details(self) -> None:
        e = OSPError(
            error="validation_error",
            message="Bad input",
            details={"field": "tier_id", "reason": "unknown tier"},
        )
        assert e.details["field"] == "tier_id"
