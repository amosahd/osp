use osp_crypto::{PublicKey, Signature, canonical::canonical_json};
use tracing::info;

use crate::error::ManifestError;
use crate::types::ServiceManifest;

/// Verify the Ed25519 signature on a service manifest.
///
/// Steps:
/// 1. Decode the provider's public key from base64url.
/// 2. Decode the signature from base64url.
/// 3. Reconstruct canonical JSON of the manifest excluding `provider_signature`.
/// 4. Verify the signature over the canonical JSON bytes.
pub fn verify_manifest(manifest: &ServiceManifest) -> Result<(), ManifestError> {
    let public_key = PublicKey::from_base64url(&manifest.provider_public_key)?;
    let signature = Signature::from_base64url(&manifest.provider_signature)?;

    let canonical_bytes = manifest_canonical_bytes(manifest)?;

    public_key.verify(&canonical_bytes, &signature)?;

    info!(
        provider = manifest.provider.display_name,
        "Manifest signature verified"
    );

    Ok(())
}

/// Produce the canonical JSON bytes for signing/verification.
///
/// This serializes the manifest to JSON, removes the `provider_signature` field,
/// then produces the canonical (sorted-keys, compact) form.
fn manifest_canonical_bytes(manifest: &ServiceManifest) -> Result<Vec<u8>, ManifestError> {
    let mut value = serde_json::to_value(manifest)?;

    if let serde_json::Value::Object(ref mut map) = value {
        map.remove("provider_signature");
    }

    let canonical = canonical_json(&value)?;
    Ok(canonical.into_bytes())
}

/// Sign a manifest with a key pair, returning the base64url-encoded signature.
pub fn sign_manifest(
    manifest: &ServiceManifest,
    keypair: &osp_crypto::KeyPair,
) -> Result<String, ManifestError> {
    let canonical_bytes = manifest_canonical_bytes(manifest)?;
    let signature = keypair.sign(&canonical_bytes);
    Ok(signature.to_base64url())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;
    use chrono::Utc;

    fn test_manifest(public_key: &str) -> ServiceManifest {
        ServiceManifest {
            osp_version: "1.0".to_string(),
            manifest_id: "test-001".to_string(),
            manifest_version: 1,
            published_at: Utc::now(),
            provider: Provider {
                provider_id: "test.example.com".to_string(),
                display_name: "Test Provider".to_string(),
                description: None,
                homepage_url: "https://test.example.com".to_string(),
                support_url: None,
                logo_url: None,
            },
            offerings: vec![ServiceOffering {
                offering_id: "test/db".to_string(),
                name: "Test DB".to_string(),
                description: "Test".to_string(),
                category: Category::Database,
                tags: None,
                tiers: vec![ServiceTier {
                    tier_id: "free".to_string(),
                    name: "Free".to_string(),
                    description: None,
                    price: Price {
                        amount: "0.00".to_string(),
                        currency: "USD".to_string(),
                        interval: BillingInterval::Monthly,
                        metered: None,
                        metered_dimensions: None,
                    },
                    limits: None,
                    features: None,
                    escrow_profile: None,
                    rate_limit: None,
                    accepted_payment_methods: None,
                    trust_tier_required: None,
                    auto_deprovision: None,
                    sla: None,
                }],
                regions: None,
                credentials_schema: serde_json::json!({}),
                configuration_schema: None,
                estimated_provision_seconds: None,
                fulfillment_proof_type: None,
                documentation_url: None,
                trust_tier_required: None,
            }],
            accepted_payment_methods: vec!["free".to_string()],
            trust_tier_required: None,
            endpoints: Endpoints {
                base_url: "https://test.example.com".to_string(),
                webhook_url: None,
                status_page_url: None,
            },
            extensions: None,
            provider_signature: String::new(),
            provider_public_key: public_key.to_string(),
        }
    }

    #[test]
    fn sign_and_verify() {
        let kp = osp_crypto::KeyPair::generate();
        let pub_b64 = kp.public_key().to_base64url();

        let mut manifest = test_manifest(&pub_b64);
        let sig = sign_manifest(&manifest, &kp).unwrap();
        manifest.provider_signature = sig;

        verify_manifest(&manifest).unwrap();
    }

    #[test]
    fn verify_fails_with_wrong_key() {
        let kp = osp_crypto::KeyPair::generate();
        let other_kp = osp_crypto::KeyPair::generate();
        let pub_b64 = other_kp.public_key().to_base64url();

        let mut manifest = test_manifest(&pub_b64);
        let sig = sign_manifest(&manifest, &kp).unwrap();
        manifest.provider_signature = sig;

        assert!(verify_manifest(&manifest).is_err());
    }
}
