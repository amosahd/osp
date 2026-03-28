use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConformanceError {
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("test failed: {test_name} — {reason}")]
    TestFailed { test_name: String, reason: String },

    #[error("provider unreachable at {url}")]
    Unreachable { url: String },

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("crypto error: {0}")]
    CryptoError(#[from] osp_crypto::CryptoError),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
