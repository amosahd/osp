use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Turso LibSQL adapter (REST API).
pub struct TursoAdapter {
    client: RestClient,
    org_name: String,
}

impl TursoAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://api.turso.tech/v1"),
            org_name: String::new(),
        }
    }

    pub fn with_api_token(token: String, org_name: String) -> Self {
        Self {
            client: RestClient::new("https://api.turso.tech/v1").with_api_key(token),
            org_name,
        }
    }
}

impl Default for TursoAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for TursoAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "turso.tech".to_string(),
            display_name: "Turso".to_string(),
            base_url: "https://api.turso.tech/v1".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let db_name = request.project_name.as_deref().unwrap_or("osp-db");
        let group = request
            .configuration
            .as_ref()
            .and_then(|c| c.get("group"))
            .and_then(|g| g.as_str())
            .unwrap_or("default");

        let body = serde_json::json!({
            "name": db_name,
            "group": group,
        });

        let result = self
            .client
            .post(&format!("/organizations/{}/databases", self.org_name), &body)
            .await?;

        let db_id = result["database"]["DbId"].as_str().unwrap_or("unknown").to_string();
        let hostname = result["database"]["Hostname"].as_str().unwrap_or("").to_string();

        // Create an auth token for the database
        let token_result = self
            .client
            .post(
                &format!(
                    "/organizations/{}/databases/{db_name}/auth/tokens",
                    self.org_name
                ),
                &serde_json::json!({}),
            )
            .await?;

        let auth_token = token_result["jwt"].as_str().unwrap_or("").to_string();

        let credentials = serde_json::json!({
            "url": format!("libsql://{hostname}"),
            "auth_token": auth_token,
            "hostname": hostname,
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_turso_{db_id}"),
            offering_id: request.offering_id.clone(),
            tier_id: request.tier_id.clone(),
            status: ProvisionStatus::Provisioned,
            credentials_bundle: Some(CredentialBundle {
                format: CredentialFormat::Plaintext,
                credentials: Some(credentials),
                encrypted_credentials: None,
                delivery_proof: None,
                rotation_supported: true,
                rotation_interval_hours: Some(2160),
                issued_at: Utc::now(),
                expires_at: None,
                scope: None,
                scope_description: None,
                scope_restrictions: None,
            }),
            estimated_ready_seconds: None,
            poll_url: None,
            webhook_supported: None,
            region: request.region.clone(),
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some(format!("https://turso.tech/app/{}/{db_name}", self.org_name)),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let _db_id = resource_id
            .strip_prefix("res_turso_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        // Turso API uses database name, not ID, for deletion. In production
        // we'd store this mapping. For now, return unsupported.
        Err(ProviderError::Unsupported(
            "deprovision requires database name mapping".to_string(),
        ))
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let db_id = resource_id
            .strip_prefix("res_turso_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!("/organizations/{}/databases/{db_id}", self.org_name))
            .await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        self.status(resource_id).await
    }

    async fn rotate(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let db_id = resource_id
            .strip_prefix("res_turso_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .post(
                &format!(
                    "/organizations/{}/databases/{db_id}/auth/tokens",
                    self.org_name
                ),
                &serde_json::json!({}),
            )
            .await
    }

    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let db_id = resource_id
            .strip_prefix("res_turso_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!(
                "/organizations/{}/databases/{db_id}/usage",
                self.org_name
            ))
            .await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        match self.client.get("/organizations").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
