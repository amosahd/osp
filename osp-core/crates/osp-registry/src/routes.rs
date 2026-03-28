use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use std::sync::Arc;

use crate::db::RegistryDb;
use crate::error::RegistryError;
use crate::models::{SearchQuery, SearchResponse};

pub type AppState = Arc<RegistryDb>;

/// POST /api/v1/manifests — submit a manifest
pub async fn submit_manifest(
    State(db): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, RegistryError> {
    let manifest: osp_manifest::ServiceManifest = serde_json::from_value(body.clone())?;

    // Verify signature
    let verified = osp_manifest::verify::verify_manifest(&manifest).is_ok();

    let domain = manifest
        .endpoints
        .base_url
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .split('/')
        .next()
        .unwrap_or("")
        .to_string();

    let manifest_json = serde_json::to_string(&manifest)?;

    db.upsert_manifest(
        &manifest.provider.provider_id,
        &manifest.provider.display_name,
        &domain,
        manifest.manifest_version,
        &manifest_json,
        verified,
    )?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "provider_id": manifest.provider.provider_id,
            "manifest_version": manifest.manifest_version,
            "signature_verified": verified,
        })),
    ))
}

/// GET /api/v1/manifests/:provider_id — get a manifest
pub async fn get_manifest(
    State(db): State<AppState>,
    Path(provider_id): Path<String>,
) -> Result<impl IntoResponse, RegistryError> {
    let entry = db.get_manifest(&provider_id)?;
    let manifest: serde_json::Value = serde_json::from_str(&entry.manifest_json)?;
    Ok(Json(manifest))
}

/// GET /api/v1/search — search manifests
pub async fn search_manifests(
    State(db): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<impl IntoResponse, RegistryError> {
    let (results, next_cursor, total_count) = db.search(&query)?;

    Ok(Json(SearchResponse {
        results,
        next_cursor,
        total_count,
    }))
}

/// DELETE /api/v1/manifests/:provider_id — remove a manifest
pub async fn delete_manifest(
    State(db): State<AppState>,
    Path(provider_id): Path<String>,
) -> Result<impl IntoResponse, RegistryError> {
    db.delete_manifest(&provider_id)?;
    Ok(StatusCode::NO_CONTENT)
}

/// GET /api/v1/reputation/:provider_id — get provider reputation
pub async fn get_reputation(
    State(db): State<AppState>,
    Path(provider_id): Path<String>,
) -> Result<impl IntoResponse, RegistryError> {
    let rep = db.get_reputation(&provider_id)?;
    Ok(Json(rep))
}

/// GET /health — health check
pub async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "osp-registry",
    }))
}
