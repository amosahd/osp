use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "osp",
    about = "Open Service Protocol — AI agent service provisioning",
    version,
    propagate_version = true
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,

    /// Verbose output
    #[arg(short, long, global = true)]
    pub verbose: bool,
}

#[derive(Subcommand)]
pub enum Command {
    /// Initialize a new OSP project
    Init {
        /// Project name
        #[arg(short, long)]
        name: Option<String>,
    },

    /// Discover available service providers
    Discover {
        /// Search query
        query: Option<String>,
        /// Filter by category
        #[arg(short, long)]
        category: Option<String>,
    },

    /// Show status of all provisioned services
    Status {
        /// Show detailed status
        #[arg(short, long)]
        detailed: bool,
    },

    /// Display provider LLM skills
    Skills {
        /// Provider name
        provider: String,
    },

    /// Provision a new service
    Provision {
        /// Offering ID (e.g., supabase/managed-postgres)
        offering: String,
        /// Tier ID
        #[arg(short, long, default_value = "free")]
        tier: String,
        /// Project name for the resource
        #[arg(short, long)]
        name: Option<String>,
        /// Region
        #[arg(short, long)]
        region: Option<String>,
    },

    /// Deprovision a service
    Deprovision {
        /// Resource ID
        resource_id: String,
        /// Skip confirmation
        #[arg(short = 'y', long)]
        yes: bool,
    },

    /// Upgrade a service tier
    Upgrade {
        /// Resource ID
        resource_id: String,
        /// Target tier ID
        #[arg(short, long)]
        tier: String,
    },

    /// Rotate credentials for a service
    Rotate {
        /// Resource ID
        resource_id: String,
    },

    /// Estimate cost for a service
    Estimate {
        /// Offering ID
        offering: String,
        /// Tier ID
        #[arg(short, long, default_value = "free")]
        tier: String,
    },

    /// Environment variable management
    Env {
        #[command(subcommand)]
        action: Option<EnvAction>,
        /// Output format
        #[arg(short, long, default_value = "dotenv")]
        format: String,
    },

    /// Set up project from clone to running
    Setup,

    /// Apply declarative configuration
    Apply {
        /// Config file path
        #[arg(short, long, default_value = "osp.yaml")]
        file: String,
        /// Plan only, don't apply
        #[arg(long)]
        plan_only: bool,
    },

    /// Detect configuration drift
    Drift,

    /// Join a team / organization
    Join {
        /// Team invite code or URL
        invite: String,
    },

    /// Import credentials from manual setup
    Import {
        /// Source format (dotenv, json, yaml)
        #[arg(short, long, default_value = "dotenv")]
        format: String,
        /// Source file path
        file: String,
    },

    /// Share a resource with a team member
    Share {
        /// Resource ID
        resource_id: String,
        /// Recipient email or ID
        recipient: String,
    },

    /// Full developer onboarding flow
    Onboard,

    /// Run conformance tests
    Conformance {
        /// Target provider URL
        target: String,
        /// Conformance level to test
        #[arg(short, long, default_value = "core")]
        level: String,
        /// Output report to file
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[derive(Subcommand)]
pub enum EnvAction {
    /// Pull env vars from vault to .env
    Pull {
        /// Output file
        #[arg(short, long, default_value = ".env")]
        output: String,
    },
    /// Push env vars to a platform
    Push {
        /// Target platform (vercel, railway, github)
        target: String,
    },
    /// Show diff between local and remote env
    Diff,
    /// Validate all env vars are present and valid
    Validate,
}
