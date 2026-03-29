"""
osp-provider type definitions.

Pydantic models mirroring the OSP v1.0 specification protocol objects.
Used for request/response validation and handler type signatures.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PaymentMethod(str, Enum):
    FREE = "free"
    SARDIS_WALLET = "sardis_wallet"
    STRIPE_SPT = "stripe_spt"
    X402 = "x402"
    MPP = "mpp"
    INVOICE = "invoice"
    EXTERNAL = "external"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    USDC = "USDC"
    EURC = "EURC"


class ServiceCategory(str, Enum):
    DATABASE = "database"
    HOSTING = "hosting"
    AUTH = "auth"
    ANALYTICS = "analytics"
    STORAGE = "storage"
    COMPUTE = "compute"
    MESSAGING = "messaging"
    MONITORING = "monitoring"
    SEARCH = "search"
    AI = "ai"
    EMAIL = "email"
    OTHER = "other"


class FulfillmentProofType(str, Enum):
    API_KEY_DELIVERY = "api_key_delivery"
    HEALTH_CHECK = "health_check"
    SIGNED_RECEIPT = "signed_receipt"


class ProvisionStatusEnum(str, Enum):
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    FAILED = "failed"
    PENDING_PAYMENT = "pending_payment"


class ExtendedStatusEnum(str, Enum):
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    FAILED = "failed"
    PENDING_PAYMENT = "pending_payment"
    DEPROVISIONED = "deprovisioned"
    SUSPENDED = "suspended"


class EncryptionMethod(str, Enum):
    X25519_XSALSA20_POLY1305 = "x25519-xsalsa20-poly1305"
    AES_256_GCM = "aes-256-gcm"


class CredentialType(str, Enum):
    API_KEY = "api_key"
    CONNECTION_STRING = "connection_string"
    OAUTH_TOKEN = "oauth_token"
    CERTIFICATE = "certificate"
    COMPOSITE = "composite"
    SHORT_LIVED_TOKEN = "short_lived_token"


class ProvisionErrorCode(str, Enum):
    INSUFFICIENT_FUNDS = "insufficient_funds"
    PAYMENT_FAILED = "payment_failed"
    REGION_UNAVAILABLE = "region_unavailable"
    QUOTA_EXCEEDED = "quota_exceeded"
    INVALID_CONFIG = "invalid_config"
    TRUST_TIER_INSUFFICIENT = "trust_tier_insufficient"
    OFFERING_UNAVAILABLE = "offering_unavailable"
    PROVIDER_ERROR = "provider_error"
    RATE_LIMITED = "rate_limited"
    BUDGET_EXCEEDED = "budget_exceeded"
    DELEGATION_UNAUTHORIZED = "delegation_unauthorized"
    NHI_FEDERATION_FAILED = "nhi_federation_failed"


class HealthState(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


# ---------------------------------------------------------------------------
# Manifest & Catalog
# ---------------------------------------------------------------------------

class Price(BaseModel):
    amount: str = Field(..., pattern=r"^[0-9]+(\.[0-9]{1,2})?$")
    currency: Currency
    interval: Optional[str] = None


class EscrowProfile(BaseModel):
    timeout_seconds: Optional[int] = 3600
    verification_window_seconds: Optional[int] = 900
    dispute_window_seconds: Optional[int] = 86400


class UsageMetering(BaseModel):
    dimensions: Optional[list[str]] = None
    reporting_window: Optional[str] = None
    countersignature_required: Optional[bool] = False


class ServiceTier(BaseModel):
    tier_id: str
    name: str
    price: Price
    limits: Optional[dict[str, Any]] = None
    features: Optional[list[str]] = None
    escrow_profile: Optional[EscrowProfile] = None
    rate_limit: Optional[str] = None
    usage_metering: Optional[UsageMetering] = None
    sla: Optional[str] = None
    ttl_seconds: Optional[int] = None


class ServiceOffering(BaseModel):
    offering_id: str = Field(..., pattern=r"^[a-z0-9-]+/[a-z0-9-]+$")
    name: str
    description: Optional[str] = None
    category: ServiceCategory
    tiers: list[ServiceTier] = Field(..., min_length=1)
    credentials_schema: dict[str, Any]
    estimated_provision_seconds: Optional[int] = 30
    fulfillment_proof_type: Optional[FulfillmentProofType] = FulfillmentProofType.API_KEY_DELIVERY
    regions: Optional[list[str]] = None
    documentation_url: Optional[str] = None
    dependencies: Optional[list[str]] = None
    sbom_url: Optional[str] = None


class ProviderEndpoints(BaseModel):
    provision: str
    deprovision: str
    credentials: str
    rotate: Optional[str] = None
    status: str
    usage: Optional[str] = None
    health: str


class ServiceManifest(BaseModel):
    manifest_id: str = Field(..., pattern=r"^mf_[a-z0-9_]+$")
    manifest_version: int = Field(..., ge=1)
    previous_version: Optional[int] = None
    osp_spec_version: Optional[str] = "1.1"
    provider_id: str
    display_name: str
    provider_url: Optional[str] = None
    provider_public_key: Optional[str] = None
    offerings: list[ServiceOffering] = Field(..., min_length=1)
    accepted_payment_methods: Optional[list[PaymentMethod]] = None
    trust_tier_required: Optional[int] = Field(default=0, ge=0, le=3)
    endpoints: ProviderEndpoints
    extensions: Optional[dict[str, Any]] = None
    effective_at: Optional[str] = None
    provider_signature: str


# ---------------------------------------------------------------------------
# Provisioning
# ---------------------------------------------------------------------------

class BudgetConstraint(BaseModel):
    max_monthly_cost: Optional[str] = Field(default=None, pattern=r"^[0-9]+(\.[0-9]{1,2})?$")
    max_total_cost: Optional[str] = Field(default=None, pattern=r"^[0-9]+(\.[0-9]{1,2})?$")
    currency: Optional[Currency] = None
    alert_threshold_percent: Optional[int] = Field(default=80, ge=1, le=100)


class SandboxConfig(BaseModel):
    enabled: bool
    ttl_hours: Optional[int] = None
    seed_data: Optional[bool] = None


class ProvisionRequest(BaseModel):
    offering_id: str = Field(..., pattern=r"^[a-z0-9-]+/[a-z0-9-]+$")
    tier_id: str = Field(..., min_length=1)
    project_name: str = Field(..., min_length=1, max_length=100)
    region: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    payment_proof: Optional[str] = None
    agent_public_key: Optional[str] = None
    nonce: str = Field(..., min_length=1)
    config: Optional[dict[str, Any]] = None
    webhook_url: Optional[str] = None
    delegating_agent_id: Optional[str] = None
    delegation_proof: Optional[str] = None
    nhi_token_mode: Optional[Literal["static", "short_lived", "federated"]] = None
    budget: Optional[BudgetConstraint] = None
    ttl_seconds: Optional[int] = None
    trace_context: Optional[str] = None
    sandbox: Optional[SandboxConfig] = None


class CredentialBundle(BaseModel):
    encrypted_payload: str
    encryption_method: EncryptionMethod
    ephemeral_public_key: Optional[str] = None
    nonce: Optional[str] = None
    provider_signature: str


class FulfillmentProof(BaseModel):
    type: FulfillmentProofType
    health_check_url: Optional[str] = None
    receipt_signature: Optional[str] = None
    receipt_payload: Optional[str] = None
    timestamp: str


class ProvisionError(BaseModel):
    code: ProvisionErrorCode
    message: str
    retry_after_seconds: Optional[int] = None


class ProvisionResponse(BaseModel):
    request_id: str
    offering_id: str
    tier_id: str
    status: ProvisionStatusEnum
    resource_id: Optional[str] = None
    credentials: Optional[CredentialBundle] = None
    fulfillment_proof: Optional[FulfillmentProof] = None
    status_url: Optional[str] = None
    estimated_ready_seconds: Optional[int] = None
    region: Optional[str] = None
    created_at: str
    expires_at: Optional[str] = None
    dashboard_url: Optional[str] = None
    error: Optional[ProvisionError] = None


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

class ResourceStatus(BaseModel):
    resource_id: str
    status: ExtendedStatusEnum
    offering_id: str
    tier_id: str
    region: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    dashboard_url: Optional[str] = None
    message: Optional[str] = None


class Cost(BaseModel):
    amount: str = Field(..., pattern=r"^[0-9]+(\.[0-9]{1,2})?$")
    currency: Currency


class UsageDimension(BaseModel):
    dimension: str
    quantity: str
    unit: str
    included_quantity: Optional[str] = None
    overage_quantity: Optional[str] = None
    unit_price: Optional[str] = None
    cost: Optional[Cost] = None


class UsageReport(BaseModel):
    report_id: str
    resource_id: str
    offering_id: str
    tier_id: Optional[str] = None
    period_start: str
    period_end: str
    dimensions: list[UsageDimension] = Field(..., min_length=1)
    total_cost: Optional[Cost] = None
    provider_signature: str
    generated_at: Optional[str] = None


class HealthStatus(BaseModel):
    status: HealthState
    version: Optional[str] = None
    latency_ms: Optional[float] = None
    checked_at: str
    details: Optional[dict[str, Any]] = None


class CostSummaryParams(BaseModel):
    resource_id: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class CostResource(BaseModel):
    resource_id: str
    offering_id: str
    cost: Cost


class CostSummary(BaseModel):
    total_cost: Cost
    resources: list[CostResource]
    period_start: str
    period_end: str


# ---------------------------------------------------------------------------
# Error Response
# ---------------------------------------------------------------------------

class OSPErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[dict[str, Any]] = None
