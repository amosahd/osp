use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A registered manifest entry in the registry database.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestEntry {
    pub id: i64,
    pub provider_id: String,
    pub display_name: String,
    pub domain: String,
    pub manifest_version: u64,
    pub manifest_json: String,
    pub signature_verified: bool,
    pub registered_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub reputation_score: f64,
    pub health_status: String,
}

/// Search query parameters.
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    #[serde(default)]
    pub q: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub tag: Option<String>,
    #[serde(default)]
    pub cursor: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 {
    20
}

/// Paginated search response.
#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub next_cursor: Option<String>,
    pub total_count: u64,
}

/// A single search result.
#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub provider_id: String,
    pub display_name: String,
    pub domain: String,
    pub categories: Vec<String>,
    pub offerings_count: usize,
    pub reputation_score: f64,
    pub health_status: String,
}

/// Provider reputation data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reputation {
    pub provider_id: String,
    pub uptime_30d: f64,
    pub avg_provision_time_ms: u64,
    pub total_provisions: u64,
    pub failure_rate: f64,
    pub score: f64,
}

/// Template/preset entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateEntry {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub template_json: String,
    pub author: String,
    pub created_at: DateTime<Utc>,
    pub downloads: u64,
}

/// Skill index entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillEntry {
    pub id: i64,
    pub provider_id: String,
    pub skill_content: String,
    pub category: String,
    pub updated_at: DateTime<Utc>,
}
