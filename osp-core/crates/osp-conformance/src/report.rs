use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::levels::ConformanceLevel;

/// Status of an individual test.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum TestStatus {
    Passed,
    Failed { reason: String },
    Skipped { reason: String },
}

/// Result of a single conformance test.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub test_name: String,
    #[serde(flatten)]
    pub status: TestStatus,
    pub started_at: DateTime<Utc>,
    pub duration_ms: u64,
}

impl TestResult {
    pub fn new(name: &str, status: TestStatus, started_at: DateTime<Utc>) -> Self {
        let duration_ms = (Utc::now() - started_at).num_milliseconds().max(0) as u64;
        Self {
            test_name: name.to_string(),
            status,
            started_at,
            duration_ms,
        }
    }

    pub fn is_passed(&self) -> bool {
        matches!(self.status, TestStatus::Passed)
    }
}

/// Full conformance test report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConformanceReport {
    pub target: String,
    pub target_type: TargetType,
    pub level_tested: ConformanceLevel,
    pub level_achieved: Option<ConformanceLevel>,
    pub results: Vec<TestResult>,
    pub summary: ReportSummary,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetType {
    Provider,
    Agent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSummary {
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
    pub skipped: usize,
    pub pass_rate: f64,
}

impl ConformanceReport {
    /// Build a report from test results.
    pub fn build(
        target: &str,
        target_type: TargetType,
        level: ConformanceLevel,
        results: Vec<TestResult>,
    ) -> Self {
        let total = results.len();
        let passed = results.iter().filter(|r| r.is_passed()).count();
        let failed = results
            .iter()
            .filter(|r| matches!(r.status, TestStatus::Failed { .. }))
            .count();
        let skipped = results
            .iter()
            .filter(|r| matches!(r.status, TestStatus::Skipped { .. }))
            .count();
        let pass_rate = if total > 0 {
            passed as f64 / total as f64 * 100.0
        } else {
            0.0
        };

        let level_achieved = determine_level_achieved(&results);

        Self {
            target: target.to_string(),
            target_type,
            level_tested: level,
            level_achieved,
            results,
            summary: ReportSummary {
                total,
                passed,
                failed,
                skipped,
                pass_rate,
            },
            generated_at: Utc::now(),
        }
    }

    /// Serialize to JSON.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

/// Determine the highest conformance level achieved based on test results.
fn determine_level_achieved(results: &[TestResult]) -> Option<ConformanceLevel> {
    let passed_tests: Vec<&str> = results
        .iter()
        .filter(|r| r.is_passed())
        .map(|r| r.test_name.as_str())
        .collect();

    let levels = [
        ConformanceLevel::Full,
        ConformanceLevel::Escrow,
        ConformanceLevel::Events,
        ConformanceLevel::Webhooks,
        ConformanceLevel::Core,
    ];

    for level in &levels {
        let required = level.required_tests();
        if required.iter().all(|t| passed_tests.contains(t)) {
            return Some(level.clone());
        }
    }

    None
}
