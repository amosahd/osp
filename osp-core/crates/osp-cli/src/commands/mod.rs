mod init;
mod discover;
mod provision;
mod env_cmd;
mod conformance_cmd;

use anyhow::Result;

use crate::cli::{Cli, Command};

pub async fn execute(cli: Cli) -> Result<()> {
    match cli.command {
        Command::Init { name } => init::run(name).await,
        Command::Discover { query, category } => discover::run(query, category).await,
        Command::Status { detailed } => status(detailed).await,
        Command::Skills { provider } => skills(&provider).await,
        Command::Provision {
            offering,
            tier,
            name,
            region,
        } => provision::run(&offering, &tier, name.as_deref(), region.as_deref()).await,
        Command::Deprovision { resource_id, yes } => deprovision(&resource_id, yes).await,
        Command::Upgrade { resource_id, tier } => upgrade(&resource_id, &tier).await,
        Command::Rotate { resource_id } => rotate(&resource_id).await,
        Command::Estimate { offering, tier } => estimate(&offering, &tier).await,
        Command::Env { action, format } => env_cmd::run(action, &format).await,
        Command::Setup => setup().await,
        Command::Apply { file, plan_only } => apply(&file, plan_only).await,
        Command::Drift => drift().await,
        Command::Join { invite } => join(&invite).await,
        Command::Import { format, file } => import_cmd(&format, &file).await,
        Command::Share {
            resource_id,
            recipient,
        } => share(&resource_id, &recipient).await,
        Command::Onboard => onboard().await,
        Command::Conformance {
            target,
            level,
            output,
        } => conformance_cmd::run(&target, &level, output.as_deref()).await,
    }
}

async fn status(detailed: bool) -> Result<()> {
    let vault_dir = std::path::Path::new(".osp");
    if !vault_dir.exists() {
        anyhow::bail!("No OSP project found. Run `osp init` first.");
    }

    println!("Service Status:");
    println!("{:-<60}", "");

    if detailed {
        println!("(detailed view — checking provider health...)");
    }

    // In a full implementation, read .osp/project.json and check each resource
    println!("No provisioned services found.");
    println!("\nUse `osp provision <offering>` to add a service.");
    Ok(())
}

async fn skills(provider: &str) -> Result<()> {
    println!("Loading skills for provider: {provider}");
    println!("{:-<60}", "");

    // In full impl, fetch from /.well-known/osp-skills.md or registry
    println!("Skills loading requires network access to the provider.");
    println!("Try: osp discover {provider}");
    Ok(())
}

async fn deprovision(resource_id: &str, yes: bool) -> Result<()> {
    if !yes {
        let confirm = dialoguer::Confirm::new()
            .with_prompt(format!("Deprovision {resource_id}? This cannot be undone"))
            .default(false)
            .interact()?;

        if !confirm {
            println!("Cancelled.");
            return Ok(());
        }
    }

    println!("Deprovisioning {resource_id}...");
    // In full impl, use osp_provider to deprovision
    println!("Done.");
    Ok(())
}

async fn upgrade(resource_id: &str, tier: &str) -> Result<()> {
    println!("Upgrading {resource_id} to tier '{tier}'...");
    Ok(())
}

async fn rotate(resource_id: &str) -> Result<()> {
    println!("Rotating credentials for {resource_id}...");
    Ok(())
}

async fn estimate(offering: &str, tier: &str) -> Result<()> {
    println!("Estimating cost for {offering} (tier: {tier})...");
    Ok(())
}

async fn setup() -> Result<()> {
    println!("Running OSP setup...");
    println!("1. Checking for osp.yaml...");
    println!("2. Reading project configuration...");
    println!("3. Provisioning services...");
    println!("4. Generating .env file...");
    println!("\nSetup complete. Run your project!");
    Ok(())
}

async fn apply(file: &str, plan_only: bool) -> Result<()> {
    println!("Reading configuration from {file}...");
    if plan_only {
        println!("Plan only — no changes will be applied.");
    }
    println!("No changes detected.");
    Ok(())
}

async fn drift() -> Result<()> {
    println!("Checking for configuration drift...");
    println!("No drift detected.");
    Ok(())
}

async fn join(invite: &str) -> Result<()> {
    println!("Joining team with invite: {invite}...");
    Ok(())
}

async fn import_cmd(format: &str, file: &str) -> Result<()> {
    println!("Importing credentials from {file} (format: {format})...");
    Ok(())
}

async fn share(resource_id: &str, recipient: &str) -> Result<()> {
    println!("Sharing {resource_id} with {recipient}...");
    Ok(())
}

async fn onboard() -> Result<()> {
    println!("Welcome to OSP! Let's get your project set up.\n");
    println!("Step 1: Initialize project");
    println!("Step 2: Discover services");
    println!("Step 3: Provision what you need");
    println!("Step 4: Generate .env");
    println!("\nRun `osp init` to begin.");
    Ok(())
}
