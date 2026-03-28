use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Resend email adapter (REST API).
pub struct ResendAdapter {
    client: RestClient,
}

impl ResendAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://api.resend.com"),
        }
    }

    pub fn with_api_key(api_key: String) -> Self {
        Self {
            client: RestClient::new("https://api.resend.com").with_api_key(api_key),
        }
    }
}

impl Default for ResendAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for ResendAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "resend.com".to_string(),
            display_name: "Resend".to_string(),
            base_url: "https://api.resend.com".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let domain = request
            .configuration
            .as_ref()
            .and_then(|c| c.get("domain"))
            .and_then(|d| d.as_str())
            .unwrap_or("onboarding.resend.dev");

        // Create an API key for the agent
        let api_key_name = request
            .project_name
            .as_deref()
            .unwrap_or("osp-key");

        let body = serde_json::json!({
            "name": api_key_name,
            "permission": "full_access",
            "domain_id": domain,
        });

        let result = self.client.post("/api-keys", &body).await?;

        let key_id = result["id"].as_str().unwrap_or("unknown").to_string();
        let api_key = result["token"].as_str().unwrap_or("").to_string();

        let credentials = serde_json::json!({
            "api_key": api_key,
            "domain": domain,
            "smtp_host": "smtp.resend.com",
            "smtp_port": 465,
            "smtp_username": "resend",
            "smtp_password": api_key,
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_resend_{key_id}"),
            offering_id: request.offering_id.clone(),
            tier_id: request.tier_id.clone(),
            status: ProvisionStatus::Provisioned,
            credentials_bundle: Some(CredentialBundle {
                format: CredentialFormat::Plaintext,
                credentials: Some(credentials),
                encrypted_credentials: None,
                delivery_proof: None,
                rotation_supported: true,
                rotation_interval_hours: None,
                issued_at: Utc::now(),
                expires_at: None,
                scope: None,
                scope_description: None,
                scope_restrictions: None,
            }),
            estimated_ready_seconds: None,
            poll_url: None,
            webhook_supported: None,
            region: None,
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some("https://resend.com/api-keys".to_string()),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let key_id = resource_id
            .strip_prefix("res_resend_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.delete(&format!("/api-keys/{key_id}")).await?;
        Ok(())
    }

    async fn status(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        self.client.get("/api-keys").await
    }

    async fn credentials(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        Err(ProviderError::Unsupported(
            "Resend API keys cannot be retrieved after creation".to_string(),
        ))
    }

    async fn rotate(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        // Delete old key and create a new one
        let key_id = resource_id
            .strip_prefix("res_resend_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.delete(&format!("/api-keys/{key_id}")).await?;

        let body = serde_json::json!({
            "name": "osp-rotated-key",
            "permission": "full_access",
        });
        self.client.post("/api-keys", &body).await
    }

    async fn usage(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        Err(ProviderError::Unsupported(
            "usage reporting not available via Resend API".to_string(),
        ))
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        match self.client.get("/api-keys").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
