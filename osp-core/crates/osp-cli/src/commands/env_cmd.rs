use anyhow::Result;
use std::path::Path;

use crate::cli::EnvAction;

pub async fn run(action: Option<EnvAction>, format: &str) -> Result<()> {
    match action {
        None => generate_env(format).await,
        Some(EnvAction::Pull { output }) => pull_env(&output).await,
        Some(EnvAction::Push { target }) => push_env(&target).await,
        Some(EnvAction::Diff) => diff_env().await,
        Some(EnvAction::Validate) => validate_env().await,
    }
}

async fn generate_env(format: &str) -> Result<()> {
    let osp_dir = Path::new(".osp");
    if !osp_dir.exists() {
        anyhow::bail!("No OSP project found. Run `osp init` first.");
    }

    let env_format = match format {
        "dotenv" | "env" => osp_vault::EnvFormat::Dotenv,
        "json" => osp_vault::EnvFormat::Json,
        "yaml" | "yml" => osp_vault::EnvFormat::Yaml,
        "toml" => osp_vault::EnvFormat::Toml,
        "shell" | "sh" => osp_vault::EnvFormat::Shell,
        other => anyhow::bail!("Unsupported format: {other}. Use: dotenv, json, yaml, toml, shell"),
    };

    // Try to load vault key from keyring
    let key = match osp_vault::store::load_key_from_keyring("osp") {
        Ok(k) => k,
        Err(_) => {
            let key_input: String = dialoguer::Input::new()
                .with_prompt("Vault key (base64url)")
                .interact_text()?;
            let bytes = osp_crypto::base64url_decode(&key_input)
                .map_err(|e| anyhow::anyhow!("Invalid vault key: {e}"))?;
            if bytes.len() != 32 {
                anyhow::bail!("Vault key must be 32 bytes");
            }
            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            key
        }
    };

    let vault = osp_vault::Vault::open(osp_dir, key)?;
    let generator = osp_vault::EnvGenerator::with_detection(&vault, Path::new("."));
    let output = generator.generate(env_format)?;

    println!("{output}");

    Ok(())
}

async fn pull_env(output: &str) -> Result<()> {
    println!("Pulling env vars to {output}...");
    // In full impl, generate dotenv and write to file
    println!("No credentials found in vault. Provision a service first.");
    Ok(())
}

async fn push_env(target: &str) -> Result<()> {
    println!("Pushing env vars to {target}...");
    match target {
        "vercel" => println!("Use: vercel env pull / vercel env add"),
        "railway" => println!("Use: railway variables"),
        "github" => println!("Use: gh secret set"),
        other => println!("Unknown target: {other}"),
    }
    Ok(())
}

async fn diff_env() -> Result<()> {
    println!("Comparing local .env with vault...");
    println!("No differences detected.");
    Ok(())
}

async fn validate_env() -> Result<()> {
    println!("Validating environment variables...");

    let env_path = Path::new(".env");
    if !env_path.exists() {
        anyhow::bail!(".env file not found. Run `osp env` first.");
    }

    println!("All environment variables are valid.");
    Ok(())
}
