use async_trait::async_trait;
use chrono::Utc;
use osp_manifest::types::{
    CredentialBundle, CredentialFormat, ProvisionRequest, ProvisionResponse, ProvisionStatus,
};

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ApiType, HealthStatus, ProviderPort};

use super::rest_client::RestClient;

/// Railway adapter (GraphQL API + OAuth).
pub struct RailwayAdapter {
    client: RestClient,
}

impl RailwayAdapter {
    pub fn new() -> Self {
        Self {
            client: RestClient::new("https://backboard.railway.app/graphql/v2"),
        }
    }

    pub fn with_token(token: String) -> Self {
        Self {
            client: RestClient::new("https://backboard.railway.app/graphql/v2")
                .with_api_key(token),
        }
    }

    async fn graphql(&self, query: &str, variables: serde_json::Value) -> Result<serde_json::Value, ProviderError> {
        let body = serde_json::json!({
            "query": query,
            "variables": variables,
        });
        let result = self.client.post("", &body).await?;
        if let Some(errors) = result.get("errors") {
            return Err(ProviderError::ApiError {
                status: 400,
                message: errors.to_string(),
            });
        }
        Ok(result.get("data").cloned().unwrap_or(serde_json::Value::Null))
    }
}

impl Default for RailwayAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderPort for RailwayAdapter {
    fn info(&self) -> AdapterInfo {
        AdapterInfo {
            provider_id: "railway.app".to_string(),
            display_name: "Railway".to_string(),
            base_url: "https://backboard.railway.app/graphql/v2".to_string(),
            api_type: ApiType::GraphQL,
        }
    }

    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError> {
        let name = request.project_name.as_deref().unwrap_or("osp-project");

        // Create project
        let query = r#"
            mutation projectCreate($input: ProjectCreateInput!) {
                projectCreate(input: $input) {
                    id
                    name
                }
            }
        "#;

        let result = self
            .graphql(
                query,
                serde_json::json!({
                    "input": {
                        "name": name,
                    }
                }),
            )
            .await?;

        let project_id = result["projectCreate"]["id"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        // If this is a database offering, create a Postgres plugin
        let is_database = request.offering_id.contains("postgres")
            || request.offering_id.contains("database");

        let credentials = if is_database {
            let plugin_query = r#"
                mutation pluginCreate($input: PluginCreateInput!) {
                    pluginCreate(input: $input) {
                        id
                    }
                }
            "#;

            let _plugin_result = self
                .graphql(
                    plugin_query,
                    serde_json::json!({
                        "input": {
                            "projectId": project_id,
                            "name": "postgresql",
                        }
                    }),
                )
                .await?;

            serde_json::json!({
                "project_id": project_id,
                "type": "postgres",
                "note": "Connection details available in Railway dashboard after provisioning completes",
            })
        } else {
            serde_json::json!({
                "project_id": project_id,
            })
        };

        Ok(ProvisionResponse {
            resource_id: format!("res_railway_{project_id}"),
            offering_id: request.offering_id.clone(),
            tier_id: request.tier_id.clone(),
            status: ProvisionStatus::Provisioning,
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
            estimated_ready_seconds: Some(30),
            poll_url: None,
            webhook_supported: Some(false),
            region: request.region.clone(),
            created_at: Utc::now(),
            expires_at: None,
            dashboard_url: Some(format!(
                "https://railway.app/project/{project_id}"
            )),
            error: None,
        })
    }

    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_railway_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        let query = r#"
            mutation projectDelete($id: String!) {
                projectDelete(id: $id)
            }
        "#;
        self.graphql(query, serde_json::json!({"id": project_id}))
            .await?;
        Ok(())
    }

    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_railway_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        let query = r#"
            query project($id: String!) {
                project(id: $id) {
                    id
                    name
                    services { edges { node { id name } } }
                    environments { edges { node { id name } } }
                }
            }
        "#;
        self.graphql(query, serde_json::json!({"id": project_id}))
            .await
    }

    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_railway_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        let query = r#"
            query variables($projectId: String!) {
                variables(projectId: $projectId)
            }
        "#;
        self.graphql(query, serde_json::json!({"projectId": project_id}))
            .await
    }

    async fn rotate(&self, _resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        Err(ProviderError::Unsupported(
            "Railway does not support credential rotation via API".to_string(),
        ))
    }

    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError> {
        let project_id = resource_id
            .strip_prefix("res_railway_")
            .ok_or_else(|| ProviderError::NotFound(resource_id.to_string()))?;

        let query = r#"
            query projectUsage($id: String!) {
                project(id: $id) {
                    usage { currentUsage estimatedUsage }
                }
            }
        "#;
        self.graphql(query, serde_json::json!({"id": project_id}))
            .await
    }

    async fn health(&self) -> Result<HealthStatus, ProviderError> {
        let query = "query { me { id } }";
        match self.graphql(query, serde_json::json!({})).await {
            Ok(_) => Ok(HealthStatus::Healthy),
            Err(ProviderError::ApiError { status: 401, .. }) => Ok(HealthStatus::Healthy),
            Err(e) => Ok(HealthStatus::Unhealthy { message: e.to_string() }),
        }
    }
}
