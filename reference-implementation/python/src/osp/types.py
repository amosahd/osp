"""OSP protocol types as Pydantic v2 models — v1.1.

Every data structure exchanged over the Open Service Protocol is defined here.
Field names match the canonical JSON Schemas in schemas/ and the TypeScript
SDK types verbatim so that cross-language round-trips are lossless.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Currency(str, Enum):
    """ISO-4217 currency codes supported by OSP."""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    USDC = "USDC"
    EURC = "EURC"


class ServiceCategory(str, Enum):
    database = "database"
    hosting = "hosting"
    auth = "auth"
    analytics = "analytics"
    storage = "storage"
    compute = "compute"
    messaging = "messaging"
    monitoring = "monitoring"
    search = "search"
    ai = "ai"
    email = "email"
    other = "other"


class PaymentMethod(str, Enum):
    free = "free"
    sardis_wallet = "sardis_wallet"
    stripe_spt = "stripe_spt"
    x402 = "x402"
    mpp = "mpp"
    invoice = "invoice"
    external = "external"


class FulfillmentProofType(str, Enum):
    api_key_delivery = "api_key_delivery"
    health_check = "health_check"
    signed_receipt = "signed_receipt"


class ProvisionStatus(str, Enum):
    provisioning = "provisioning"
    active = "active"
    failed = "failed"
    pending_payment = "pending_payment"
    deprovisioning = "deprovisioning"
    deprovisioned = "deprovisioned"


class EncryptionMethod(str, Enum):
    x25519_xsalsa20_poly1305 = "x25519-xsalsa20-poly1305"
    aes_256_gcm = "aes-256-gcm"


class CredentialType(str, Enum):
    api_key = "api_key"
    connection_string = "connection_string"
    oauth_token = "oauth_token"
    certificate = "certificate"
    composite = "composite"
    short_lived_token = "short_lived_token"


class ProvisionErrorCode(str, Enum):
    insufficient_funds = "insufficient_funds"
    payment_failed = "payment_failed"
    region_unavailable = "region_unavailable"
    quota_exceeded = "quota_exceeded"
    invalid_config = "invalid_config"
    trust_tier_insufficient = "trust_tier_insufficient"
    offering_unavailable = "offering_unavailable"
    provider_error = "provider_error"
    rate_limited = "rate_limited"
    budget_exceeded = "budget_exceeded"
    delegation_unauthorized = "delegation_unauthorized"
    nhi_federation_failed = "nhi_federation_failed"


class NHITokenType(str, Enum):
    bearer = "bearer"
    dpop = "dpop"
    mtls = "mtls"


class NHITokenMode(str, Enum):
    static = "static"
    short_lived = "short_lived"
    federated = "federated"


class NHIFederationType(str, Enum):
    oidc = "oidc"
    spiffe = "spiffe"
    mtls = "mtls"


class A2ACapability(str, Enum):
    provision = "provision"
    deprovision = "deprovision"
    rotate = "rotate"
    monitor = "monitor"
    delegate = "delegate"


class ComplianceFramework(str, Enum):
    soc2 = "soc2"
    hipaa = "hipaa"
    gdpr = "gdpr"
    pci_dss = "pci_dss"
    iso27001 = "iso27001"


class TracePropagationFormat(str, Enum):
    w3c = "w3c"
    b3 = "b3"
    jaeger = "jaeger"


class CanaryStrategy(str, Enum):
    percentage = "percentage"
    blue_green = "blue_green"
    rolling = "rolling"


class WebhookEventType(str, Enum):
    provision_started = "provision.started"
    provision_completed = "provision.completed"
    provision_failed = "provision.failed"
    deprovision_started = "deprovision.started"
    deprovision_completed = "deprovision.completed"
    deprovision_failed = "deprovision.failed"
    credentials_rotated = "credentials.rotated"
    credentials_expiring = "credentials.expiring"
    resource_warning = "resource.warning"
    resource_suspended = "resource.suspended"
    resource_resumed = "resource.resumed"
    usage_threshold = "usage.threshold"
    usage_report_ready = "usage.report_ready"
    payment_required = "payment.required"
    payment_confirmed = "payment.confirmed"
    budget_alert = "budget.alert"
    budget_exceeded = "budget.exceeded"
    nhi_token_expiring = "nhi.token_expiring"
    nhi_token_rotated = "nhi.token_rotated"
    dependency_health_changed = "dependency.health_changed"
    scorecard_updated = "scorecard.updated"
    environment_ttl_expiring = "environment.ttl_expiring"
    environment_ttl_expired = "environment.ttl_expired"


class WarningType(str, Enum):
    approaching_limit = "approaching_limit"
    performance_degraded = "performance_degraded"
    maintenance_scheduled = "maintenance_scheduled"
    credential_expiring = "credential_expiring"
    payment_overdue = "payment_overdue"
    budget_threshold = "budget_threshold"
    ttl_expiring = "ttl_expiring"


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class Price(BaseModel):
    """Pricing with decimal string amount to avoid floating-point issues."""
    amount: str = Field(..., description="Decimal string (e.g. '25.00').")
    currency: Currency = Field(default=Currency.USD)
    interval: str | None = Field(default=None, description="ISO 8601 duration (e.g. 'P1M') or null for one-time.")


# ---------------------------------------------------------------------------
# Escrow & Metering
# ---------------------------------------------------------------------------

class EscrowProfile(BaseModel):
    timeout_seconds: int | None = None
    verification_window_seconds: int | None = None
    dispute_window_seconds: int | None = None


class UsageMetering(BaseModel):
    dimensions: list[str] | None = None
    reporting_window: str | None = None
    countersignature_required: bool | None = None


# ---------------------------------------------------------------------------
# Service Catalogue
# ---------------------------------------------------------------------------

class CanaryConfig(BaseModel):
    enabled: bool | None = None
    strategies: list[CanaryStrategy] | None = None


class ServiceTier(BaseModel):
    tier_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    price: Price
    limits: dict[str, Any] | None = None
    features: list[str] | None = None
    escrow_profile: EscrowProfile | None = None
    rate_limit: str | None = None
    usage_metering: UsageMetering | None = None
    sla: str | None = None
    ttl_seconds: int | None = None


class ServiceOffering(BaseModel):
    offering_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str | None = None
    category: ServiceCategory | str = Field(default="other")
    tiers: list[ServiceTier] = Field(..., min_length=1)
    credentials_schema: dict[str, Any] | None = None
    estimated_provision_seconds: int | None = None
    fulfillment_proof_type: FulfillmentProofType | None = None
    regions: list[str] | None = None
    documentation_url: str | None = None
    dependencies: list[str] | None = None
    sbom_url: str | None = None
    canary: CanaryConfig | None = None


# ---------------------------------------------------------------------------
# Provider Endpoints
# ---------------------------------------------------------------------------

class ProviderEndpoints(BaseModel):
    provision: str
    deprovision: str
    credentials: str
    rotate: str | None = None
    status: str
    usage: str | None = None
    health: str
    dependency_graph: str | None = None
    scorecard: str | None = None
    skills: str | None = None


# ---------------------------------------------------------------------------
# v1.1: A2A Agent Delegation
# ---------------------------------------------------------------------------

class A2AAgentCard(BaseModel):
    agent_id: str | None = None
    capabilities: list[A2ACapability] | None = None
    delegation_endpoint: str | None = None
    task_lifecycle: bool | None = None
    agent_public_key: str | None = None


# ---------------------------------------------------------------------------
# v1.1: Non-Human Identity
# ---------------------------------------------------------------------------

class NHIConfig(BaseModel):
    short_lived_tokens: bool | None = None
    token_ttl_seconds: int | None = None
    orphan_detection: bool | None = None
    federation: list[NHIFederationType] | None = None
    token_endpoint: str | None = None


class NHIToken(BaseModel):
    token: str
    token_type: NHITokenType
    expires_at: str
    refresh_endpoint: str | None = None
    identity_id: str | None = None


# ---------------------------------------------------------------------------
# v1.1: FinOps / Cost-as-Code
# ---------------------------------------------------------------------------

class FinOpsConfig(BaseModel):
    budget_enforcement: bool | None = None
    cost_in_pr: bool | None = None
    anomaly_detection: bool | None = None
    burn_rate_tracking: bool | None = None
    budget_endpoint: str | None = None


class BudgetConstraint(BaseModel):
    max_monthly_cost: str | None = None
    max_total_cost: str | None = None
    currency: Currency | None = None
    alert_threshold_percent: float | None = None


class BudgetStatus(BaseModel):
    budget_limit: str | None = None
    consumed: str | None = None
    remaining: str | None = None
    percent_used: float | None = None
    currency: Currency | None = None
    alert_triggered: bool | None = None


class BurnRate(BaseModel):
    hourly_rate: str | None = None
    daily_rate: str | None = None
    ttl_remaining_seconds: int | None = None
    estimated_total_cost: str | None = None
    currency: Currency | None = None


# ---------------------------------------------------------------------------
# v1.1: Dependency Graph
# ---------------------------------------------------------------------------

class DependencyGraph(BaseModel):
    auto_generate: bool | None = None
    impact_analysis: bool | None = None
    health_propagation: bool | None = None
    auto_docs: bool | None = None


# ---------------------------------------------------------------------------
# v1.1: Scorecards & Compliance
# ---------------------------------------------------------------------------

class Scorecards(BaseModel):
    maturity_scores: dict[str, float] | None = None
    compliance: list[ComplianceFramework] | None = None
    guided_remediation: bool | None = None


# ---------------------------------------------------------------------------
# v1.1: Agent Observability
# ---------------------------------------------------------------------------

class ObservabilityConfig(BaseModel):
    otel_endpoint: str | None = None
    trace_propagation: list[TracePropagationFormat] | None = None
    audit_log: bool | None = None
    hitl_gates: bool | None = None
    cost_per_action: bool | None = None


# ---------------------------------------------------------------------------
# v1.1: MCP Alignment
# ---------------------------------------------------------------------------

class MCPConfig(BaseModel):
    tools: list[str] | None = None
    streamable_http: bool | None = None
    well_known_url: str | None = None
    skills_url: str | None = None


# ---------------------------------------------------------------------------
# Service Manifest
# ---------------------------------------------------------------------------

class ServiceManifest(BaseModel):
    """Top-level manifest published at /.well-known/osp.json."""
    manifest_id: str = Field(..., min_length=1)
    manifest_version: int = Field(default=1)
    previous_version: int | None = None
    osp_spec_version: str | None = None
    provider_id: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    provider_url: str | None = None
    provider_public_key: str | None = None
    offerings: list[ServiceOffering] = Field(..., min_length=1)
    accepted_payment_methods: list[PaymentMethod | str] | None = None
    trust_tier_required: int | None = None
    endpoints: ProviderEndpoints
    a2a: A2AAgentCard | None = None
    nhi: NHIConfig | None = None
    finops: FinOpsConfig | None = None
    dependency_graph: DependencyGraph | None = None
    scorecards: Scorecards | None = None
    observability: ObservabilityConfig | None = None
    mcp: MCPConfig | None = None
    identity: ManifestIdentity | None = None
    provider_key_id: str | None = None
    extensions: dict[str, Any] | None = None
    effective_at: str | None = None
    provider_signature: str = Field(default="")


# ---------------------------------------------------------------------------
# Agent Identity
# ---------------------------------------------------------------------------

class AgentIdentity(BaseModel):
    """Identity verification for the requesting agent."""
    method: Literal["ed25519_did", "oauth2_client", "api_key"]
    credential: str
    did_document: dict | None = None
    nonce_signature: str | None = None


# ---------------------------------------------------------------------------
# Provisioning
# ---------------------------------------------------------------------------

class ProvisionRequest(BaseModel):
    offering_id: str = Field(..., min_length=1)
    tier_id: str = Field(..., min_length=1)
    project_name: str = Field(..., min_length=1)
    region: str | None = None
    payment_method: str | None = None
    payment_proof: str | None = None
    agent_public_key: str | None = None
    nonce: str = Field(..., min_length=1)
    config: dict[str, Any] | None = None
    webhook_url: str | None = None
    # v1.1
    delegating_agent_id: str | None = None
    delegation_proof: str | None = None
    nhi_token_mode: NHITokenMode | None = None
    budget: BudgetConstraint | None = None
    ttl_seconds: int | None = None
    trace_context: str | None = None
    # v1.2: identity, sandbox, idempotency
    idempotency_key: str | None = None
    mode: Literal["live", "sandbox"] | None = Field(default="live")
    agent_identity: AgentIdentity | None = None


class FulfillmentProof(BaseModel):
    type: FulfillmentProofType
    health_check_url: str | None = None
    receipt_signature: str | None = None
    receipt_payload: str | None = None
    timestamp: str


class ProvisionError(BaseModel):
    code: ProvisionErrorCode
    message: str
    retry_after_seconds: int | None = None


class CostBreakdownItem(BaseModel):
    dimension: str
    estimated_usage: str
    unit_price: str
    estimated_cost: str


class CostEstimate(BaseModel):
    monthly_estimate: str | None = None
    currency: Currency | None = None
    breakdown: list[CostBreakdownItem] | None = None


class ProvisionResponse(BaseModel):
    request_id: str | None = None
    offering_id: str | None = None
    tier_id: str | None = None
    resource_id: str = Field(..., min_length=1)
    status: ProvisionStatus
    credentials: CredentialBundle | None = None
    dashboard_url: str | None = None
    estimated_ready_seconds: int | None = None
    fulfillment_proof: FulfillmentProof | str | None = None
    escrow_id: str | None = None
    message: str | None = None
    status_url: str | None = None
    region: str | None = None
    created_at: str | None = None
    expires_at: str | None = None
    error: ProvisionError | None = None
    # v1.1
    nhi_token: NHIToken | None = None
    cost_estimate: CostEstimate | None = None
    trace_id: str | None = None
    dependency_impact: list[str] | None = None
    # v1.2: sandbox
    sandbox: bool | None = None


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

class CredentialBundle(BaseModel):
    bundle_id: str | None = None
    resource_id: str = Field(default="")
    offering_id: str | None = None
    encrypted_payload: str | None = None
    encryption_method: EncryptionMethod | None = None
    credentials: dict[str, str] | None = None
    ephemeral_public_key: str | None = None
    nonce: str | None = None
    provider_signature: str | None = None
    agent_public_key_fingerprint: str | None = None
    issued_at: str = Field(default="")
    expires_at: str | None = None
    rotation_available_at: str | None = None
    credential_type: CredentialType | None = None
    version: int | None = None
    previous_bundle_id: str | None = None
    decrypted_schema: dict[str, Any] | None = None
    # v1.1
    nhi_identity_id: str | None = None
    token_refresh_endpoint: str | None = None
    osp_uri: str | None = None
    # v1.2: sandbox
    sandbox: bool | None = None


# ---------------------------------------------------------------------------
# Lifecycle & Usage
# ---------------------------------------------------------------------------

class ResourceStatus(BaseModel):
    resource_id: str
    status: ProvisionStatus
    offering_id: str
    tier_id: str
    region: str | None = None
    created_at: str
    updated_at: str | None = None
    dashboard_url: str | None = None
    message: str | None = None


class UsageDimension(BaseModel):
    name: str | None = None
    dimension: str | None = None
    value: float | None = None
    quantity: str | None = None
    unit: str
    included_quantity: str | None = None
    overage_quantity: str | None = None
    unit_price: str | None = None
    cost: Price | None = None


class UsageReport(BaseModel):
    report_id: str | None = None
    resource_id: str
    offering_id: str | None = None
    tier_id: str | None = None
    period_start: str
    period_end: str
    dimensions: list[UsageDimension] = Field(default_factory=list)
    total_cost: Price | None = None
    overage_cost: Price | None = None
    countersignature: str | None = None
    countersignature_deadline: str | None = None
    dispute_window_ends_at: str | None = None
    provider_signature: str | None = None
    generated_at: str | None = None
    metadata: dict[str, Any] | None = None
    # v1.1
    budget_status: BudgetStatus | None = None
    burn_rate: BurnRate | None = None
    trace_id: str | None = None


class HealthStatus(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str | None = None
    latency_ms: float | None = None
    checked_at: str
    details: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Cost Summary
# ---------------------------------------------------------------------------

class CostResource(BaseModel):
    """Cost data for a single provisioned resource."""
    resource_id: str
    offering_id: str
    cost: float
    usage_summary: str | None = None


class CostSummary(BaseModel):
    """Aggregated cost summary across resources for a billing period."""
    total_cost: float
    currency: str
    period: dict[str, str]
    resources: list[CostResource]
    projected_monthly: float


# ---------------------------------------------------------------------------
# Health (extended)
# ---------------------------------------------------------------------------

class HealthCheck(BaseModel):
    """Individual health check result."""
    name: str
    status: str
    latency_ms: int


class HealthResponse(BaseModel):
    """Detailed health response with sub-checks."""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    supported_versions: list[str]
    uptime_seconds: int
    checks: list[HealthCheck]


# ---------------------------------------------------------------------------
# Manifest Identity
# ---------------------------------------------------------------------------

class ManifestIdentity(BaseModel):
    """Identity verification configuration advertised in the manifest."""
    supported_methods: list[str]
    oauth2_issuers: list[str] | None = None
    api_key_registration_url: str | None = None
    identity_required_for_tiers: list[str] | None = None


# ---------------------------------------------------------------------------
# Webhook Events
# ---------------------------------------------------------------------------

class CredentialBundleRef(BaseModel):
    encrypted_payload: str
    encryption_method: EncryptionMethod
    ephemeral_public_key: str | None = None
    nonce: str | None = None
    provider_signature: str


class WebhookEventError(BaseModel):
    code: str
    message: str
    retryable: bool | None = None
    retry_after_seconds: int | None = None


class ResourceWarning(BaseModel):
    warning_type: WarningType
    message: str
    severity: Literal["info", "warning", "critical"] | None = None
    action_required_by: str | None = None


class UsageThresholdData(BaseModel):
    dimension: str
    threshold_percent: float
    current_usage: str
    limit: str
    unit: str


class PaymentDetails(BaseModel):
    amount: str
    currency: Currency
    payment_method: str | None = None
    due_by: str | None = None
    transaction_id: str | None = None


class BudgetAlert(BaseModel):
    budget_limit: str | None = None
    current_spend: str | None = None
    percent_used: float | None = None
    currency: Currency | None = None
    action: Literal["alert", "throttle", "block"] | None = None


class NHIEvent(BaseModel):
    identity_id: str | None = None
    token_type: NHITokenType | None = None
    expires_at: str | None = None
    refresh_endpoint: str | None = None


class DependencyEvent(BaseModel):
    dependency_resource_id: str | None = None
    dependency_offering_id: str | None = None
    health_status: Literal["healthy", "degraded", "unhealthy", "unknown"] | None = None
    affected_resources: list[str] | None = None


class TTLEvent(BaseModel):
    ttl_remaining_seconds: int | None = None
    original_ttl_seconds: int | None = None
    action: Literal["warning", "expiring", "expired", "extended"] | None = None
    extension_available: bool | None = None


class WebhookEventData(BaseModel):
    status: str | None = None
    credentials: CredentialBundleRef | None = None
    fulfillment_proof: FulfillmentProof | None = None
    error: WebhookEventError | None = None
    warning: ResourceWarning | None = None
    usage_threshold: UsageThresholdData | None = None
    payment_details: PaymentDetails | None = None
    budget_alert: BudgetAlert | None = None
    nhi_event: NHIEvent | None = None
    dependency_event: DependencyEvent | None = None
    ttl_event: TTLEvent | None = None
    dashboard_url: str | None = None
    message: str | None = None


class WebhookEvent(BaseModel):
    event_id: str
    event_type: WebhookEventType
    resource_id: str
    request_id: str | None = None
    offering_id: str
    timestamp: str
    data: WebhookEventData | None = None
    provider_signature: str
    delivery_attempt: int | None = None
    trace_id: str | None = None


# ---------------------------------------------------------------------------
# Error
# ---------------------------------------------------------------------------

class OSPErrorBody(BaseModel):
    error: str
    code: str | None = None
    details: dict[str, Any] | None = None
