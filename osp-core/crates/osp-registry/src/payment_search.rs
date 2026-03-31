use serde::{Deserialize, Serialize};

/// Payment-aware search query parameters.
#[derive(Debug, Deserialize)]
pub struct PaymentAwareSearchQuery {
    #[serde(default)]
    pub q: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub payment_capability: Option<PaymentCapabilityFilter>,
    #[serde(default)]
    pub escrow_required: Option<bool>,
    #[serde(default)]
    pub min_trust_score: Option<f64>,
    #[serde(default)]
    pub conformance_level: Option<String>,
    #[serde(default)]
    pub sort_by: Option<SearchSortBy>,
    #[serde(default)]
    pub cursor: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 {
    20
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentCapabilityFilter {
    FreeOnly,
    PaidCapable,
    EscrowRequired,
    ApprovalRequired,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SearchSortBy {
    Relevance,
    TrustScore,
    ConformanceLevel,
    ProvisionCount,
    RecentActivity,
}

/// Payment-aware search result with enriched metadata.
#[derive(Debug, Serialize)]
pub struct PaymentAwareSearchResult {
    pub provider_id: String,
    pub display_name: String,
    pub domain: String,
    pub categories: Vec<String>,
    pub offerings_count: usize,
    pub supported_payment_methods: Vec<String>,
    pub has_free_tier: bool,
    pub has_paid_tier: bool,
    pub escrow_available: bool,
    pub trust_metadata: TrustMetadata,
}

/// Provider trust metadata for discovery ranking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustMetadata {
    pub trust_score: f64,
    pub last_verified_at: Option<String>,
    pub conformance_level: Option<String>,
    pub manifest_signature_valid: bool,
    pub verification_status: VerificationStatus,
    pub provision_success_rate: Option<f64>,
    pub total_provisions: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerificationStatus {
    Verified,
    Pending,
    Failed,
    Expired,
    Unknown,
}

/// Registry record signing for cache/mirror validation.
#[derive(Debug, Serialize, Deserialize)]
pub struct SignedRegistryRecord {
    pub record_id: String,
    pub payload: String,
    pub signature: String,
    pub signed_at: String,
    pub expires_at: String,
    pub registry_key_id: String,
}

/// Provider review lifecycle for moderation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderReview {
    pub provider_id: String,
    pub status: ReviewStatus,
    pub submitted_at: String,
    pub reviewed_at: Option<String>,
    pub reviewer: Option<String>,
    pub notes: Option<String>,
    pub certification: Option<CertificationBadge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReviewStatus {
    Submitted,
    UnderReview,
    Approved,
    Rejected,
    Suspended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificationBadge {
    pub badge_id: String,
    pub level: String,
    pub issued_at: String,
    pub expires_at: Option<String>,
    pub issuer: String,
}

/// Curated fallback provider pack for offline discovery.
#[derive(Debug, Serialize, Deserialize)]
pub struct CuratedProviderPack {
    pub version: String,
    pub providers: Vec<CuratedProvider>,
    pub generated_at: String,
    pub signature: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CuratedProvider {
    pub provider_id: String,
    pub display_name: String,
    pub domain: String,
    pub categories: Vec<String>,
    pub trust_score: f64,
    pub payment_methods: Vec<String>,
}

/// Analytics event for registry instrumentation.
#[derive(Debug, Serialize, Deserialize)]
pub struct RegistryAnalyticsEvent {
    pub event_id: String,
    pub event_type: AnalyticsEventType,
    pub provider_id: Option<String>,
    pub search_query: Option<String>,
    pub category: Option<String>,
    pub timestamp: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnalyticsEventType {
    Search,
    ProviderView,
    ProvisionAttempt,
    ProvisionSuccess,
    ProvisionFailure,
    SearchAbandoned,
}
