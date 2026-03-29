use std::net::SocketAddr;

use anyhow::Result;
use osp_registry::server::ServerConfig;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid u16");

    let db_path = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "osp-registry.db".to_string())
        .trim_start_matches("sqlite://")
        .to_string();

    let config = ServerConfig {
        bind_addr: SocketAddr::from(([0, 0, 0, 0], port)),
        db_path,
    };

    osp_registry::start_server(config).await?;

    Ok(())
}
