use thiserror::Error;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("invalid key length: expected {expected}, got {actual}")]
    InvalidKeyLength { expected: usize, actual: usize },

    #[error("invalid signature")]
    InvalidSignature,

    #[error("signature verification failed")]
    VerificationFailed,

    #[error("encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("base64url decode error: {0}")]
    Base64DecodeError(#[from] base64::DecodeError),

    #[error("hex decode error: {0}")]
    HexDecodeError(#[from] hex::FromHexError),

    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("key conversion error: {0}")]
    KeyConversionError(String),
}
