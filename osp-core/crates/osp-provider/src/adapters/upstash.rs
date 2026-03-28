use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Upstash Redis/Kafka adapter (REST API).
pub struct UpstashAdapter {
    client: RestClient,
}

impl UpstashAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://api.upstash.com/v2"),
        }
    }

    pub fn with_credentials(email: &str, api_key: &str) -> Self {
        Self {
            client: RestClient::new("https://api.upstash.com/v2")
                .with_api_key(format!("{email}:{api_key}")),
        }
    }
}

impl Default for UpstashAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for UpstashAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "upstash.com".to_string(),
            display_name: "Upstash".to_string(),
            base_url: "https://api.upstash.com/v2".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let name = request.project_name.as_deref().unwrap_or("osp-redis");
        let region = request.region.as_deref().unwrap_or("us-east-1");

        let body = serde_json::json!({
            "name": name,
            "region": region,
            "tls": true,
        });

        let result = self.client.post("/redis/database", &body).await?;

        let db_id = result["database_id"].as_str().unwrap_or("unknown").to_string();
        let endpoint = result["endpoint"].as_str().unwrap_or("").to_string();
        let password = result["password"].as_str().unwrap_or("").to_string();
        let port = result["port"].as_u64().unwrap_or(6379);
        let rest_url = result["rest_url"].as_str().unwrap_or("").to_string();
        let rest_token = result["rest_token"].as_str().unwrap_or("").to_string();

        let credentials = serde_json::json!({
            "redis_url": format!("rediss://default:{password}@{endpoint}:{port}"),
            "host": endpoint,
            "port": port,
            "password": password,
            "rest_url": rest_url,
            "rest_token": rest_token,
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_upstash_{db_id}"),
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
            webhook_supported: None,
            region: Some(region.to_string()),
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some(format!("https://console.upstash.com/redis/{db_id}")),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let db_id = resource_id
            .strip_prefix("res_upstash_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.delete(&format!("/redis/database/{db_id}")).await?;
        Ok(())
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let db_id = resource_id
            .strip_prefix("res_upstash_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.get(&format!("/redis/database/{db_id}")).await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        self.status(resource_id).await
    }

    async fn rotate(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        Err(ProviderError::Unsupported(
            "Upstash does not support credential rotation".to_string(),
        ))
    }

    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let db_id = resource_id
            .strip_prefix("res_upstash_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.get(&format!("/redis/database/{db_id}/stats")).await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        match self.client.get("/redis/databases").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
