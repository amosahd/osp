"""OSP protocol types as Pydantic models.

Every data structure exchanged over the Open Service Protocol is defined here.
Models carry full field descriptions so tooling (and humans) can understand the
protocol without reading prose documentation.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class BillingCycle(str, Enum):
    """Supported billing periods."""

    monthly = "monthly"
    yearly = "yearly"
    one_time = "one_time"
    usage_based = "usage_based"


class Currency(str, Enum):
    """ISO-4217 currency codes supported by OSP."""

    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class Price(BaseModel):
    """A concrete price point for a service tier."""

    amount: float = Field(
        ...,
        ge=0,
        description="Monetary amount in the smallest major-currency unit (e.g. 9.99).",
    )
    currency: Currency = Field(
        default=Currency.USD,
        description="ISO-4217 currency code.",
    )
    billing_cycle: BillingCycle = Field(
        default=BillingCycle.monthly,
        description="How often the charge recurs.",
    )


# ---------------------------------------------------------------------------
# Service catalogue
# ---------------------------------------------------------------------------

class ServiceTier(BaseModel):
    """A specific plan / SKU within a service offering."""

    id: str = Field(
        ...,
        min_length=1,
        description="Machine-readable tier identifier (e.g. 'free', 'pro-v2').",
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Human-readable tier name.",
    )
    description: str = Field(
        default="",
        description="What is included in this tier.",
    )
    price: Price = Field(
        ...,
        description="Pricing details for this tier.",
    )
    limits: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary key-value limits (e.g. {'max_rows': 100_000}).",
    )
    features: list[str] = Field(
        default_factory=list,
        description="Feature flags or short descriptions included in this tier.",
    )


class ServiceOffering(BaseModel):
    """A single service exposed by a provider (e.g. 'Managed PostgreSQL')."""

    id: str = Field(
        ...,
        min_length=1,
        description="Machine-readable offering identifier.",
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Human-readable service name.",
    )
    description: str = Field(
        default="",
        description="Detailed description of the service.",
    )
    category: str = Field(
        default="",
        description="Service category (e.g. 'database', 'storage', 'auth').",
    )
    tiers: list[ServiceTier] = Field(
        ...,
        min_length=1,
        description="Available tiers / plans.  At least one is required.",
    )
    documentation_url: str | None = Field(
        default=None,
        description="URL to external documentation.",
    )


class ServiceManifest(BaseModel):
    """The top-level manifest served at ``/.well-known/osp.json``.

    A provider publishes exactly one manifest that describes itself and all
    the services it offers.
    """

    osp_version: str = Field(
        default="0.1.0",
        description="Version of the OSP specification this manifest conforms to.",
    )
    provider_name: str = Field(
        ...,
        min_length=1,
        description="Human-readable provider name.",
    )
    provider_url: str = Field(
        ...,
        description="Canonical base URL of the provider (no trailing slash).",
    )
    provider_description: str = Field(
        default="",
        description="Short blurb about the provider.",
    )
    services: list[ServiceOffering] = Field(
        ...,
        min_length=1,
        description="Services offered by this provider.  At least one is required.",
    )
    contact_email: str | None = Field(
        default=None,
        description="Support / contact email.",
    )
    signature: str | None = Field(
        default=None,
        description="Optional detached signature (e.g. JWS compact serialisation) over the manifest.",
    )


# ---------------------------------------------------------------------------
# Provisioning
# ---------------------------------------------------------------------------

class ProvisionRequest(BaseModel):
    """Request payload sent by an agent to provision a new resource."""

    service_id: str = Field(
        ...,
        min_length=1,
        description="Which service offering to provision.",
    )
    tier_id: str = Field(
        ...,
        min_length=1,
        description="Desired tier within the offering.",
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Service-specific provisioning parameters (region, name, etc.).",
    )
    agent_id: str | None = Field(
        default=None,
        description="Optional identifier of the requesting agent.",
    )
    idempotency_key: str | None = Field(
        default=None,
        description="Client-generated key for safe retries.",
    )


class ResourceStatus(str, Enum):
    """Lifecycle states of a provisioned resource."""

    provisioning = "provisioning"
    provisioned = "provisioned"
    updating = "updating"
    deprovisioning = "deprovisioning"
    deprovisioned = "deprovisioned"
    error = "error"


class ProvisionResponse(BaseModel):
    """Returned after a successful provisioning request."""

    resource_id: str = Field(
        ...,
        min_length=1,
        description="Provider-generated unique identifier for the new resource.",
    )
    status: ResourceStatus = Field(
        default=ResourceStatus.provisioned,
        description="Current lifecycle status.",
    )
    message: str = Field(
        default="",
        description="Optional human-readable message.",
    )
    credentials_bundle: CredentialBundle | None = Field(
        default=None,
        description="Credentials ready to use immediately (when synchronous provisioning is possible).",
    )
    dashboard_url: str | None = Field(
        default=None,
        description="Link to a management dashboard for this resource.",
    )


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

class CredentialBundle(BaseModel):
    """A set of credentials for accessing a provisioned resource.

    Credentials are returned as an opaque string-to-string map so the
    protocol does not prescribe the authentication mechanism.
    """

    credentials: dict[str, str] = Field(
        ...,
        min_length=1,
        description="Key-value credential pairs (e.g. DATABASE_URL, API_KEY).",
    )
    expires_at: datetime | None = Field(
        default=None,
        description="When these credentials expire (UTC).  None means they don't expire automatically.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Extra metadata about the credentials (rotation policy, etc.).",
    )


# ---------------------------------------------------------------------------
# Usage reporting
# ---------------------------------------------------------------------------

class UsageMetric(BaseModel):
    """A single usage metric data point."""

    name: str = Field(
        ...,
        min_length=1,
        description="Metric name (e.g. 'storage_bytes', 'api_calls').",
    )
    value: float = Field(
        ...,
        description="Current metric value.",
    )
    unit: str = Field(
        default="",
        description="Human-readable unit (e.g. 'bytes', 'requests').",
    )
    limit: float | None = Field(
        default=None,
        description="Tier limit for this metric, if applicable.",
    )


class UsageReport(BaseModel):
    """Usage data for a provisioned resource."""

    resource_id: str = Field(
        ...,
        min_length=1,
        description="Resource these metrics belong to.",
    )
    metrics: list[UsageMetric] = Field(
        default_factory=list,
        description="List of current usage metrics.",
    )
    period_start: datetime | None = Field(
        default=None,
        description="Start of the current billing period (UTC).",
    )
    period_end: datetime | None = Field(
        default=None,
        description="End of the current billing period (UTC).",
    )
    total_cost: float | None = Field(
        default=None,
        ge=0,
        description="Estimated cost for the current period.",
    )


# ---------------------------------------------------------------------------
# Error
# ---------------------------------------------------------------------------

class OSPError(BaseModel):
    """Standard error envelope returned by providers."""

    error: str = Field(
        ...,
        description="Machine-readable error code (e.g. 'not_found', 'invalid_request').",
    )
    message: str = Field(
        default="",
        description="Human-readable explanation.",
    )
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional structured details.",
    )
