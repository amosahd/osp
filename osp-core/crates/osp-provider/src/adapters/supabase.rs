use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Supabase adapter (Management API + OAuth).
pub struct SupabaseAdapter {
    client: RestClient,
}

impl SupabaseAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://api.supabase.com/v1"),
        }
    }

    pub fn with_access_token(token: String) -> Self {
        Self {
            client: RestClient::new("https://api.supabase.com/v1").with_api_key(token),
        }
    }
}

impl Default for SupabaseAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for SupabaseAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "supabase.com".to_string(),
            display_name: "Supabase".to_string(),
            base_url: "https://api.supabase.com/v1".to_string(),
            api_type: ApiType::Rest,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let name = request.project_name.as_deref().unwrap_or("osp-project");
        let region = request.region.as_deref().unwrap_or("us-east-1");

        let db_pass = uuid::Uuid::new_v4().to_string();

        let body = serde_json::json!({
            "name": name,
            "organization_id": "",
            "plan": match request.tier_id.as_str() {
                "free" => "free",
                "pro" => "pro",
                _ => "free",
            },
            "region": region,
            "db_pass": db_pass,
        });

        let result = self.client.post("/projects", &body).await?;

        let project_id = result["id"].as_str().unwrap_or("unknown").to_string();
        let project_ref = result["ref"].as_str().unwrap_or(&project_id).to_string();

        let credentials = serde_json::json!({
            "connection_uri": format!(
                "postgresql://postgres:{db_pass}@db.{project_ref}.supabase.co:5432/postgres"
            ),
            "host": format!("db.{project_ref}.supabase.co"),
            "port": 5432,
            "database": "postgres",
            "username": "postgres",
            "password": db_pass,
            "ssl_mode": "require",
            "supabase_url": format!("https://{project_ref}.supabase.co"),
            "anon_key": result["anon_key"].as_str().unwrap_or(""),
            "service_role_key": result["service_role_key"].as_str().unwrap_or(""),
        });

        Ok(ProvisionResponse {
            resource_id: format!("res_supa_{project_ref}"),
            offering_id: request.offering_id.clone(),
            tier_id: request.tier_id.clone(),
            status: ProvisionStatus::Provisioning,
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
            estimated_ready_seconds: Some(60),
            poll_url: Some(format!(
                "https://api.supabase.com/v1/projects/{project_ref}"
            )),
            webhook_supported: Some(false),
            region: Some(region.to_string()),
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some(format!(
                "https://app.supabase.com/project/{project_ref}"
            )),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let project_ref = resource_id
            .strip_prefix("res_supa_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .delete(&format!("/projects/{project_ref}"))
            .await?;
        Ok(())
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_ref = resource_id
            .strip_prefix("res_supa_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client.get(&format!("/projects/{project_ref}")).await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_ref = resource_id
            .strip_prefix("res_supa_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!("/projects/{project_ref}/api-keys"))
            .await
    }

    async fn rotate(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_ref = resource_id
            .strip_prefix("res_supa_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .post(
                &format!("/projects/{project_ref}/api-keys/rotate"),
                &serde_json::json!({}),
            )
            .await
    }

    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_ref = resource_id
            .strip_prefix("res_supa_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;
        self.client
            .get(&format!("/projects/{project_ref}/usage"))
            .await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        match self.client.get("/projects").await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
