# Vault Bundle Migration and Rollback

## Overview

The OSP vault stores credential bundles for provisioned resources. As the protocol evolves, the bundle schema changes. This document defines migration and rollback procedures.

## Bundle Versions

| Version | Introduced In | Key Changes |
|---------|--------------|-------------|
| v1 | OSP 1.0 | resource_id, offering_id, provider_url, credentials |
| v2 | OSP 1.1 | Added tier_id, payment_method, escrow_id, provider_fingerprint, manifest_hash, rotation tracking, environment scoping |

## Migration Path

### V1 → V2

Fields added in V2 that are not present in V1 are populated with defaults:

| Field | Default |
|-------|---------|
| `tier_id` | `"unknown"` |
| `payment_method` | `undefined` |
| `escrow_id` | `undefined` |
| `provider_fingerprint` | `undefined` |
| `manifest_hash` | `undefined` |
| `last_rotated_at` | `undefined` |
| `rotation_count` | `0` |
| `environment` | `undefined` |

Migration is non-destructive. All V1 fields are preserved.

## Rollback

If an agent needs to downgrade to an older SDK version:

1. **V2 → V1**: Strip V2-only fields. The bundle remains functional for basic operations (status, rotate, deprovision). Payment metadata is lost.
2. **Never delete bundles** during rollback — only reshape them.

## SDK Behavior

- On startup, SDKs SHOULD check stored bundle versions.
- If any bundle needs migration, SDKs SHOULD migrate automatically and log the migration.
- SDKs MUST NOT fail on encountering an unknown future version. Instead, they should log a warning and attempt best-effort access to known fields.

## Implementation Notes

- TypeScript: `vault.ts` — `migrateBundle()`, `VaultStore.migrateAll()`
- Python: `paid_provisioning.py` — `PaymentProofEnvelope.parse()`
- Go: `paid_provisioning.go` — `ParsePaymentProof()`
