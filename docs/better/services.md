# better services — Command Specs

## better services list

```
better services list [--env <env>] [--provider <id>] [--json]
```

Lists all provisioned services in the local vault.

### Human Output
```
  Environment: production
  ─────────────────────────────────────
  neon/db-postgres (pro)     res_abc123  active  $29.00/mo
    Rotated: 2025-04-15 (1 rotation)
  clerk/auth (free)          res_def456  active  free
    Created: 2025-03-20
```

### JSON Output
```json
{
  "environment": "production",
  "services": [
    {
      "resource_id": "res_abc123",
      "offering_id": "neon/db-postgres",
      "tier_id": "pro",
      "status": "active",
      "payment_method": "sardis_wallet",
      "created_at": "2025-03-31T12:00:00Z",
      "last_rotated_at": "2025-04-15T12:00:00Z",
      "rotation_count": 1
    }
  ]
}
```

## better services status

```
better services status <resource_id> [--json]
```

Shows detailed status for a provisioned resource.

### Output
```json
{
  "resource_id": "res_abc123",
  "offering_id": "neon/db-postgres",
  "tier_id": "pro",
  "provider_url": "https://neon.tech",
  "status": "active",
  "credentials_available": true,
  "payment": {
    "method": "sardis_wallet",
    "amount": "29.00",
    "currency": "USD"
  },
  "escrow": {
    "escrow_id": "esc_xyz",
    "status": "released"
  }
}
```

## Filters

| Flag | Description |
|------|-------------|
| `--env` | Filter by environment |
| `--provider` | Filter by provider ID |
| `--category` | Filter by service category |
| `--status` | Filter by status (active, failed) |

## better rotate

```
better rotate <resource_id>
```

Rotates credentials and updates the vault. Regenerates .env if applicable.

## better deprovision

```
better deprovision <resource_id> [--force]
```

Tears down the resource, removes vault entry. Warns if .env references exist.

## Safety: Active env reference warnings

Before destructive actions (deprovision, rotate), better checks:
1. Which .env files reference this resource's credentials
2. Which running processes might be using the credentials
3. Warns the user with specific file paths and process names
