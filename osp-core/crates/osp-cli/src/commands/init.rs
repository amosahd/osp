use anyhow::Result;
use std::path::Path;

pub async fn run(name: Option<String>) -> Result<()> {
    let project_name = match name {
        Some(n) => n,
        None => {
            dialoguer::Input::<String>::new()
                .with_prompt("Project name")
                .default(
                    std::env::current_dir()?
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("my-project")
                        .to_string(),
                )
                .interact_text()?
        }
    };

    let osp_dir = Path::new(".osp");
    if osp_dir.exists() {
        anyhow::bail!("OSP project already initialized in this directory.");
    }

    std::fs::create_dir_all(osp_dir)?;

    // Generate vault key
    let vault_key = osp_vault::store::generate_vault_key();

    // Initialize vault
    let _vault = osp_vault::Vault::init(osp_dir, vault_key)?;

    // Create project config
    let project_config = serde_json::json!({
        "name": project_name,
        "osp_version": "1.0",
        "created_at": chrono::Utc::now().to_rfc3339(),
        "services": [],
    });

    let config_path = osp_dir.join("project.json");
    std::fs::write(&config_path, serde_json::to_string_pretty(&project_config)?)?;

    // Detect framework
    let framework = osp_vault::env::Framework::detect(Path::new("."));

    println!("Initialized OSP project: {project_name}");
    println!("  Framework detected: {framework:?}");
    println!("  Vault created: .osp/vault.json");
    println!("  Config: .osp/project.json");
    println!();
    println!("Next steps:");
    println!("  osp discover          — find services");
    println!("  osp provision <svc>   — add a service");
    println!("  osp env               — generate .env");

    // Try to store vault key in system keyring
    match osp_vault::store::store_key_in_keyring("osp", &vault_key) {
        Ok(()) => println!("\n  Vault key stored in system keychain."),
        Err(_) => {
            let key_b64 = osp_crypto::base64url_encode(&vault_key);
            println!("\n  Vault key (save this securely): {key_b64}");
        }
    }

    Ok(())
}
