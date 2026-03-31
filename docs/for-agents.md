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
| 401 | `identity_verification_failed` | Refresh or replace identity proof, then retry |
| 402 | `payment_required`, `payment_declined`, `budget_exceeded` | Supply valid payment or request budget approval |
| 403 | `approval_required`, `trust_tier_insufficient` | Pause for human review or raise trust level |
| 404 | `not_found` | Offering or resource does not exist |
| 409 | `conflict` | Resource already exists (idempotency key match) |
| 429 | `rate_limit_exceeded` | Respect `retry_after_seconds` and retry later |
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

## Using Sandbox Mode for Testing

Sandbox mode lets your agent create temporary, isolated environments for testing integrations before going to production. Sandbox resources auto-destroy after a configurable TTL and are excluded from billing (or charged at reduced sandbox rates).

### Creating a Sandbox Resource

Add a `sandbox` object to your provision request:

```json
{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "project_name": "test-integration-42",
  "sandbox": {
    "enabled": true,
    "ttl_hours": 24,
    "auto_destroy": true,
    "seed_from": "res_db_production",
    "seed_mode": "schema_only"
  },
  "nonce": "..."
}
```

### Sandbox Options

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Set to `true` to create a sandbox resource |
| `ttl_hours` | `integer` | Auto-destroy after this many hours (max: 720 / 30 days) |
| `auto_destroy` | `boolean` | Whether to auto-destroy on TTL expiry |
| `seed_from` | `string` | Resource ID to copy schema/data from |
| `seed_mode` | `string` | `schema_only`, `schema_and_sample_data`, or `full_clone` |

### What to Expect

- Sandbox resources are tagged with `osp_sandbox: true` in metadata.
- The provider sends a `resource.sandbox_expiring` webhook 1 hour before TTL expires.
- You can promote a sandbox to permanent: `POST /osp/v1/promote/{resource_id}`.
- Sandbox resources work identically to production resources for API testing purposes.

### CI/CD Integration Example

```yaml
# .github/workflows/preview.yml
- name: Create preview environment
  run: |
    osp projects create --name "pr-${{ github.event.number }}" --environment preview --sandbox --ttl 48h
    osp provision supabase/managed-postgres --tier free --sandbox --seed-from prod --seed-mode schema_only
    osp env pull --format github-actions >> $GITHUB_ENV

- name: Destroy preview environment
  if: github.event.action == 'closed'
  run: osp projects delete "pr-${{ github.event.number }}" --force --deprovision
```

## Agent Identity

OSP supports three methods for agents to authenticate with providers. The method you use depends on your security requirements and infrastructure.

### Method 1: Ed25519 DID (via `agent_attestation`)

The recommended approach for production agents. Present a TAP (Trust & Attestation Protocol) attestation token that binds your Ed25519 key pair to a verified identity.

```bash
POST https://api.provider.com/osp/v1/provision
Authorization: Bearer <agent_attestation_token>
Content-Type: application/json

{
  "offering_id": "provider/service",
  "tier_id": "free",
  "agent_public_key": "base64url_encoded_ed25519_public_key",
  "agent_attestation": "<tap_attestation_token>",
  "nonce": "..."
}
```

The attestation token proves your agent's identity and trust tier (`none`, `basic`, `verified`, `enterprise`). Some offerings require a minimum trust tier.

**Best practice:** Use short-lived attestations (1-hour expiry with refresh) to limit the blast radius of key compromise.

### Method 2: OAuth / OIDC Federation

Authenticate using federated identity tokens from cloud platforms (GCP, Azure, AWS) or CI/CD systems (GitHub Actions).

```json
{
  "offering_id": "provider/service",
  "tier_id": "free",
  "authentication": {
    "method": "oidc",
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "issuer": "https://accounts.google.com",
    "audience": "com.provider",
    "subject": "agent@my-org.iam.gserviceaccount.com"
  },
  "nonce": "..."
}
```

Supported federation methods:

| Method | Protocol | Use Case |
|--------|----------|----------|
| `oidc` | OpenID Connect | Cloud platform agents (GCP, Azure, AWS IAM) |
| `spiffe` | SPIFFE/SPIRE | Kubernetes workloads, service mesh environments |
| `github_actions` | GitHub OIDC | CI/CD pipelines on GitHub Actions |
| `tap` | Trust & Attestation Protocol | OSP-native agent identity |

### Method 3: API Key

For simple integrations, use a provider-issued API key or `resource_access_token` from the credential bundle:

```bash
GET https://api.provider.com/osp/v1/resources/res_abc123
Authorization: Bearer <resource_access_token>
```

This is the simplest method but provides less identity verification. Use it for development or when the provider does not support attestation.

## Querying Cost Summary

Track your infrastructure spending across all provisioned resources with the cost summary endpoint.

### GET /osp/v1/projects/{project_id}/cost

```bash
GET https://api.provider.com/osp/v1/projects/proj_my-saas/cost
Authorization: Bearer <agent_attestation>
```

