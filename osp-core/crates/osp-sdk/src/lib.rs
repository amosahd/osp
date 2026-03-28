//! OSP Rust SDK — thin wrapper around osp-core crates.
//!
//! Provides `Client` for agents and `ProviderServer` for building OSP-compatible providers.

pub mod client;
pub mod provider;

// Re-export core types
pub use osp_crypto::{self, KeyPair, PublicKey, Signature};
pub use osp_manifest::types::*;
pub use osp_manifest::{self, ManifestError};
pub use osp_vault::{self, Vault, VaultError};
pub use osp_provider::{self, ProviderPort, ProviderError};
