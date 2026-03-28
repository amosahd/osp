use anyhow::Result;

pub async fn run(
    offering: &str,
    tier: &str,
    name: Option<&str>,
    region: Option<&str>,
) -> Result<()> {
    let spinner = indicatif::ProgressBar::new_spinner();
    spinner.set_message(format!("Provisioning {offering} (tier: {tier})..."));
    spinner.enable_steady_tick(std::time::Duration::from_millis(100));

    // Parse offering_id to find provider
    let provider_id = offering
        .split('/')
        .next()
        .unwrap_or(offering);

    // Build a registry with defaults
    let mut registry = osp_provider::AdapterRegistry::new();
    registry.register_defaults();

    // Map common names to provider IDs
    let resolved_provider = match provider_id {
        "neon" => "neon.tech",
        "upstash" => "upstash.com",
        "turso" => "turso.tech",
        "resend" => "resend.com",
        "supabase" => "supabase.com",
        "vercel" => "vercel.com",
        "railway" => "railway.app",
        "posthog" => "posthog.com",
        other => other,
    };

    let adapter = registry.get(resolved_provider)?;

    let request = osp_manifest::ProvisionRequest {
        offering_id: offering.to_string(),
        tier_id: tier.to_string(),
        project_name: name.map(|s| s.to_string()),
        region: region.map(|s| s.to_string()),
        configuration: None,
        payment_method: "free".to_string(),
        payment_proof: None,
        agent_public_key: None,
        nonce: uuid::Uuid::new_v4().to_string(),
        idempotency_key: None,
        webhook_url: None,
        tier_change: None,
        principal_id: None,
        agent_attestation: None,
        metadata: None,
    };

    match adapter.provision(&request).await {
        Ok(response) => {
            spinner.finish_with_message("Done!");
            println!("\nProvisioned successfully!");
            println!("  Resource ID: {}", response.resource_id);
            println!("  Status: {:?}", response.status);
            if let Some(ref region) = response.region {
                println!("  Region: {region}");
            }
            if let Some(ref url) = response.dashboard_url {
                println!("  Dashboard: {url}");
            }
        }
        Err(e) => {
            spinner.finish_with_message("Failed");
            anyhow::bail!("Provisioning failed: {e}");
        }
    }

    Ok(())
}
