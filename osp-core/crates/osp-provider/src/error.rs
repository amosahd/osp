use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("provider API error: {status} — {message}")]
    ApiError { status: u16, message: String },

    #[error("authentication failed for provider {provider}")]
    AuthError { provider: String },

    #[error("provider not found: {0}")]
    NotFound(String),

    #[error("adapter not registered: {0}")]
    AdapterNotFound(String),

    #[error("provisioning failed: {0}")]
    ProvisioningFailed(String),

    #[error("deprovisioning failed: {0}")]
    DeprovisioningFailed(String),

    #[error("health check failed for {provider}: {reason}")]
    HealthCheckFailed { provider: String, reason: String },

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("unsupported operation: {0}")]
    Unsupported(String),

    #[error("{0}")]
    Other(String),
}
