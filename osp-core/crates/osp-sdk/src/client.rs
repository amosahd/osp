use anyhow::Result;
use osp_crypto::KeyPair;
use osp_manifest::cache::ManifestCache;
use osp_manifest::types::{ProvisionRequest, ProvisionResponse, ServiceManifest};

/// OSP Client for AI agents.
///
/// Handles discovery, provisioning, credential management, and vault operations.
pub struct Client {
    keypair: KeyPair,
    cache: ManifestCache,
    registry: osp_provider::AdapterRegistry,
}

impl Client {
    /// Create a new client with a fresh key pair.
    pub fn new() -> Result<Self> {
        let keypair = KeyPair::generate();
        let cache = ManifestCache::default();
        let mut registry = osp_provider::AdapterRegistry::new();
        registry.register_defaults();

        Ok(Self {
            keypair,
            cache,
            registry,
        })
    }

    /// Create a client with an existing key pair.
    pub fn with_keypair(keypair: KeyPair) -> Result<Self> {
        let cache = ManifestCache::default();
        let mut registry = osp_provider::AdapterRegistry::new();
        registry.register_defaults();

        Ok(Self {
            keypair,
            cache,
            registry,
        })
    }

    /// Get the client's public key (for credential encryption).
    pub fn public_key(&self) -> osp_crypto::PublicKey {
        self.keypair.public_key()
    }

    /// Discover a provider by domain.
    pub async fn discover(&self, domain: &str) -> Result<ServiceManifest> {
        // Check cache first
        if let Some(cached) = self.cache.get(domain) {
            return Ok(cached);
        }

        let manifest = osp_manifest::fetch::fetch_and_verify(domain).await?;
        let _ = self.cache.put(domain, manifest.clone(), None);
        Ok(manifest)
    }

    /// Provision a service.
    pub async fn provision(
        &self,
        offering_id: &str,
        tier_id: &str,
    ) -> Result<ProvisionResponse> {
        let provider_slug = offering_id
            .split('/')
            .next()
            .unwrap_or(offering_id);

        let adapter = self.registry.get(provider_slug)?;

        let request = ProvisionRequest {
            offering_id: offering_id.to_string(),
            tier_id: tier_id.to_string(),
            project_name: None,
            region: None,
            configuration: None,
            payment_method: "free".to_string(),
            payment_proof: None,
            agent_public_key: Some(self.keypair.public_key().to_base64url()),
            nonce: uuid::Uuid::new_v4().to_string(),
            idempotency_key: None,
            webhook_url: None,
            tier_change: None,
            principal_id: None,
            agent_attestation: None,
            metadata: None,
        };

        let response = adapter.provision(&request).await?;
        Ok(response)
    }

    /// Deprovision a resource.
    pub async fn deprovision(&self, provider_id: &str, resource_id: &str) -> Result<()> {
        let adapter = self.registry.get(provider_id)?;
        adapter.deprovision(resource_id).await?;
        Ok(())
    }

    /// Check health of a provider.
    pub async fn health(
        &self,
        provider_id: &str,
    ) -> Result<osp_provider::port::HealthStatus> {
        let adapter = self.registry.get(provider_id)?;
        let status = adapter.health().await?;
        Ok(status)
    }

    /// Decrypt an encrypted credential bundle.
    pub fn decrypt_credentials(
        &self,
        encrypted: &osp_crypto::EncryptedPayload,
    ) -> Result<Vec<u8>> {
        let decrypted = osp_crypto::decrypt_credentials(&self.keypair, encrypted)?;
        Ok(decrypted)
    }

    /// Verify a manifest signature.
    pub fn verify_manifest(&self, manifest: &ServiceManifest) -> Result<()> {
        osp_manifest::verify::verify_manifest(manifest)?;
        Ok(())
    }

    /// List available provider adapters.
    pub fn list_providers(&self) -> Vec<osp_provider::port::AdapterInfo> {
        self.registry.list()
    }
}
