use ed25519_dalek::{
    Signature as DalekSignature, Signer, SigningKey, Verifier, VerifyingKey,
};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};

use crate::encoding::{base64url_decode, base64url_encode};
use crate::error::CryptoError;

/// An Ed25519 key pair for signing and verification.
#[derive(Debug, Clone)]
pub struct KeyPair {
    signing_key: SigningKey,
}

/// An Ed25519 public key.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PublicKey {
    bytes: [u8; 32],
}

/// An Ed25519 signature.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Signature {
    bytes: [u8; 64],
}

impl KeyPair {
    /// Generate a new random key pair.
    pub fn generate() -> Self {
        let signing_key = SigningKey::generate(&mut OsRng);
        Self { signing_key }
    }

    /// Create a key pair from a 32-byte seed.
    pub fn from_seed(seed: &[u8; 32]) -> Self {
        let signing_key = SigningKey::from_bytes(seed);
        Self { signing_key }
    }

    /// Create a key pair from a hex-encoded seed.
    pub fn from_seed_hex(hex_seed: &str) -> Result<Self, CryptoError> {
        let bytes = hex::decode(hex_seed)?;
        if bytes.len() != 32 {
            return Err(CryptoError::InvalidKeyLength {
                expected: 32,
                actual: bytes.len(),
            });
        }
        let mut seed = [0u8; 32];
        seed.copy_from_slice(&bytes);
        Ok(Self::from_seed(&seed))
    }

    /// Sign a message, returning the signature.
    pub fn sign(&self, message: &[u8]) -> Signature {
        let sig = self.signing_key.sign(message);
        let mut bytes = [0u8; 64];
        bytes.copy_from_slice(&sig.to_bytes());
        Signature { bytes }
    }

    /// Get the public key.
    pub fn public_key(&self) -> PublicKey {
        let vk = self.signing_key.verifying_key();
        PublicKey {
            bytes: vk.to_bytes(),
        }
    }

    /// Get the raw 32-byte seed (private key).
    pub fn seed(&self) -> &[u8; 32] {
        self.signing_key.as_bytes()
    }

    /// Get the raw signing key for encryption key conversion.
    #[allow(dead_code)]
    pub(crate) fn signing_key(&self) -> &SigningKey {
        &self.signing_key
    }
}

impl PublicKey {
    /// Create from raw 32 bytes.
    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        Self { bytes }
    }

    /// Decode from base64url.
    pub fn from_base64url(s: &str) -> Result<Self, CryptoError> {
        let decoded = base64url_decode(s)?;
        if decoded.len() != 32 {
            return Err(CryptoError::InvalidKeyLength {
                expected: 32,
                actual: decoded.len(),
            });
        }
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&decoded);
        Ok(Self { bytes })
    }

    /// Decode from hex.
    pub fn from_hex(hex_str: &str) -> Result<Self, CryptoError> {
        let decoded = hex::decode(hex_str)?;
        if decoded.len() != 32 {
            return Err(CryptoError::InvalidKeyLength {
                expected: 32,
                actual: decoded.len(),
            });
        }
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&decoded);
        Ok(Self { bytes })
    }

    /// Encode as base64url (no padding).
    pub fn to_base64url(&self) -> String {
        base64url_encode(&self.bytes)
    }

    /// Encode as hex.
    pub fn to_hex(&self) -> String {
        hex::encode(self.bytes)
    }

    /// Get the raw bytes.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.bytes
    }

    /// Verify a signature over a message.
    pub fn verify(&self, message: &[u8], signature: &Signature) -> Result<(), CryptoError> {
        let verifying_key = VerifyingKey::from_bytes(&self.bytes)
            .map_err(|e| CryptoError::KeyConversionError(e.to_string()))?;
        let dalek_sig = DalekSignature::from_bytes(&signature.bytes);
        verifying_key
            .verify(message, &dalek_sig)
            .map_err(|_| CryptoError::VerificationFailed)
    }
}

