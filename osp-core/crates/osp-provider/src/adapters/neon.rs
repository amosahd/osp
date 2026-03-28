use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Neon serverless Postgres adapter (REST API).
pub struct NeonAdapter {
    client: RestClient,
}

impl NeonAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://console.neon.tech/api/v2"),
        }
    }

    pub fn with_api_key(api_key: String) -> Self {
        Self {
            client: RestClient::new("https://console.neon.tech/api/v2").with_api_key(api_key),
        }
    }
}

impl Default for NeonAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for NeonAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "neon.tech".to_string(),
            display_name: "Neon".to_string(),
            base_url: "https://console.neon.tech/api/v2".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let project_name = request
            .project_name
            .as_deref()
            .unwrap_or("osp-project");

        let body = serde_json::json!({
            "project": {
                "name": project_name,
                "pg_version": request.configuration
                    .as_ref()
                    .and_then(|c| c.get("postgres_version"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("17"),
            }
        });

        let result = self.client.post("/projects", &body).await?;

        let project_id = result["project"]["id"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        let connection_uri = result["connection_uris"]
            .as_array()
            .and_then(|uris| uris.first())
            .and_then(|u| u["connection_uri"].as_str())
            .unwrap_or("")
            .to_string();

        let host = result["project"]["databases"]
            .as_array()
            .and_then(|dbs| dbs.first())
            .and_then(|db| db["hostname"].as_str())
            .unwrap_or("")
            .to_string();

        let credentials = serde_json::json!({
            "connection_uri": connection_uri,
            "host": host,
            "port": 5432,
            "database": "neondb",
            "username": result["roles"].as_array()
                .and_then(|r| r.first())
                .and_then(|r| r["name"].as_str())
                .unwrap_or("neondb_owner"),
            "password": result["roles"].as_array()
                .and_then(|r| r.first())
                .and_then(|r| r["password"].as_str())
                .unwrap_or(""),
            "ssl_mode": "require"
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_neon_{project_id}"),
            offering_id: request.offering_id.clone(),
            tier_id: request.tier_id.clone(),
            status: ProvisionStatus::Provisioned,
            credentials_bundle: Some(CredentialBundle {
                format: CredentialFormat::Plaintext,
                credentials: Some(credentials),
                encrypted_credentials: None,
                delivery_proof: None,
                rotation_supported: true,
                rotation_interval_hours: Some(720),
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
            dashboard_url: Some(format!(
                "https://console.neon.tech/app/projects/{project_id}"
            )),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_neon_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        self.client
            .delete(&format!("/projects/{project_id}"))
            .await?;
        Ok(())
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_neon_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        self.client.get(&format!("/projects/{project_id}")).await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_neon_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        self.client
            .get(&format!("/projects/{project_id}/connection_uri"))
            .await
    }

    async fn rotate(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_neon_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        let branches = self
            .client
            .get(&format!("/projects/{project_id}/branches"))
            .await?;

        let branch_id = branches["branches"]
            .as_array()
            .and_then(|b| b.first())
            .and_then(|b| b["id"].as_str())
            .ok_or_else(|| ProviderError::Other("no branch found".to_string()))?;

        let roles = self
            .client
            .get(&format!(
                "/projects/{project_id}/branches/{branch_id}/roles"
            ))
            .await?;

        let role_name = roles["roles"]
            .as_array()
            .and_then(|r| r.first())
            .and_then(|r| r["name"].as_str())
            .ok_or_else(|| ProviderError::Other("no role found".to_string()))?;

        self.client
            .post(
                &format!(
                    "/projects/{project_id}/branches/{branch_id}/roles/{role_name}/reset_password"
                ),
                &serde_json::json!({}),
            )
            .await
    }

    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_neon_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        self.client
            .get(&format!("/projects/{project_id}/consumption"))
            .await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        // Neon doesn't have a public health endpoint; we probe /projects as a liveness check
        match self.client.get("/projects").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => {
                // 401 means the API is reachable but we're not authenticated — still healthy
                Ok(HealthStatus::Healthy)
            }
            Err(e) => Ok(HealthStatus::Unhealthy {
                message: e.to_string(),
            }),
        }
    }
}
