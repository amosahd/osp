use serde::{Deserialize, Serialize};

/// Conformance levels from OSP spec Section 9.3.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConformanceLevel {
    /// Core: discovery + provision + deprovision + status + credentials + health
    Core,
    /// Core + webhook support
    Webhooks,
    /// Core + Webhooks + event streaming
    Events,
    /// Core + Webhooks + Events + escrow
    Escrow,
    /// All features including rotation, migration, sharing, delegation
    Full,
}

impl ConformanceLevel {
    /// Tests required for each level.
    pub fn required_tests(&self) -> Vec<&'static str> {
        match self {
            Self::Core => vec![
                "well_known_endpoint",
                "manifest_valid_schema",
                "manifest_signature",
                "provision_sync",
                "deprovision",
                "status_endpoint",
                "credentials_endpoint",
                "health_endpoint",
            ],
            Self::Webhooks => {
                let mut tests = Self::Core.required_tests();
                tests.extend_from_slice(&[
                    "webhook_registration",
                    "webhook_provisioned_event",
                    "webhook_signature",
                ]);
                tests
            }
            Self::Events => {
                let mut tests = Self::Webhooks.required_tests();
                tests.extend_from_slice(&[
                    "event_stream",
                    "event_filtering",
                ]);
                tests
            }
            Self::Escrow => {
                let mut tests = Self::Events.required_tests();
                tests.extend_from_slice(&[
                    "escrow_hold",
                    "escrow_release",
                    "dispute_endpoint",
                ]);
                tests
            }
            Self::Full => {
                let mut tests = Self::Escrow.required_tests();
                tests.extend_from_slice(&[
                    "credential_rotation",
                    "tier_upgrade",
                    "tier_downgrade",
                    "resource_sharing",
                    "resource_delegation",
                    "usage_reporting",
                    "estimate_endpoint",
                    "async_provision",
                ]);
                tests
            }
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Core => "Core",
            Self::Webhooks => "Core + Webhooks",
            Self::Events => "Core + Webhooks + Events",
            Self::Escrow => "Core + Webhooks + Events + Escrow",
            Self::Full => "Full",
        }
    }
}
