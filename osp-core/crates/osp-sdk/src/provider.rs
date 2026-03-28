use async_trait::async_trait;
use osp_crypto::KeyPair;
use osp_manifest::types::{ProvisionRequest, ProvisionResponse, ServiceManifest};

/// Trait for building an OSP-compatible provider.
///
/// Implement this trait to make your service discoverable and provisionable via OSP.
#[async_trait]
pub trait ProviderServer: Send + Sync {
    /// Return the service manifest for this provider.
    fn manifest(&self) -> &ServiceManifest;

    /// Handle a provision request.
    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, anyhow::Error>;

    /// Handle a deprovision request.
    async fn deprovision(&self, resource_id: &str) -> Result<(), anyhow::Error>;

    /// Handle a status check.
    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, anyhow::Error>;

    /// Handle a credentials request.
    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, anyhow::Error>;

    /// Handle credential rotation.
    async fn rotate(&self, resource_id: &str) -> Result<serde_json::Value, anyhow::Error>;

    /// Health check.
    async fn health(&self) -> Result<serde_json::Value, anyhow::Error>;
}

/// Helper to sign a manifest with a key pair.
pub fn sign_manifest(
    manifest: &ServiceManifest,
    keypair: &KeyPair,
) -> Result<String, anyhow::Error> {
    let sig = osp_manifest::verify::sign_manifest(manifest, keypair)?;
    Ok(sig)
}

/// Generate a new provider key pair and return it with the base64url-encoded public key.
pub fn generate_provider_keys() -> (KeyPair, String) {
    let kp = KeyPair::generate();
    let pub_b64 = kp.public_key().to_base64url();
    (kp, pub_b64)
}
