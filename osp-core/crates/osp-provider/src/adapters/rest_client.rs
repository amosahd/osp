use reqwest::{Client, Response};
use serde_json::Value;
use std::time::Duration;

use crate::error::ProviderError;

/// Shared REST client for provider adapters.
pub struct RestClient {
    client: Client,
    base_url: String,
    api_key: Option<String>,
}

impl RestClient {
    pub fn new(base_url: &str) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        Self {
            client,
            base_url: base_url.to_string(),
            api_key: None,
        }
    }

    pub fn with_api_key(mut self, key: String) -> Self {
        self.api_key = Some(key);
        self
    }

    pub async fn get(&self, path: &str) -> Result<Value, ProviderError> {
        let url = format!("{}{}", self.base_url, path);
        let mut req = self.client.get(&url);
        if let Some(ref key) = self.api_key {
            req = req.bearer_auth(key);
        }
        let resp = req.send().await?;
        self.handle_response(resp).await
    }

    pub async fn post(&self, path: &str, body: &Value) -> Result<Value, ProviderError> {
        let url = format!("{}{}", self.base_url, path);
        let mut req = self.client.post(&url).json(body);
        if let Some(ref key) = self.api_key {
            req = req.bearer_auth(key);
        }
        let resp = req.send().await?;
        self.handle_response(resp).await
    }

    pub async fn delete(&self, path: &str) -> Result<Value, ProviderError> {
        let url = format!("{}{}", self.base_url, path);
        let mut req = self.client.delete(&url);
        if let Some(ref key) = self.api_key {
            req = req.bearer_auth(key);
        }
        let resp = req.send().await?;
        self.handle_response(resp).await
    }

    async fn handle_response(&self, resp: Response) -> Result<Value, ProviderError> {
        let status = resp.status().as_u16();
        if status >= 400 {
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::ApiError {
                status,
                message: body,
            });
        }
        let body = resp.text().await?;
        if body.is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&body).map_err(ProviderError::from)
    }
}
