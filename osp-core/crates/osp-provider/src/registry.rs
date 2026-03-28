use std::collections::HashMap;
use std::sync::Arc;

use crate::error::ProviderError;
use crate::port::{AdapterInfo, ProviderPort};

/// Registry of provider adapters, keyed by provider_id.
pub struct AdapterRegistry {
    adapters: HashMap<String, Arc<dyn ProviderPort>>,
}

impl AdapterRegistry {
    pub fn new() -> Self {
        Self {
            adapters: HashMap::new(),
        }
    }

    /// Register a provider adapter.
    pub fn register(&mut self, adapter: Arc<dyn ProviderPort>) {
        let info = adapter.info();
        self.adapters.insert(info.provider_id.clone(), adapter);
    }

    /// Get an adapter by provider_id.
    pub fn get(&self, provider_id: &str) -> Result<&Arc<dyn ProviderPort>, ProviderError> {
        self.adapters
            .get(provider_id)
            .ok_or_else(|| ProviderError::AdapterNotFound(provider_id.to_string()))
    }

    /// List all registered adapters.
    pub fn list(&self) -> Vec<AdapterInfo> {
        self.adapters.values().map(|a| a.info()).collect()
    }

    /// Check if an adapter is registered.
    pub fn has(&self, provider_id: &str) -> bool {
        self.adapters.contains_key(provider_id)
    }

    /// Number of registered adapters.
    pub fn len(&self) -> usize {
        self.adapters.len()
    }

    /// Whether the registry is empty.
    pub fn is_empty(&self) -> bool {
        self.adapters.is_empty()
    }

    /// Register all built-in adapters.
    pub fn register_defaults(&mut self) {
        use crate::adapters::*;

        self.register(Arc::new(neon::NeonAdapter::new()));
        self.register(Arc::new(upstash::UpstashAdapter::new()));
        self.register(Arc::new(turso::TursoAdapter::new()));
        self.register(Arc::new(resend::ResendAdapter::new()));
        self.register(Arc::new(supabase::SupabaseAdapter::new()));
        self.register(Arc::new(vercel::VercelAdapter::new()));
        self.register(Arc::new(railway::RailwayAdapter::new()));
        self.register(Arc::new(posthog::PostHogAdapter::new()));
    }
}

impl Default for AdapterRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_defaults() {
        let mut registry = AdapterRegistry::new();
        registry.register_defaults();
        assert_eq!(registry.len(), 8);
        assert!(registry.has("neon.tech"));
        assert!(registry.has("upstash.com"));
        assert!(registry.has("turso.tech"));
        assert!(registry.has("resend.com"));
        assert!(registry.has("supabase.com"));
        assert!(registry.has("vercel.com"));
        assert!(registry.has("railway.app"));
        assert!(registry.has("posthog.com"));
    }
}
