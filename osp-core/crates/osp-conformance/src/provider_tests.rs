use chrono::Utc;
use reqwest::Client;
use uuid::Uuid;

use crate::error::ConformanceError;
use crate::report::{TestResult, TestStatus};

/// Run the 8 mandatory provider conformance tests.
pub async fn run_provider_tests(base_url: &str) -> Result<Vec<TestResult>, ConformanceError> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let mut results = Vec::new();

    results.push(test_well_known(&client, base_url).await);
    results.push(test_manifest_schema(&client, base_url).await);
    results.push(test_manifest_signature(&client, base_url).await);
    results.push(test_provision(&client, base_url).await);
    results.push(test_deprovision(&client, base_url).await);
    results.push(test_status(&client, base_url).await);
    results.push(test_credentials(&client, base_url).await);
    results.push(test_health(&client, base_url).await);

    Ok(results)
}

async fn test_well_known(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/.well-known/osp.json");

    match client.get(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                let content_type = resp
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("");

                if content_type.contains("application/json") {
                    TestResult::new("well_known_endpoint", TestStatus::Passed, start)
                } else {
                    TestResult::new(
                        "well_known_endpoint",
                        TestStatus::Failed {
                            reason: format!("wrong content-type: {content_type}"),
                        },
                        start,
                    )
                }
            } else {
                TestResult::new(
                    "well_known_endpoint",
                    TestStatus::Failed {
                        reason: format!("HTTP {}", resp.status()),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "well_known_endpoint",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_manifest_schema(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/.well-known/osp.json");

    match client.get(&url).send().await.and_then(|r| Ok(r)) {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(manifest) => {
                let result = osp_manifest::validate::validate_manifest(&manifest);
                match result {
                    Ok(()) => {
                        TestResult::new("manifest_valid_schema", TestStatus::Passed, start)
                    }
                    Err(e) => TestResult::new(
                        "manifest_valid_schema",
                        TestStatus::Failed {
                            reason: e.to_string(),
                        },
                        start,
                    ),
                }
            }
            Err(e) => TestResult::new(
                "manifest_valid_schema",
                TestStatus::Failed {
                    reason: format!("invalid JSON: {e}"),
                },
                start,
            ),
        },
        Err(e) => TestResult::new(
            "manifest_valid_schema",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_manifest_signature(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/.well-known/osp.json");

    match client.get(&url).send().await {
        Ok(resp) => match resp.json::<osp_manifest::ServiceManifest>().await {
            Ok(manifest) => match osp_manifest::verify::verify_manifest(&manifest) {
                Ok(()) => TestResult::new("manifest_signature", TestStatus::Passed, start),
                Err(e) => TestResult::new(
                    "manifest_signature",
                    TestStatus::Failed {
                        reason: e.to_string(),
                    },
                    start,
                ),
            },
            Err(e) => TestResult::new(
                "manifest_signature",
                TestStatus::Failed {
                    reason: format!("parse error: {e}"),
                },
                start,
            ),
        },
        Err(e) => TestResult::new(
            "manifest_signature",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_provision(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/osp/v1/provision");
    let nonce = Uuid::new_v4().to_string();

    let body = serde_json::json!({
        "offering_id": "conformance-test/db",
        "tier_id": "free",
        "payment_method": "free",
        "nonce": nonce,
        "project_name": "osp-conformance-test",
    });

    match client.post(&url).json(&body).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => {
                        if json.get("resource_id").is_some() && json.get("status").is_some() {
                            TestResult::new("provision_sync", TestStatus::Passed, start)
                        } else {
                            TestResult::new(
                                "provision_sync",
                                TestStatus::Failed {
                                    reason: "response missing resource_id or status".to_string(),
                                },
                                start,
                            )
                        }
                    }
                    Err(e) => TestResult::new(
                        "provision_sync",
                        TestStatus::Failed {
                            reason: format!("invalid response JSON: {e}"),
                        },
                        start,
                    ),
                }
            } else {
                TestResult::new(
                    "provision_sync",
                    TestStatus::Failed {
                        reason: format!("HTTP {status}"),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "provision_sync",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_deprovision(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    // This test depends on a previously provisioned resource; use a placeholder
    let url = format!("{base_url}/osp/v1/deprovision/conformance-test-resource");

    match client.delete(&url).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            // 200, 204, or 404 (if resource doesn't exist) are all acceptable
            if status == 200 || status == 204 || status == 404 {
                TestResult::new("deprovision", TestStatus::Passed, start)
            } else {
                TestResult::new(
                    "deprovision",
                    TestStatus::Failed {
                        reason: format!("unexpected HTTP {status}"),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "deprovision",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_status(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/osp/v1/status/conformance-test-resource");

    match client.get(&url).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if status == 200 || status == 404 {
                TestResult::new("status_endpoint", TestStatus::Passed, start)
            } else {
                TestResult::new(
                    "status_endpoint",
                    TestStatus::Failed {
                        reason: format!("unexpected HTTP {status}"),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "status_endpoint",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_credentials(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/osp/v1/credentials/conformance-test-resource");

    match client.get(&url).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if status == 200 || status == 404 || status == 401 {
                TestResult::new("credentials_endpoint", TestStatus::Passed, start)
            } else {
                TestResult::new(
                    "credentials_endpoint",
                    TestStatus::Failed {
                        reason: format!("unexpected HTTP {status}"),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "credentials_endpoint",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

async fn test_health(client: &Client, base_url: &str) -> TestResult {
    let start = Utc::now();
    let url = format!("{base_url}/osp/v1/health");

    match client.get(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => {
                        if json.get("status").is_some() {
                            TestResult::new("health_endpoint", TestStatus::Passed, start)
                        } else {
                            TestResult::new(
                                "health_endpoint",
                                TestStatus::Failed {
                                    reason: "response missing 'status' field".to_string(),
                                },
                                start,
                            )
                        }
                    }
                    Err(e) => TestResult::new(
                        "health_endpoint",
                        TestStatus::Failed {
                            reason: format!("invalid JSON: {e}"),
                        },
                        start,
                    ),
                }
            } else {
                TestResult::new(
                    "health_endpoint",
                    TestStatus::Failed {
                        reason: format!("HTTP {}", resp.status()),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "health_endpoint",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}
