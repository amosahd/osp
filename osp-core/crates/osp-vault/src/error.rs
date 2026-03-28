use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("vault not found at {path}")]
    NotFound { path: String },

    #[error("credential not found: {key}")]
    CredentialNotFound { key: String },

    #[error("encryption error: {0}")]
    EncryptionError(String),

    #[error("decryption error: {0}")]
    DecryptionError(String),

    #[error("keyring error: {0}")]
    KeyringError(String),

    #[error("invalid osp:// URI: {0}")]
    InvalidUri(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("vault already exists at {path}")]
    AlreadyExists { path: String },

    #[error("vault locked — wrong key")]
    WrongKey,
}
