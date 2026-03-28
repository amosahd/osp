use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// PostHog analytics adapter (REST API).
pub struct PostHogAdapter {
    client: RestClient,
}

impl PostHogAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://app.posthog.com/api"),
        }
    }

    pub fn with_api_key(api_key: String) -> Self {
        Self {
            client: RestClient::new("https://app.posthog.com/api").with_api_key(api_key),
        }
    }
}

impl Default for PostHogAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for PostHogAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "posthog.com".to_string(),
            display_name: "PostHog".to_string(),
            base_url: "https://app.posthog.com/api".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let name = request.project_name.as_deref().unwrap_or("OSP Project");

        // Create a new project (organization must already exist)
        let body = serde_json::json!({
            "name": name,
        });

        let result = self.client.post("/projects/", &body).await?;

        let project_id = result["id"].as_u64().unwrap_or(0);
        let api_token = result["api_token"].as_str().unwrap_or("").to_string();

        let credentials = serde_json::json!({
            "project_api_key": api_token,
            "host": "https://app.posthog.com",
            "project_id": project_id,
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_posthog_{project_id}"),
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
            webhook_supported: Some(false),
            region: None,
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some(format!(
                "https://app.posthog.com/project/{project_id}"
            )),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_posthog_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .delete(&format!("/projects/{project_id}/"))
            .await?;
        Ok(())
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_posthog_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!("/projects/{project_id}/"))
            .await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        // PostHog API token is available from the project endpoint
        self.status(resource_id).await
    }

    async fn rotate(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        Err(ProviderError::Unsupported(
            "PostHog does not support API key rotation via API".to_string(),
        ))
    }

    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_posthog_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!("/projects/{project_id}/billing/usage"))
            .await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        match self.client.get("/projects/").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
