use anyhow::Result;
use clap::Parser;

mod cli;
mod commands;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cli = cli::Cli::parse();
    commands::execute(cli).await
}
