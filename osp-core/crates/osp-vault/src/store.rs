use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce as AesNonce};
use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::error::VaultError;

const VAULT_FILE: &str = "vault.json";
const NONCE_SIZE: usize = 12; // AES-GCM nonce

/// A single stored credential entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialEntry {
    pub provider_id: String,
    pub offering_id: String,
    pub resource_id: String,
    pub credentials: HashMap<String, String>,
    pub stored_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

/// Serialized vault structure (stored encrypted on disk).
#[derive(Debug, Serialize, Deserialize)]
struct VaultData {
    version: u32,
    entries: HashMap<String, CredentialEntry>,
}

/// Encrypted vault file structure.
#[derive(Debug, Serialize, Deserialize)]
struct EncryptedVault {
    version: u32,
    nonce: String,
    ciphertext: String,
}

/// AES-256-GCM encrypted credential vault.
pub struct Vault {
    vault_path: PathBuf,
    encryption_key: [u8; 32],
    data: VaultData,
}

impl Vault {
    /// Initialize a new vault at the given directory.
    pub fn init(dir: &Path, encryption_key: [u8; 32]) -> Result<Self, VaultError> {
        let vault_path = dir.join(VAULT_FILE);
        if vault_path.exists() {
            return Err(VaultError::AlreadyExists {
                path: vault_path.display().to_string(),
            });
        }

        std::fs::create_dir_all(dir)?;

        let data = VaultData {
            version: 1,
            entries: HashMap::new(),
        };

        let vault = Self {
            vault_path,
            encryption_key,
            data,
        };
        vault.save()?;
        Ok(vault)
    }

    /// Open an existing vault.
    pub fn open(dir: &Path, encryption_key: [u8; 32]) -> Result<Self, VaultError> {
        let vault_path = dir.join(VAULT_FILE);
        if !vault_path.exists() {
            return Err(VaultError::NotFound {
                path: vault_path.display().to_string(),
            });
        }

        let encrypted_json = std::fs::read_to_string(&vault_path)?;
        let encrypted: EncryptedVault = serde_json::from_str(&encrypted_json)?;

        let nonce_bytes = osp_crypto::base64url_decode(&encrypted.nonce)
            .map_err(|e| VaultError::DecryptionError(e.to_string()))?;
        let ciphertext = osp_crypto::base64url_decode(&encrypted.ciphertext)
            .map_err(|e| VaultError::DecryptionError(e.to_string()))?;

        let cipher = Aes256Gcm::new_from_slice(&encryption_key)
            .map_err(|e| VaultError::DecryptionError(e.to_string()))?;

        let nonce = AesNonce::from_slice(&nonce_bytes);
        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| VaultError::WrongKey)?;

        let data: VaultData = serde_json::from_slice(&plaintext)?;

        Ok(Self {
            vault_path,
            encryption_key,
            data,
        })
    }

    /// Open or create a vault.
    pub fn open_or_init(dir: &Path, encryption_key: [u8; 32]) -> Result<Self, VaultError> {
        let vault_path = dir.join(VAULT_FILE);
        if vault_path.exists() {
            Self::open(dir, encryption_key)
        } else {
            Self::init(dir, encryption_key)
        }
    }

    /// Add a credential entry.
    pub fn put(&mut self, key: &str, entry: CredentialEntry) -> Result<(), VaultError> {
        self.data.entries.insert(key.to_string(), entry);
        self.save()
    }

    /// Get a credential entry by key.
    pub fn get(&self, key: &str) -> Result<&CredentialEntry, VaultError> {
        self.data
            .entries
            .get(key)
            .ok_or_else(|| VaultError::CredentialNotFound {
                key: key.to_string(),
            })
    }

    /// List all credential keys.
    pub fn list(&self) -> Vec<&str> {
        self.data.entries.keys().map(|s| s.as_str()).collect()
    }

    /// List entries filtered by provider.
    pub fn list_by_provider(&self, provider_id: &str) -> Vec<(&str, &CredentialEntry)> {
        self.data
            .entries
            .iter()
            .filter(|(_, v)| v.provider_id == provider_id)
            .map(|(k, v)| (k.as_str(), v))
            .collect()
    }

    /// Delete a credential entry.
    pub fn delete(&mut self, key: &str) -> Result<CredentialEntry, VaultError> {
        let entry = self
            .data
            .entries
            .remove(key)
            .ok_or_else(|| VaultError::CredentialNotFound {
                key: key.to_string(),
            })?;
        self.save()?;
        Ok(entry)
    }

    /// Get a specific credential value by key and field.
    pub fn get_credential_value(&self, key: &str, field: &str) -> Result<&str, VaultError> {
        let entry = self.get(key)?;
        entry
            .credentials
            .get(field)
            .map(|s| s.as_str())
            .ok_or_else(|| VaultError::CredentialNotFound {
                key: format!("{key}/{field}"),
            })
    }

    /// Encrypt and save to disk.
    fn save(&self) -> Result<(), VaultError> {
        let plaintext = serde_json::to_vec(&self.data)?;

        let cipher = Aes256Gcm::new_from_slice(&self.encryption_key)
            .map_err(|e| VaultError::EncryptionError(e.to_string()))?;

        let mut nonce_bytes = [0u8; NONCE_SIZE];
        rand::thread_rng().fill(&mut nonce_bytes);
        let nonce = AesNonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_ref())
            .map_err(|e| VaultError::EncryptionError(e.to_string()))?;

        let encrypted = EncryptedVault {
            version: 1,
            nonce: osp_crypto::base64url_encode(&nonce_bytes),
            ciphertext: osp_crypto::base64url_encode(&ciphertext),
        };

        let json = serde_json::to_string_pretty(&encrypted)?;
        std::fs::write(&self.vault_path, json)?;

        Ok(())
    }
}

