use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};
use xsalsa20poly1305::aead::{Aead, KeyInit};
use xsalsa20poly1305::{Nonce, XSalsa20Poly1305};

use crate::encoding::{base64url_decode, base64url_encode};
use crate::error::CryptoError;
use crate::signing::KeyPair;

/// The result of encrypting credentials.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedPayload {
    pub algorithm: String,
    pub agent_public_key: String,
    pub provider_ephemeral_public_key: String,
    pub nonce: String,
    pub ciphertext: String,
}

/// Convert an Ed25519 private key (seed) to an X25519 private key.
///
/// Per RFC 8032 Section 5.2.5: hash the seed with SHA-512, take the lower 32 bytes,
/// clamp, and use as the X25519 secret.
fn ed25519_seed_to_x25519_secret(seed: &[u8; 32]) -> X25519Secret {
    use sha2::{Digest, Sha512};
    let hash = Sha512::digest(seed);
    let mut secret_bytes = [0u8; 32];
    secret_bytes.copy_from_slice(&hash[..32]);
    // Clamping is done internally by x25519-dalek
    X25519Secret::from(secret_bytes)
}

/// Convert an Ed25519 public key to an X25519 public key.
///
/// Uses the birational map from the Ed25519 curve to Curve25519.
fn ed25519_public_to_x25519(ed_pub: &[u8; 32]) -> Result<X25519Public, CryptoError> {
    use ed25519_dalek::VerifyingKey;
    let vk = VerifyingKey::from_bytes(ed_pub)
        .map_err(|e| CryptoError::KeyConversionError(e.to_string()))?;
    let ep = vk.to_montgomery();
    Ok(X25519Public::from(ep.to_bytes()))
}

/// Encrypt credentials for an agent using x25519-xsalsa20-poly1305.
///
/// Steps (from OSP spec Appendix E.4):
/// 1. Convert agent's Ed25519 public key to X25519 public key.
/// 2. Generate ephemeral X25519 key pair.
/// 3. Compute shared secret via X25519 DH.
/// 4. Generate random 24-byte nonce.
/// 5. Encrypt with XSalsa20-Poly1305.
pub fn encrypt_credentials(
    agent_ed25519_public_key: &[u8; 32],
    plaintext: &[u8],
) -> Result<EncryptedPayload, CryptoError> {
    let agent_x25519 = ed25519_public_to_x25519(agent_ed25519_public_key)?;

    let ephemeral_secret = X25519Secret::random_from_rng(OsRng);
    let ephemeral_public = X25519Public::from(&ephemeral_secret);

    let shared_secret = ephemeral_secret.diffie_hellman(&agent_x25519);

    let cipher = XSalsa20Poly1305::new_from_slice(shared_secret.as_bytes())
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    let mut nonce_bytes = [0u8; 24];
    rand::Rng::fill(&mut OsRng, &mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    Ok(EncryptedPayload {
        algorithm: "x25519-xsalsa20-poly1305".to_string(),
        agent_public_key: base64url_encode(agent_ed25519_public_key),
        provider_ephemeral_public_key: base64url_encode(ephemeral_public.as_bytes()),
        nonce: base64url_encode(&nonce_bytes),
        ciphertext: base64url_encode(&ciphertext),
    })
}

/// Decrypt credentials using the agent's Ed25519 key pair.
///
/// Steps (from OSP spec Appendix E.4):
/// 1. Convert agent's Ed25519 private key (seed) to X25519 private key.
/// 2. Compute shared secret via X25519 DH with ephemeral public key.
/// 3. Decrypt with XSalsa20-Poly1305.
pub fn decrypt_credentials(
    agent_keypair: &KeyPair,
    payload: &EncryptedPayload,
) -> Result<Vec<u8>, CryptoError> {
    if payload.algorithm != "x25519-xsalsa20-poly1305" {
        return Err(CryptoError::DecryptionFailed(format!(
            "unsupported algorithm: {}",
            payload.algorithm
        )));
    }

    let agent_x25519_secret = ed25519_seed_to_x25519_secret(agent_keypair.seed());

    let ephemeral_pub_bytes = base64url_decode(&payload.provider_ephemeral_public_key)?;
    if ephemeral_pub_bytes.len() != 32 {
        return Err(CryptoError::InvalidKeyLength {
            expected: 32,
            actual: ephemeral_pub_bytes.len(),
        });
    }
    let mut ephem_arr = [0u8; 32];
    ephem_arr.copy_from_slice(&ephemeral_pub_bytes);
    let ephemeral_public = X25519Public::from(ephem_arr);

    let shared_secret = agent_x25519_secret.diffie_hellman(&ephemeral_public);

    let cipher = XSalsa20Poly1305::new_from_slice(shared_secret.as_bytes())
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    let nonce_bytes = base64url_decode(&payload.nonce)?;
    if nonce_bytes.len() != 24 {
        return Err(CryptoError::DecryptionFailed(format!(
            "invalid nonce length: expected 24, got {}",
            nonce_bytes.len()
        )));
    }
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = base64url_decode(&payload.ciphertext)?;

    cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::signing::KeyPair;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let agent_kp = KeyPair::generate();
        let plaintext = br#"{"connection_uri":"postgresql://user:pass@host:5432/db"}"#;

        let encrypted =
            encrypt_credentials(agent_kp.public_key().as_bytes(), plaintext).unwrap();

        assert_eq!(encrypted.algorithm, "x25519-xsalsa20-poly1305");

        let decrypted = decrypt_credentials(&agent_kp, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn wrong_key_fails_decryption() {
        let agent_kp = KeyPair::generate();
        let wrong_kp = KeyPair::generate();
        let plaintext = b"secret credentials";

        let encrypted =
            encrypt_credentials(agent_kp.public_key().as_bytes(), plaintext).unwrap();

        let result = decrypt_credentials(&wrong_kp, &encrypted);
        assert!(result.is_err());
    }

    #[test]
    fn encrypted_payload_fields() {
        let agent_kp = KeyPair::generate();
        let encrypted =
            encrypt_credentials(agent_kp.public_key().as_bytes(), b"test").unwrap();

        assert_eq!(
            encrypted.agent_public_key,
            agent_kp.public_key().to_base64url()
        );
        // Nonce should be 24 bytes = 32 base64url chars
        let nonce_decoded = base64url_decode(&encrypted.nonce).unwrap();
        assert_eq!(nonce_decoded.len(), 24);
    }
}
