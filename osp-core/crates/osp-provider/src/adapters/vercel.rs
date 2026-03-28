use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Vercel adapter (REST API + OAuth).
pub struct VercelAdapter {
    client: RestClient,
}

impl VercelAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://api.vercel.com"),
        }
    }

    pub fn with_token(token: String) -> Self {
        Self {
            client: RestClient::new("https://api.vercel.com").with_api_key(token),
        }
    }
}

impl Default for VercelAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for VercelAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "vercel.com".to_string(),
            display_name: "Vercel".to_string(),
            base_url: "https://api.vercel.com".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let name = request.project_name.as_deref().unwrap_or("osp-project");

        let framework = request
            .configuration
            .as_ref()
            .and_then(|c| c.get("framework"))
            .and_then(|f| f.as_str())
            .unwrap_or("nextjs");

        let body = serde_json::json!({
            "name": name,
            "framework": framework,
        });

        let result = self.client.post("/v10/projects", &body).await?;

        let project_id = result["id"].as_str().unwrap_or("unknown").to_string();
        let project_name = result["name"].as_str().unwrap_or(name).to_string();

        let credentials = serde_json::json!({
            "project_id": project_id,
            "project_name": project_name,
            "deployment_url": format!("https://{project_name}.vercel.app"),
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_vercel_{project_id}"),
            offering_id: request.offering_id.clone(),
            tier_id: request.tier_id.clone(),
            status: ProvisionStatus::Provisioned,
            credentials_bundle: Some(CredentialBundle {
                format: CredentialFormat::Plaintext,
                credentials: Some(credentials),
                encrypted_credentials: None,
                delivery_proof: None,
                rotation_supported: false,
                rotation_interval_hours: None,
                issued_at: Utc::now(),
                expires_at: None,
                scope: None,
                scope_description: None,
                scope_restrictions: None,
            }),
            estimated_ready_seconds: None,
            poll_url: None,
            webhook_supported: Some(true),
            region: None,
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some(format!(
                "https://vercel.com/{project_name}"
            )),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_vercel_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .delete(&format!("/v10/projects/{project_id}"))
            .await?;
        Ok(())
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_vercel_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.get(&format!("/v10/projects/{project_id}")).await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_vercel_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!("/v10/projects/{project_id}/env"))
            .await
    }

    async fn rotate(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        Err(ProviderError::Unsupported(
            "Vercel does not support credential rotation".to_string(),
        ))
    }

    async fn usage(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        self.client.get("/v1/usage").await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        match self.client.get("/v2/user").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