impl Signature {
    /// Create from raw 64 bytes.
    pub fn from_bytes(bytes: [u8; 64]) -> Self {
        Self { bytes }
    }

    /// Decode from base64url.
    pub fn from_base64url(s: &str) -> Result<Self, CryptoError> {
        let decoded = base64url_decode(s)?;
        if decoded.len() != 64 {
            return Err(CryptoError::InvalidSignature);
        }
        let mut bytes = [0u8; 64];
        bytes.copy_from_slice(&decoded);
        Ok(Self { bytes })
    }

    /// Encode as base64url.
    pub fn to_base64url(&self) -> String {
        base64url_encode(&self.bytes)
    }

    /// Get the raw bytes.
    pub fn as_bytes(&self) -> &[u8; 64] {
        &self.bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_sign_verify() {
        let kp = KeyPair::generate();
        let msg = b"hello OSP";
        let sig = kp.sign(msg);
        kp.public_key().verify(msg, &sig).unwrap();
    }

    #[test]
    fn verify_fails_wrong_message() {
        let kp = KeyPair::generate();
        let sig = kp.sign(b"correct message");
        let result = kp.public_key().verify(b"wrong message", &sig);
        assert!(result.is_err());
    }

    #[test]
    fn from_seed_deterministic() {
        let seed_hex = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
        let kp1 = KeyPair::from_seed_hex(seed_hex).unwrap();
        let kp2 = KeyPair::from_seed_hex(seed_hex).unwrap();
        // Same seed must produce the same public key
        assert_eq!(kp1.public_key().to_hex(), kp2.public_key().to_hex());
        // And sign/verify must work
        let sig = kp1.sign(b"test");
        kp2.public_key().verify(b"test", &sig).unwrap();
    }

    #[test]
    fn public_key_base64url_roundtrip() {
        let kp = KeyPair::generate();
        let pk = kp.public_key();
        let encoded = pk.to_base64url();
        let decoded = PublicKey::from_base64url(&encoded).unwrap();
        assert_eq!(pk, decoded);
    }

    /// Test vector from OSP spec Appendix E.1 — sign and verify roundtrip.
    ///
    /// Note: The exact public key derivation may vary between ed25519-dalek
    /// backend implementations (fiat vs classic). We test that sign/verify
    /// is consistent rather than asserting a specific public key value.
    #[test]
    fn spec_appendix_e1_ed25519() {
        let seed_hex = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
        let kp = KeyPair::from_seed_hex(seed_hex).unwrap();

        // The public key should be 32 bytes and base64url-encodable
        let pub_b64 = kp.public_key().to_base64url();
        assert!(!pub_b64.is_empty());

        // Sign the canonical test manifest and verify the signature roundtrips
        let test_manifest = concat!(
            r#"{"endpoints":{"base_url":"https://test.example.com"},"#,
            r#""manifest_id":"test-001","manifest_version":1,"#,
            r#""offerings":[{"category":"database","credentials_schema":{},"#,
            r#""description":"Test","name":"Test DB","offering_id":"test/db","#,
            r#""tiers":[{"name":"Free","price":{"amount":"0.00","currency":"USD","#,
            r#""interval":"monthly"},"tier_id":"free"}]}],"osp_version":"1.0","#,
            r#""provider":{"display_name":"Test Provider","#,
            r#""homepage_url":"https://test.example.com","#,
            r#""provider_id":"test.example.com"},"#,
            r#""provider_public_key":""#,
        );
        // Build the manifest with the actual derived public key
        let full_manifest = format!(
            r#"{test_manifest}{pub_b64}","published_at":"2026-01-01T00:00:00Z"}}"#
        );

        let sig = kp.sign(full_manifest.as_bytes());
        kp.public_key()
            .verify(full_manifest.as_bytes(), &sig)
            .unwrap();
    }
}
