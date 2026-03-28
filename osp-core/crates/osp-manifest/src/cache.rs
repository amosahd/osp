use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{DateTime, Duration, Utc};
use sha2::{Digest, Sha256};
use tracing::debug;

use crate::error::ManifestError;
use crate::types::ServiceManifest;

/// In-memory + disk cache for fetched manifests.
pub struct ManifestCache {
    memory: Mutex<HashMap<String, CacheEntry>>,
    cache_dir: PathBuf,
    max_age: Duration,
}

struct CacheEntry {
    manifest: ServiceManifest,
    fetched_at: DateTime<Utc>,
    etag: Option<String>,
}

impl ManifestCache {
    /// Create a new cache with the given directory and max age.
    pub fn new(cache_dir: PathBuf, max_age_secs: i64) -> Self {
        Self {
            memory: Mutex::new(HashMap::new()),
            cache_dir,
            max_age: Duration::seconds(max_age_secs),
        }
    }

    /// Create a cache using the default OSP cache directory.
    pub fn default_cache() -> Result<Self, ManifestError> {
        let cache_dir = directories::ProjectDirs::from("com", "osp", "osp")
            .map(|dirs: directories::ProjectDirs| dirs.cache_dir().to_path_buf())
            .unwrap_or_else(|| PathBuf::from(".osp/cache"));

        std::fs::create_dir_all(&cache_dir)?;

        Ok(Self::new(cache_dir, 3600)) // 1 hour default
    }

    /// Get a manifest from cache, returning None if expired or missing.
    pub fn get(&self, domain: &str) -> Option<ServiceManifest> {
        let cache = self.memory.lock().ok()?;
        let entry = cache.get(domain)?;

        if Utc::now() - entry.fetched_at > self.max_age {
            debug!(domain = domain, "Cache entry expired");
            return None;
        }

        debug!(domain = domain, "Cache hit");
        Some(entry.manifest.clone())
    }

    /// Store a manifest in both memory and disk cache.
    pub fn put(
        &self,
        domain: &str,
        manifest: ServiceManifest,
        etag: Option<String>,
    ) -> Result<(), ManifestError> {
        // Write to disk
        let disk_path = self.disk_path(domain);
        let json = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(&disk_path, json)?;

        // Write to memory
        if let Ok(mut cache) = self.memory.lock() {
            cache.insert(
                domain.to_string(),
                CacheEntry {
                    manifest,
                    fetched_at: Utc::now(),
                    etag,
                },
            );
        }

        debug!(domain = domain, "Cached manifest");
        Ok(())
    }

    /// Get the cached ETag for conditional requests.
    pub fn etag(&self, domain: &str) -> Option<String> {
        let cache = self.memory.lock().ok()?;
        cache.get(domain)?.etag.clone()
    }

    /// Try to load from disk if not in memory.
    pub fn load_from_disk(&self, domain: &str) -> Option<ServiceManifest> {
        let disk_path = self.disk_path(domain);
        if !disk_path.exists() {
            return None;
        }

        let json = std::fs::read_to_string(&disk_path).ok()?;
        let manifest: ServiceManifest = serde_json::from_str(&json).ok()?;

        debug!(domain = domain, "Loaded manifest from disk cache");
        Some(manifest)
    }

    /// Invalidate a cached manifest.
    pub fn invalidate(&self, domain: &str) {
        if let Ok(mut cache) = self.memory.lock() {
            cache.remove(domain);
        }
        let disk_path = self.disk_path(domain);
        let _ = std::fs::remove_file(disk_path);
    }

    fn disk_path(&self, domain: &str) -> PathBuf {
        let hash = Sha256::digest(domain.as_bytes());
        let filename = format!("{}.json", hex::encode(&hash[..8]));
        self.cache_dir.join(filename)
    }
}

impl Default for ManifestCache {
    fn default() -> Self {
        Self::new(PathBuf::from(".osp/cache"), 3600)
    }
}

/// Check if a manifest has a newer version than a cached one.
pub fn is_newer(cached: &ServiceManifest, fetched: &ServiceManifest) -> bool {
    fetched.manifest_version > cached.manifest_version
}

/// Check if a cached manifest is still fresh based on max age.
pub fn is_fresh(manifest: &ServiceManifest, max_age: Duration) -> bool {
    let age = Utc::now() - manifest.published_at;
    age < max_age
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disk_path_deterministic() {
        let cache = ManifestCache::new(PathBuf::from("/tmp/osp-test"), 3600);
        let path1 = cache.disk_path("supabase.com");
        let path2 = cache.disk_path("supabase.com");
        assert_eq!(path1, path2);
    }

    #[test]
    fn disk_path_differs_per_domain() {
        let cache = ManifestCache::new(PathBuf::from("/tmp/osp-test"), 3600);
        let path1 = cache.disk_path("supabase.com");
        let path2 = cache.disk_path("neon.tech");
        assert_ne!(path1, path2);
    }
}
