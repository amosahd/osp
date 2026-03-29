use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- Enums ---

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    Database,
    Hosting,
    Auth,
    Storage,
    Analytics,
    Messaging,
    Search,
    Compute,
    Cdn,
    Monitoring,
    Ml,
    Email,
    Dns,
    Ai,
    Other,
}

// --- v1.1 Enums ---

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SandboxEnvironment {
    Sandbox,
    Live,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NHIFederationType {
    Oidc,
    Spiffe,
    Mtls,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NHITokenType {
    Bearer,
    Dpop,
    Mtls,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NHITokenMode {
    Static,
    ShortLived,
    Federated,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum A2ACapability {
    Provision,
    Deprovision,
    Rotate,
    Monitor,
    Delegate,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CanaryStrategy {
    Percentage,
    BlueGreen,
    Rolling,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CanaryState {
    Inactive,
    Active,
    Promoting,
    RollingBack,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TracePropagationFormat {
    W3c,
    B3,
    Jaeger,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComplianceFramework {
    Soc2,
    Hipaa,
    Gdpr,
    PciDss,
    Iso27001,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentIdentityMethod {
    Ed25519Did,
    Oauth2Client,
    ApiKey,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BudgetAlertAction {
    Alert,
    Throttle,
    Block,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyEdgeKind {
    Requires,
    Optional,
    Enhances,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMethod {
    Free,
    StripeSpt,
    SardisWallet,
    X402,
    #[serde(other)]
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrustTier {
    None,
    Basic,
    Verified,
    Enterprise,
}

impl Default for TrustTier {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BillingInterval {
    OneTime,
    Hourly,
    Daily,
    Monthly,
    Yearly,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProvisionStatus {
    Provisioned,
    Provisioning,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialFormat {
    Plaintext,
    Encrypted,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FulfillmentProofType {
    None,
    CredentialTest,
    HealthCheckUrl,
    SignedReceipt,
}

impl Default for FulfillmentProofType {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialScope {
    Admin,
    ReadWrite,
    ReadOnly,
    Custom,
}

impl Default for CredentialScope {
    fn default() -> Self {
        Self::Admin
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EscrowReleaseCondition {
    ProvisionSuccess,
    Uptime24h,
    Uptime7d,
    Manual,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Proration {
    Immediate,
    NextPeriod,
    None,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeliveryProofType {
    None,
    CredentialTest,
    HealthCheckUrl,
    SignedReceipt,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode {
    #[serde(rename = "invalid_offering")]
    InvalidOffering,
    #[serde(rename = "invalid_tier")]
    InvalidTier,
    #[serde(rename = "invalid_region")]
    InvalidRegion,
    #[serde(rename = "invalid_configuration")]
    InvalidConfiguration,
    #[serde(rename = "payment_required")]
    PaymentRequired,
    #[serde(rename = "payment_declined")]
    PaymentDeclined,
    #[serde(rename = "insufficient_funds")]
    InsufficientFunds,
    #[serde(rename = "trust_tier_insufficient")]
    TrustTierInsufficient,
    #[serde(rename = "quota_exceeded")]
    QuotaExceeded,
    #[serde(rename = "region_unavailable")]
    RegionUnavailable,
    #[serde(rename = "nonce_reused")]
    NonceReused,
    #[serde(rename = "rate_limited")]
    RateLimited,
    #[serde(rename = "provider_error")]
    ProviderError,
    #[serde(rename = "capacity_exhausted")]
    CapacityExhausted,
}

// --- Provider Object ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub provider_id: String,
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub homepage_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
}

// --- Endpoints Object ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Endpoints {
    pub base_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_page_url: Option<String>,
}

// --- Price Object ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Price {
    pub amount: String,
    pub currency: String,
    pub interval: BillingInterval,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metered: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metered_dimensions: Option<Vec<MeteredDimension>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeteredDimension {
    pub dimension_id: String,
    pub name: String,
    pub unit: String,
    pub price_per_unit: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub included_quantity: Option<String>,
}

// --- Limits, Escrow, RateLimit, SLA ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowProfile {
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_condition: Option<EscrowReleaseCondition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dispute_window_hours: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimit {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requests_per_second: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requests_per_minute: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub burst: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sla {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime_percent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_time_p50_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_time_p99_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_response_hours: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sla_url: Option<String>,
}

// --- RegionObject ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Region {
    Simple(String),
    Detailed(RegionObject),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegionObject {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jurisdiction: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_region: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gdpr_compliant: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub certifications: Option<Vec<String>>,
}

// --- ServiceTier ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceTier {
    pub tier_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub price: Price,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limits: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub features: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub escrow_profile: Option<EscrowProfile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rate_limit: Option<RateLimit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accepted_payment_methods: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trust_tier_required: Option<TrustTier>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_deprovision: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sla: Option<Sla>,
}

// --- ServiceOffering ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceOffering {
    pub offering_id: String,
    pub name: String,
    pub description: String,
    pub category: Category,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    pub tiers: Vec<ServiceTier>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regions: Option<Vec<Region>>,
    pub credentials_schema: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub configuration_schema: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_provision_seconds: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fulfillment_proof_type: Option<FulfillmentProofType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub documentation_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trust_tier_required: Option<TrustTier>,
}

// --- ServiceManifest ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceManifest {
    pub osp_version: String,
    pub manifest_id: String,
    pub manifest_version: u64,
    pub published_at: DateTime<Utc>,
    pub provider: Provider,
    pub offerings: Vec<ServiceOffering>,
    pub accepted_payment_methods: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trust_tier_required: Option<TrustTier>,
    pub endpoints: Endpoints,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<HashMap<String, serde_json::Value>>,
    pub provider_signature: String,
    pub provider_public_key: String,
    // v1.1 fields
    #[serde(skip_serializing_if = "Option::is_none")]
    pub a2a: Option<A2AAgentCard>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nhi: Option<NHIConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finops: Option<FinOpsConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependency_graph: Option<DependencyGraph>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scorecards: Option<Scorecard>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observability: Option<ObservabilityConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mcp: Option<MCPConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sandbox: Option<SandboxConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhooks: Option<Vec<WebhookRegistration>>,
}

// --- TierChange Object ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierChange {
    pub resource_id: String,
    pub previous_tier_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proration: Option<Proration>,
}

// --- ProvisionRequest ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvisionRequest {
    pub offering_id: String,
    pub tier_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub configuration: Option<serde_json::Value>,
    pub payment_method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_proof: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_public_key: Option<String>,
    pub nonce: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tier_change: Option<TierChange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub principal_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_attestation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

// --- Encrypted Credentials ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedCredentials {
    pub algorithm: String,
    pub agent_public_key: String,
    pub provider_ephemeral_public_key: String,
    pub nonce: String,
    pub ciphertext: String,
}

// --- Delivery Proof ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryProof {
    #[serde(rename = "type")]
    pub proof_type: DeliveryProofType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_query: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub health_check_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signed_receipt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified_at: Option<DateTime<Utc>>,
}

// --- CredentialBundle ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialBundle {
    pub format: CredentialFormat,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credentials: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_credentials: Option<EncryptedCredentials>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delivery_proof: Option<DeliveryProof>,
    pub rotation_supported: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation_interval_hours: Option<u32>,
    pub issued_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<CredentialScope>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_restrictions: Option<Vec<String>>,
}

// --- Error Object ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvisionError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
    pub retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after_seconds: Option<u32>,
}

// --- ProvisionResponse ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvisionResponse {
    pub resource_id: String,
    pub offering_id: String,
    pub tier_id: String,
    pub status: ProvisionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credentials_bundle: Option<CredentialBundle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_ready_seconds: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub poll_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook_supported: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dashboard_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ProvisionError>,
}

// --- UsageReport ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub dimension_id: String,
    pub description: String,
    pub quantity: String,
    pub unit: String,
    pub included_quantity: String,
    pub billable_quantity: String,
    pub unit_price: String,
    pub amount: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageReport {
    pub report_id: String,
    pub resource_id: String,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub line_items: Vec<LineItem>,
    pub base_amount: String,
    pub metered_amount: String,
    pub total_amount: String,
    pub currency: String,
    pub provider_signature: String,
    pub generated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// v1.1: Sandbox Configuration
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct SandboxConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub environment: Option<SandboxEnvironment>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttl_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_cleanup: Option<bool>,
}

// ---------------------------------------------------------------------------
// v1.1: Agent Attestation & Identity
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AgentAttestation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attestation_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issued_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issuer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AgentIdentity {
    pub method: AgentIdentityMethod,
    pub credential: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub did_document: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nonce_signature: Option<String>,
}

// ---------------------------------------------------------------------------
// v1.1: Non-Human Identity (NHI)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct NHIConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_lived_tokens: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_ttl_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub orphan_detection: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub federation: Option<Vec<NHIFederationType>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct NHIToken {
    pub token: String,
    pub token_type: NHITokenType,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_endpoint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct OrphanDetectionConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub check_interval_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grace_period_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_deprovision: Option<bool>,
}

// ---------------------------------------------------------------------------
// v1.1: FinOps / Cost-as-Code
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct FinOpsConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub budget_enforcement: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_in_pr: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anomaly_detection: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub burn_rate_tracking: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub budget_endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct BudgetGuardrail {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_monthly_cost: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_total_cost: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alert_threshold_percent: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<BudgetAlertAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CostAnomaly {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detected_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_cost: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual_cost: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deviation_percent: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

// ---------------------------------------------------------------------------
// v1.1: A2A Agent Delegation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct A2AAgentCard {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<A2ACapability>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delegation_endpoint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_lifecycle: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct DelegationChain {
    pub steps: Vec<DelegationStep>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub root_agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct DelegationStep {
    pub from_agent_id: String,
    pub to_agent_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delegated_capabilities: Option<Vec<A2ACapability>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proof: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delegated_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
}

// ---------------------------------------------------------------------------
// v1.1: Canary / Progressive Deployment
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CanaryConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategies: Option<Vec<CanaryStrategy>>,
}

// ---------------------------------------------------------------------------
// v1.1: Observability / Audit
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ObservabilityConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub otel_endpoint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_propagation: Option<Vec<TracePropagationFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audit_log: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hitl_gates: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_per_action: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AuditLogEntry {
    pub entry_id: String,
    pub timestamp: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct OTelSpanConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub service_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub propagation_format: Option<TracePropagationFormat>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sample_rate: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attributes: Option<HashMap<String, String>>,
}

// ---------------------------------------------------------------------------
// v1.1: MCP Alignment
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct MCPConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub streamable_http: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub well_known_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skills_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct MCPCapability {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_schema: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_schema: Option<serde_json::Value>,
}

// ---------------------------------------------------------------------------
// v1.1: Cost Estimate / Summary / Breakdown
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CostEstimate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monthly_estimate: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub breakdown: Option<Vec<CostBreakdown>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CostSummary {
    pub total_cost: f64,
    pub currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub period_start: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub period_end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resources: Option<Vec<CostResource>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub projected_monthly: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CostResource {
    pub resource_id: String,
    pub offering_id: String,
    pub cost: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CostBreakdown {
    pub dimension: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_usage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_cost: Option<String>,
}

// ---------------------------------------------------------------------------
// v1.1: Dependency Graph
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct DependencyGraph {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_generate: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impact_analysis: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub health_propagation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_docs: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nodes: Option<Vec<DependencyNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edges: Option<Vec<DependencyEdge>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct DependencyNode {
    pub node_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offering_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub health_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct DependencyEdge {
    pub from_node: String,
    pub to_node: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<DependencyEdgeKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

// ---------------------------------------------------------------------------
// v1.1: Scorecard & Compliance
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Scorecard {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maturity_scores: Option<HashMap<String, f64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compliance: Option<Vec<ComplianceFramework>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guided_remediation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dimensions: Option<Vec<ScorecardDimension>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ScorecardDimension {
    pub name: String,
    pub score: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ComplianceCheck {
    pub framework: ComplianceFramework,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub passed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remediation: Option<String>,
}

// ---------------------------------------------------------------------------
// v1.1: Webhook Registration
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct WebhookRegistration {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub events: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secret: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<WebhookRetryPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct WebhookRetryPolicy {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_retries: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial_delay_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backoff_multiplier: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_delay_seconds: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_provision_request() {
        let json = r#"{
            "offering_id": "supabase/managed-postgres",
            "tier_id": "pro",
            "project_name": "my-saas-db",
            "payment_method": "stripe_spt",
            "nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        }"#;
        let req: ProvisionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.offering_id, "supabase/managed-postgres");
        assert_eq!(req.tier_id, "pro");
    }

    #[test]
    fn serialize_provision_response() {
        let resp = ProvisionResponse {
            resource_id: "res_123".to_string(),
            offering_id: "test/db".to_string(),
            tier_id: "free".to_string(),
            status: ProvisionStatus::Provisioned,
            credentials_bundle: None,
            estimated_ready_seconds: None,
            poll_url: None,
            webhook_supported: None,
            region: Some("us-east-1".to_string()),
            created_at: chrono::Utc::now(),
            expires_at: None,
            dashboard_url: None,
            error: None,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"status\":\"provisioned\""));
    }

    #[test]
    fn category_serde() {
        let cat = Category::Database;
        let json = serde_json::to_string(&cat).unwrap();
        assert_eq!(json, "\"database\"");
        let back: Category = serde_json::from_str(&json).unwrap();
        assert_eq!(back, Category::Database);
    }

    #[test]
    fn region_untagged_enum() {
        let simple: Region = serde_json::from_str("\"us-east-1\"").unwrap();
        assert!(matches!(simple, Region::Simple(ref s) if s == "us-east-1"));

        let detailed: Region =
            serde_json::from_str(r#"{"id":"us-east-1","jurisdiction":"US"}"#).unwrap();
        assert!(matches!(detailed, Region::Detailed(_)));
    }
}
