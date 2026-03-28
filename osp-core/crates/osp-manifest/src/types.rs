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
    Other,
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
