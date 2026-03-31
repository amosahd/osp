# better Local Encrypted Service Vault

## Overview

The vault stores provisioned resource credentials locally with encryption,
provider fingerprint tracking, rotation history, and environment scoping.

## Storage Format

```json
{
  "version": 2,
  "resource_id": "res_abc123",
  "offering_id": "neon/db-postgres",
  "tier_id": "pro",
  "provider_url": "https://neon.tech",
  "provider_fingerprint": "sha256:abc...",
  "manifest_hash": "sha256:def...",
  "credentials": { "encrypted": "..." },
  "payment_method": "sardis_wallet",
  "escrow_id": "esc_xyz",
  "created_at": "2025-03-31T12:00:00Z",
  "last_rotated_at": "2025-04-15T12:00:00Z",
  "rotation_count": 1,
  "environment": "production"
}
```

## Encryption

- Algorithm: AES-256-GCM
- Key derivation: Argon2id from user passphrase
- Each bundle encrypted separately
- Key never stored on disk

## Commands

| Command | Description |
|---------|-------------|
| `better services list` | List all vault entries |
| `better services status <id>` | Show detailed bundle info |
| `better rotate <id>` | Rotate credentials |
| `better deprovision <id>` | Remove resource and vault entry |
| `better env generate` | Generate .env from vault |

## Migration

V1 → V2 migration adds: tier_id, payment_method, escrow_id,
provider_fingerprint, manifest_hash, rotation tracking, environment.
Migration is automatic on vault access.

## Environment Scoping

Vault entries are namespaced by environment (dev, staging, production).
Default environment is "development". Switch with `better env switch <env>`.
