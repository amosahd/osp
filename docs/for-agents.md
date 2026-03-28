# OSP for Agent Developers

This guide walks you through building an AI agent that can discover, provision, and manage developer services using the Open Service Protocol.

## Overview

Integrating OSP into your agent involves four key operations:

1. [Discover services](#step-1-discover-services)
2. [Provision resources](#step-2-provision-resources)
3. [Handle sync and async responses](#step-3-handle-sync-and-async-responses)
4. [Manage credentials and lifecycle](#step-4-manage-credentials-and-lifecycle)

## Concepts

Before diving in, here are the key concepts:

- **Service Manifest**: A JSON document at `/.well-known/osp.json` that describes a provider's offerings.
- **Offering**: A specific service (e.g., "Managed PostgreSQL", "Auth Service").
- **Tier**: A pricing/feature level within an offering (e.g., "Free", "Pro").
- **Resource**: A provisioned instance of a service that your agent can use.
- **Credential Bundle**: The connection details and API keys needed to use a resource.

## Step 1: Discover Services

### By Domain

If you know the provider's domain, fetch their manifest directly:

```bash
GET https://supabase.com/.well-known/osp.json
```

```json
{
  "osp_version": "1.0",
  "provider_id": "supabase.com",
  "provider_name": "Supabase",
  "osp_base_url": "https://api.supabase.com/osp/v1",
  "offerings": [
    {
      "offering_id": "supabase/postgres",
      "name": "Managed PostgreSQL",
      "description": "Full PostgreSQL database with realtime subscriptions.",
      "category": "database",
      "tiers": [
        {
          "tier_id": "free",
          "name": "Free",
          "price": { "amount": "0", "currency": "USD" },
          "limits": { "storage_gb": 0.5, "rows": 50000 }
        },
        {
          "tier_id": "pro",
          "name": "Pro",
          "price": { "amount": "25", "currency": "USD", "interval": "P1M" },
          "limits": { "storage_gb": 8, "rows": null }
        }
      ]
    }
  ]
}
```

### By Registry (Coming Soon)

The OSP registry will allow agents to search for services by category, capability, or keyword:

```bash
# Future API
GET https://registry.osp.dev/search?category=database&tier=free
```

### Discovery Best Practices

- **Cache manifests**: Manifests change infrequently. Cache them with a reasonable TTL (e.g., 1 hour).
- **Validate the manifest**: Use the [Service Manifest JSON Schema](../schemas/service-manifest.schema.json) to validate the response.
- **Check `osp_version`**: Ensure the version is compatible with your agent's implementation.

## Step 2: Provision Resources

Once you have found a suitable offering and tier, send a provision request:

```bash
POST https://api.supabase.com/osp/v1/provision
Content-Type: application/json

{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "project_name": "my-agent-app",
  "agent_public_key": "base64url_encoded_ed25519_public_key",
  "idempotency_key": "provision-my-agent-app-postgres-001"
}
```

### Request Fields

| Field | Required | Description |
|---|---|---|
| `offering_id` | Yes | The offering to provision (from the manifest) |
| `tier_id` | Yes | The tier to use (from the offering) |
| `project_name` | No | Human-readable name for the resource |
| `agent_public_key` | No | Ed25519 public key for credential encryption |
| `idempotency_key` | No | Prevents duplicate provisioning on retries |
| `payment_context` | Depends | Required for paid tiers; specifies payment method and token |

### Generating an Ed25519 Key Pair

Your agent should generate a key pair for credential encryption:

**TypeScript:**
```typescript
import { generateKeyPairSync } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Encode the public key for the provision request
const publicKeyBase64url = publicKey
  .export({ type: 'spki', format: 'der' })
  .toString('base64url');
```

**Python:**
```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64

private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

public_key_base64url = base64.urlsafe_b64encode(
    public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)
).decode()
```

### Payment Context

For paid tiers, include payment information:

```json
{
  "offering_id": "supabase/postgres",
  "tier_id": "pro",
  "project_name": "production-app",
  "payment_context": {
    "method": "sardis",
    "token": "pay_tok_abc123"
  }
}
```

Supported payment methods are provider-dependent. Common options:
- `sardis` — Sardis payment token
- `stripe` — Stripe payment method
- `x402` — HTTP 402-based payment
- `free` — No payment required (free tiers)

## Step 3: Handle Sync and Async Responses

### Synchronous Provisioning (HTTP 200)

If the provider can create the resource immediately, you get a `200 OK` with credentials:

```json
{
  "resource_id": "proj_abc123",
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "SUPABASE_URL": "https://xyz.supabase.co",
      "SUPABASE_ANON_KEY": "eyJ...",
      "SUPABASE_SERVICE_KEY": "eyJ..."
    }
  },
  "dashboard_url": "https://supabase.com/dashboard/project/xyz",
  "created_at": "2025-01-15T10:30:00Z"
}
```

Your agent can immediately use the credentials to connect to the service.

### Asynchronous Provisioning (HTTP 202)

Some services take time to provision. You will receive a `202 Accepted`:

```json
{
  "resource_id": "proj_abc123",
  "status": "provisioning",
  "status_url": "https://api.supabase.com/osp/v1/resources/proj_abc123",
  "estimated_ready_seconds": 30
}
```

Poll the `status_url` until the status changes to `provisioned`:

```python
import time
import httpx

def wait_for_provisioning(status_url: str, timeout: int = 300) -> dict:
    """Poll until resource is provisioned or timeout is reached."""
    start = time.time()
    while time.time() - start < timeout:
        response = httpx.get(status_url)
        data = response.json()

        if data["status"] == "provisioned":
            return data
        elif data["status"] == "error":
            raise Exception(f"Provisioning failed: {data.get('error')}")

        # Respect estimated_ready_seconds or use exponential backoff
        time.sleep(min(5, timeout - (time.time() - start)))

    raise TimeoutError("Provisioning timed out")
```

### Error Handling

Handle errors gracefully:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Unknown offering_id: supabase/redis",
    "details": {
      "available_offerings": ["supabase/postgres", "supabase/auth", "supabase/storage"]
    }
  }
}
```

Common error codes your agent should handle:

| HTTP Status | Error Code | Action |
|---|---|---|
| 400 | `invalid_request` | Fix the request and retry |
| 401 | `unauthorized` | Refresh authentication and retry |
| 404 | `not_found` | Offering or resource does not exist |
| 409 | `conflict` | Resource already exists (idempotency key match) |
| 429 | `insufficient_quota` | Wait and retry, or upgrade tier |
| 500 | `provider_error` | Retry with exponential backoff |

## Step 4: Manage Credentials and Lifecycle

### Rotate Credentials

Regularly rotate credentials for security:

```bash
POST https://api.supabase.com/osp/v1/resources/proj_abc123/credentials
Content-Type: application/json

{
  "agent_public_key": "base64url_encoded_ed25519_public_key",
  "invalidate_previous": true
}
```

### Upgrade or Downgrade Tier

Change the tier as your needs evolve:

```bash
POST https://api.supabase.com/osp/v1/resources/proj_abc123/upgrade
Content-Type: application/json

{
  "tier_id": "pro",
  "payment_context": {
    "method": "sardis",
    "token": "pay_tok_abc123"
  }
}
```

### Check Usage

Monitor resource usage to decide when to upgrade or deprovision:

```bash
GET https://api.supabase.com/osp/v1/resources/proj_abc123/usage
```

```json
{
  "resource_id": "proj_abc123",
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-02-01T00:00:00Z",
  "metrics": {
    "storage_gb": 0.23,
    "requests": 12450
  },
  "limits": {
    "storage_gb": 0.5,
    "requests_per_month": 50000
  }
}
```

### Deprovision

Clean up resources when they are no longer needed:

```bash
DELETE https://api.supabase.com/osp/v1/resources/proj_abc123
```

```json
{
  "resource_id": "proj_abc123",
  "status": "deprovisioned",
  "deprovisioned_at": "2025-01-16T08:00:00Z"
}
```

## Full Agent Example

Here is a complete example of an agent discovering and provisioning a database:

```python
import httpx
import json

OSP_WELL_KNOWN = "/.well-known/osp.json"

class OSPAgent:
    def __init__(self):
        self.client = httpx.Client()

    def discover(self, domain: str) -> dict:
        """Fetch the service manifest from a provider."""
        url = f"https://{domain}{OSP_WELL_KNOWN}"
        response = self.client.get(url)
        response.raise_for_status()
        return response.json()

    def find_offering(self, manifest: dict, category: str) -> dict | None:
        """Find the first offering matching a category."""
        for offering in manifest.get("offerings", []):
            if offering.get("category") == category:
                return offering
        return None

    def provision(self, manifest: dict, offering_id: str, tier_id: str, project_name: str) -> dict:
        """Provision a resource."""
        base_url = manifest["osp_base_url"]
        response = self.client.post(
            f"{base_url}/provision",
            json={
                "offering_id": offering_id,
                "tier_id": tier_id,
                "project_name": project_name,
            },
        )
        response.raise_for_status()
        return response.json()

    def deprovision(self, manifest: dict, resource_id: str) -> dict:
        """Deprovision a resource."""
        base_url = manifest["osp_base_url"]
        response = self.client.delete(f"{base_url}/resources/{resource_id}")
        response.raise_for_status()
        return response.json()


# Usage
agent = OSPAgent()

# 1. Discover
manifest = agent.discover("supabase.com")

# 2. Find a database offering
db = agent.find_offering(manifest, "database")
print(f"Found: {db['name']} ({db['offering_id']})")

# 3. Pick the free tier
tier = next(t for t in db["tiers"] if t["tier_id"] == "free")
print(f"Tier: {tier['name']} — ${tier['price']['amount']}/{tier['price'].get('interval', 'one-time')}")

# 4. Provision
result = agent.provision(manifest, db["offering_id"], tier["tier_id"], "my-agent-app")
print(f"Resource: {result['resource_id']}")
print(f"Status: {result['status']}")

if result["status"] == "provisioned":
    creds = result["credentials_bundle"]["credentials"]
    print(f"URL: {creds['SUPABASE_URL']}")
```

## Security Best Practices

1. **Always use HTTPS** when communicating with providers.
2. **Store credentials securely**: Never log or expose credential bundles. Use a secrets manager.
3. **Use Ed25519 encryption**: Provide your agent's public key so providers can encrypt credentials in transit.
4. **Rotate credentials regularly**: Use the credential rotation endpoint on a schedule.
5. **Validate manifests**: Check the `osp_version` and validate against the JSON Schema before trusting a manifest.
6. **Use idempotency keys**: Always include an `idempotency_key` to prevent accidental duplicate provisioning.

## Next Steps

- Read the full [Protocol Specification](../spec/osp-v1.0.md)
- Explore the [JSON Schemas](../schemas/) for request/response validation
- Try the [reference implementations](../reference-implementation/) for working SDK code
- Run the [conformance tests](../conformance-tests/) against your agent
