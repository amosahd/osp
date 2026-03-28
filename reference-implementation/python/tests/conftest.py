"""Shared fixtures for OSP tests."""

from __future__ import annotations

import pytest

from osp.types import (
    CredentialBundle,
    Price,
    ProvisionResponse,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    UsageMetric,
    UsageReport,
)


@pytest.fixture()
def sample_tier() -> ServiceTier:
    return ServiceTier(
        id="free",
        name="Free Tier",
        description="For hobby projects",
        price=Price(amount=0, currency="USD", billing_cycle="monthly"),
        limits={"max_rows": 10_000, "max_connections": 5},
        features=["auto-backup", "shared-cpu"],
    )


@pytest.fixture()
def sample_offering(sample_tier: ServiceTier) -> ServiceOffering:
    return ServiceOffering(
        id="postgres",
        name="Managed PostgreSQL",
        description="Fully managed PostgreSQL databases.",
        category="database",
        tiers=[
            sample_tier,
            ServiceTier(
                id="pro",
                name="Pro Tier",
                description="For production workloads",
                price=Price(amount=29.99, currency="USD", billing_cycle="monthly"),
                limits={"max_rows": 1_000_000, "max_connections": 100},
                features=["auto-backup", "dedicated-cpu", "point-in-time-recovery"],
            ),
        ],
        documentation_url="https://docs.example.com/postgres",
    )


@pytest.fixture()
def sample_manifest(sample_offering: ServiceOffering) -> ServiceManifest:
    return ServiceManifest(
        osp_version="0.1.0",
        provider_name="Example DB Provider",
        provider_url="https://db.example.com",
        provider_description="High-quality managed databases.",
        services=[sample_offering],
        contact_email="support@example.com",
    )


@pytest.fixture()
def sample_credentials() -> CredentialBundle:
    return CredentialBundle(
        credentials={
            "DATABASE_URL": "postgres://user:pass@host:5432/db",
            "API_KEY": "key_abc123",
        },
    )


@pytest.fixture()
def sample_provision_response(sample_credentials: CredentialBundle) -> ProvisionResponse:
    return ProvisionResponse(
        resource_id="res_abc123",
        status="provisioned",
        message="Database ready.",
        credentials_bundle=sample_credentials,
    )


@pytest.fixture()
def sample_usage_report() -> UsageReport:
    return UsageReport(
        resource_id="res_abc123",
        metrics=[
            UsageMetric(name="storage_bytes", value=1_048_576, unit="bytes", limit=10_737_418_240),
            UsageMetric(name="connections", value=3, unit="connections", limit=5),
        ],
        total_cost=0.0,
    )
