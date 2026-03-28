use async_trait::async_trait;
use osp_manifest::types::{ProvisionRequest, ProvisionResponse};

use crate::error::ProviderError;

/// Health status of a provider.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HealthStatus {
    Healthy,
    Degraded { message: String },
    Unhealthy { message: String },
    Unknown,
}

/// Information about a provider adapter.
#[derive(Debug, Clone)]
pub struct AdapterInfo {
    pub provider_id: String,
    pub display_name: String,
    pub base_url: String,
    pub api_type: ApiType,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApiType {
    Rest,
    GraphQL,
}

/// The core trait that all provider adapters must implement.
///
/// Each adapter translates between OSP protocol objects and the provider's native API.
#[async_trait]
pub trait ProviderPort: Send + Sync {
    /// Adapter metadata.
    fn info(&self) -> AdapterInfo;

    /// Provision a new resource.
    async fn provision(&self, request: &ProvisionRequest) -> Result<ProvisionResponse, ProviderError>;

    /// Deprovision an existing resource.
    async fn deprovision(&self, resource_id: &str) -> Result<(), ProviderError>;

    /// Get the current status of a resource.
    async fn status(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError>;

    /// Retrieve credentials for a resource.
    async fn credentials(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError>;

    /// Rotate credentials for a resource.
    async fn rotate(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError>;

    /// Get usage data for a resource.
    async fn usage(&self, resource_id: &str) -> Result<serde_json::Value, ProviderError>;

    /// Check health of the provider.
    async fn health(&self) -> Result<HealthStatus, ProviderError>;

    /// Estimate cost for a provisioning request.
    async fn estimate(&self, request: &ProvisionRequest) -> Result<serde_json::Value, ProviderError> {
        let _ = request;
        Err(ProviderError::Unsupported("estimate not supported".to_string()))
    }
}
