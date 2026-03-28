use axum::routing::{get, post};
use axum::Router;
use std::net::SocketAddr;
use std::path::Path;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::db::RegistryDb;
use crate::error::RegistryError;
use crate::routes;

/// Registry server configuration.
pub struct ServerConfig {
    pub bind_addr: SocketAddr,
    pub db_path: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            bind_addr: SocketAddr::from(([127, 0, 0, 1], 8080)),
            db_path: "osp-registry.db".to_string(),
        }
    }
}

/// Build the axum router.
pub fn build_router(db: Arc<RegistryDb>) -> Router {
    Router::new()
        .route("/health", get(routes::health))
        .route("/api/v1/manifests", post(routes::submit_manifest))
        .route(
            "/api/v1/manifests/{provider_id}",
            get(routes::get_manifest).delete(routes::delete_manifest),
        )
        .route("/api/v1/search", get(routes::search_manifests))
        .route(
            "/api/v1/reputation/{provider_id}",
            get(routes::get_reputation),
        )
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(db)
}

/// Start the registry HTTP server.
pub async fn start_server(config: ServerConfig) -> Result<(), RegistryError> {
    let db = RegistryDb::open(Path::new(&config.db_path))?;
    let db = Arc::new(db);

    let app = build_router(db);

    info!(addr = %config.bind_addr, "Starting OSP Registry server");

    let listener = tokio::net::TcpListener::bind(config.bind_addr)
        .await
        .map_err(|e| RegistryError::IoError(e))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| RegistryError::IoError(e))?;

    Ok(())
}
