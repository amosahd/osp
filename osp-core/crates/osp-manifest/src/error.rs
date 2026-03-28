use thiserror::Error;

#[derive(Debug, Error)]
pub enum ManifestError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("JSON parse error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("signature verification failed: {0}")]
    SignatureError(#[from] osp_crypto::CryptoError),

    #[error("schema validation failed: {errors:?}")]
    SchemaValidationError { errors: Vec<String> },

    #[error("manifest not found at {url}")]
    NotFound { url: String },

    #[error("manifest expired: published_at={published_at}, max_age={max_age_secs}s")]
    Expired {
        published_at: String,
        max_age_secs: u64,
    },

    #[error("cache error: {0}")]
    CacheError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("invalid manifest: {0}")]
    Invalid(String),
}
