use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tokio::time::interval;
use tracing::{info, warn};

use crate::port::{HealthStatus, ProviderPort};

/// Result of a health poll across all registered providers.
#[derive(Debug, Clone)]
pub struct HealthReport {
    pub results: HashMap<String, HealthStatus>,
    pub checked_at: chrono::DateTime<chrono::Utc>,
}

/// Poll health for a single provider.
pub async fn check_health(provider: &dyn ProviderPort) -> HealthStatus {
    match provider.health().await {
        Ok(status) => status,
        Err(e) => HealthStatus::Unhealthy {
            message: e.to_string(),
        },
    }
}

/// Poll health for all providers in the registry.
pub async fn check_all_health(
    providers: &HashMap<String, Arc<dyn ProviderPort>>,
) -> HealthReport {
    let mut results = HashMap::new();

    for (id, provider) in providers {
        let status = check_health(provider.as_ref()).await;
        match &status {
            HealthStatus::Healthy => info!(provider = id.as_str(), "healthy"),
            HealthStatus::Degraded { message } => {
                warn!(provider = id.as_str(), message = message.as_str(), "degraded")
            }
            HealthStatus::Unhealthy { message } => {
                warn!(provider = id.as_str(), message = message.as_str(), "unhealthy")
            }
            HealthStatus::Unknown => warn!(provider = id.as_str(), "unknown"),
        }
        results.insert(id.clone(), status);
    }

    HealthReport {
        results,
        checked_at: chrono::Utc::now(),
    }
}

/// Start a background health polling loop.
pub async fn start_health_poller(
    providers: HashMap<String, Arc<dyn ProviderPort>>,
    poll_interval: Duration,
    mut on_report: impl FnMut(HealthReport) + Send + 'static,
) {
    let mut ticker = interval(poll_interval);

    loop {
        ticker.tick().await;
        let report = check_all_health(&providers).await;
        on_report(report);
    }
}