```json
{
  "project_id": "proj_my-saas",
  "period": {"start": "2026-03-01", "end": "2026-03-31"},
  "total": {"amount": "74.50", "currency": "USD"},
  "by_resource": [
    {
      "resource_id": "res_db",
      "service": "supabase/managed-postgres",
      "tier": "pro",
      "base_cost": "25.00",
      "metered_cost": "7.50",
      "total": "32.50"
    }
  ],
  "comparison": {
    "previous_period": "68.20",
    "change_percent": "+9.2%",
    "cost_alerts": [
      {
        "resource": "res_db",
        "alert": "Storage overage increasing — consider upgrading to Team tier"
      }
    ]
  }
}
```

**Best practices:**
- Poll cost summaries periodically to detect spending anomalies.
- Use `cost_alerts` to proactively recommend tier changes to the user.
- Respect budget guardrails: if your organization has set budgets, provisioning requests that exceed the limit will return `402 Payment Required` with a `budget_exceeded` error.

## Handling Rate Limits

Providers implement rate limiting on all OSP endpoints. Your agent should read and respect rate limit headers on every response.

### Rate Limit Headers

Every response from an OSP provider includes these IETF-standard headers:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests allowed per window |
| `RateLimit-Remaining` | Remaining requests in the current window |
| `RateLimit-Reset` | Seconds until the window resets |

### Handling 429 Responses

When you receive `429 Too Many Requests`, read the `Retry-After` header and wait:

```python
import httpx
import time

def osp_request(client: httpx.Client, method: str, url: str, **kwargs) -> httpx.Response:
    """Make an OSP request with automatic rate limit handling."""
    response = client.request(method, url, **kwargs)

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 60))
        time.sleep(retry_after)
        response = client.request(method, url, **kwargs)

    return response
```

### Typical Rate Limits

| Endpoint | Expected Minimum |
|----------|-----------------|
| `POST /provision` | 10/min per principal |
| `GET /status/{id}` | 60/min per resource |
| `GET /credentials/{id}` | 30/min per resource |
| `POST /rotate/{id}` | 5/hour per resource |

## Idempotency Keys for Safe Retries

Always include an `idempotency_key` in provision requests to prevent duplicate resources if your request is retried due to network failures.

### How It Works

1. Generate a deterministic key from the principal, offering, and project name.
2. Include it in the `ProvisionRequest`.
3. If you retry the same request within 24 hours, the provider returns the original response without creating a new resource.

```python
import hashlib

def make_idempotency_key(principal_id: str, offering_id: str, project_name: str) -> str:
    """Generate a deterministic idempotency key."""
    raw = f"{principal_id}:{offering_id}:{project_name}"
    return hashlib.sha256(raw.encode()).hexdigest()
```

### Example Request

```json
{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "project_name": "my-agent-app",
  "idempotency_key": "provision-my-agent-app-postgres-001",
  "nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

### Key Rules

- The idempotency key is scoped to the provider. Different providers may receive the same key without conflict.
- Providers store the response for at least 24 hours.
- If the original request is still processing, the provider returns the in-progress response with `status: "provisioning"`.
- The `idempotency_key` and `nonce` serve different purposes: the nonce prevents replay attacks, while the idempotency key ensures safe retries. Both should be present.

## Multi-Region Preferences

When provisioning resources with specific data residency or latency requirements, specify a `region` in your provision request.

### Specifying a Region

```json
{
  "offering_id": "supabase/postgres",
  "tier_id": "pro",
  "project_name": "eu-app",
  "region": "eu-west-1",
  "nonce": "..."
}
```

### Discovering Available Regions

Check the provider's manifest for each offering's `regions` array:

```json
{
  "regions": [
    {"id": "us-east-1", "jurisdiction": "US", "provider_region": "aws-us-east-1"},
    {"id": "eu-west-1", "jurisdiction": "EU", "provider_region": "aws-eu-west-1", "gdpr_compliant": true},
    {"id": "ap-southeast-1", "jurisdiction": "SG", "provider_region": "aws-ap-southeast-1"}
  ]
}
```

### Region Selection Best Practices

- **Data residency:** If operating under GDPR or other data residency constraints, always specify a `region` and check the `gdpr_compliant` flag.
- **Latency:** Choose regions close to your users or other services.
- **Failover:** For production, consider provisioning resources in multiple regions.
- **Error handling:** If the provider cannot honor your region choice, it returns `invalid_region` — it will never silently provision in a different region.
- The `ProvisionResponse` always includes the actual `region` where the resource was deployed.

## Next Steps

- Read the full [Protocol Specification](../spec/osp-v1.0.md)
- Explore the [JSON Schemas](../schemas/) for request/response validation
- Try the [reference implementations](../reference-implementation/) for working SDK code
- Run the [conformance tests](../conformance-tests/) against your agent
- See the [Error Code Reference](error-reference.md) for a complete list of error codes
