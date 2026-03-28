use reqwest::Client;
use tracing::info;

use crate::error::ManifestError;
use crate::types::ServiceManifest;

/// Fetch a service manifest from a provider's well-known endpoint.
pub async fn fetch_manifest(domain: &str) -> Result<ServiceManifest, ManifestError> {
    fetch_manifest_from_url(&format!("https://{}/.well-known/osp.json", domain)).await
}

/// Fetch a service manifest from an arbitrary URL.
pub async fn fetch_manifest_from_url(url: &str) -> Result<ServiceManifest, ManifestError> {
    info!(url = url, "Fetching OSP manifest");

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client
        .get(url)
        .header("Accept", "application/json")
        .send()
        .await?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(ManifestError::NotFound {
            url: url.to_string(),
        });
    }

    let response = response.error_for_status()?;
    let manifest: ServiceManifest = response.json().await?;

    info!(
        provider = manifest.provider.display_name,
        version = manifest.manifest_version,
        "Manifest fetched successfully"
    );

    Ok(manifest)
}

/// Fetch and verify a manifest in one step.
pub async fn fetch_and_verify(domain: &str) -> Result<ServiceManifest, ManifestError> {
    let manifest = fetch_manifest(domain).await?;
    crate::verify::verify_manifest(&manifest)?;
    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn well_known_url_format() {
        let domain = "supabase.com";
        let expected = "https://supabase.com/.well-known/osp.json";
        assert_eq!(
            format!("https://{}/.well-known/osp.json", domain),
            expected
        );
    }
}