/// Generate a random 32-byte encryption key.
pub fn generate_vault_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::thread_rng().fill(&mut key);
    key
}

/// Try to load the vault key from the system keyring.
pub fn load_key_from_keyring(service: &str) -> Result<[u8; 32], VaultError> {
    let entry = keyring::Entry::new(service, "vault-key")
        .map_err(|e| VaultError::KeyringError(e.to_string()))?;

    let stored = entry
        .get_password()
        .map_err(|e| VaultError::KeyringError(e.to_string()))?;

    let bytes = osp_crypto::base64url_decode(&stored)
        .map_err(|e| VaultError::KeyringError(e.to_string()))?;

    if bytes.len() != 32 {
        return Err(VaultError::KeyringError(format!(
            "invalid key length: expected 32, got {}",
            bytes.len()
        )));
    }

    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes);
    Ok(key)
}

/// Store a vault key in the system keyring.
pub fn store_key_in_keyring(service: &str, key: &[u8; 32]) -> Result<(), VaultError> {
    let entry = keyring::Entry::new(service, "vault-key")
        .map_err(|e| VaultError::KeyringError(e.to_string()))?;

    let encoded = osp_crypto::base64url_encode(key);
    entry
        .set_password(&encoded)
        .map_err(|e| VaultError::KeyringError(e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn vault_init_put_get() {
        let dir = tempfile::tempdir().unwrap();
        let key = generate_vault_key();
        let mut vault = Vault::init(dir.path(), key).unwrap();

        let mut creds = HashMap::new();
        creds.insert("connection_uri".to_string(), "postgresql://...".to_string());

        let entry = CredentialEntry {
            provider_id: "com.supabase".to_string(),
            offering_id: "supabase/managed-postgres".to_string(),
            resource_id: "res_123".to_string(),
            credentials: creds,
            stored_at: Utc::now(),
            expires_at: None,
            metadata: None,
        };

        vault.put("supabase/db", entry).unwrap();

        let retrieved = vault.get("supabase/db").unwrap();
        assert_eq!(retrieved.resource_id, "res_123");
        assert_eq!(
            retrieved.credentials.get("connection_uri").unwrap(),
            "postgresql://..."
        );
    }

    #[test]
    fn vault_persistence() {
        let dir = tempfile::tempdir().unwrap();
        let key = generate_vault_key();

        {
            let mut vault = Vault::init(dir.path(), key).unwrap();
            let mut creds = HashMap::new();
            creds.insert("api_key".to_string(), "secret123".to_string());

            vault
                .put(
                    "test/key",
                    CredentialEntry {
                        provider_id: "test".to_string(),
                        offering_id: "test/service".to_string(),
                        resource_id: "res_abc".to_string(),
                        credentials: creds,
                        stored_at: Utc::now(),
                        expires_at: None,
                        metadata: None,
                    },
                )
                .unwrap();
        }

        // Reopen with same key
        let vault = Vault::open(dir.path(), key).unwrap();
        let entry = vault.get("test/key").unwrap();
        assert_eq!(entry.credentials.get("api_key").unwrap(), "secret123");
    }

    #[test]
    fn vault_wrong_key_fails() {
        let dir = tempfile::tempdir().unwrap();
        let key1 = generate_vault_key();
        let key2 = generate_vault_key();

        Vault::init(dir.path(), key1).unwrap();
        assert!(Vault::open(dir.path(), key2).is_err());
    }

    #[test]
    fn vault_delete() {
        let dir = tempfile::tempdir().unwrap();
        let key = generate_vault_key();
        let mut vault = Vault::init(dir.path(), key).unwrap();

        vault
            .put(
                "to-delete",
                CredentialEntry {
                    provider_id: "test".to_string(),
                    offering_id: "test/x".to_string(),
                    resource_id: "res_del".to_string(),
                    credentials: HashMap::new(),
                    stored_at: Utc::now(),
                    expires_at: None,
                    metadata: None,
                },
            )
            .unwrap();

        vault.delete("to-delete").unwrap();
        assert!(vault.get("to-delete").is_err());
    }
}
