# Getting Started with OSP

This guide will help you understand the Open Service Protocol and get up and running quickly, whether you are a **service provider** looking to make your service agent-accessible or an **agent developer** looking to programmatically discover and provision services.

## What is OSP?

OSP (Open Service Protocol) is an open standard that enables AI agents to:

1. **Discover** developer services through a well-known endpoint
2. **Provision** resources programmatically with a single API call
3. **Manage** credentials, upgrades, and deprovisioning through standard operations

Think of it as DNS for developer services — a simple, universal mechanism for agents to find and use services without manual signup flows.

## Core Concepts

### Service Manifest

Every OSP-compatible provider publishes a **Service Manifest** at `/.well-known/osp.json`. This JSON document describes:

- Who the provider is (`provider_id`)
- What services they offer (`offerings`)
- What tiers and pricing are available (`tiers`)
- Where the OSP API lives (`osp_base_url`)

### Offerings and Tiers

An **offering** is a specific service (e.g., "Managed PostgreSQL"). Each offering has one or more **tiers** that define pricing and feature levels (e.g., "Free", "Pro", "Enterprise").

### Provisioning

When an agent wants to use a service, it sends a **ProvisionRequest** to the provider's OSP endpoint. The provider creates the resource and returns a **ProvisionResponse** containing credentials and resource metadata.

### Credential Bundles

Credentials are returned in a **CredentialBundle** — a structured envelope that can optionally be encrypted using the agent's Ed25519 public key.

## Quick Start: Provider

If you want to make your service available to AI agents:

1. **Create a Service Manifest** describing your offerings
2. **Serve it** at `https://yourdomain.com/.well-known/osp.json`
3. **Implement the OSP endpoints** (provision, deprovision, status, etc.)
4. **Run conformance tests** to verify your implementation

See the full [Provider Guide](for-providers.md) for detailed steps.

## Quick Start: Agent Developer

If you are building an agent that needs to discover and use services:

1. **Discover** services by fetching `/.well-known/osp.json` from a provider
2. **Choose** an offering and tier
3. **Provision** by POSTing a ProvisionRequest to the provider's OSP endpoint
4. **Use** the returned credentials to interact with the provisioned service

See the full [Agent Developer Guide](for-agents.md) for detailed steps.

## Protocol Endpoints

OSP defines seven standard endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/.well-known/osp.json` | GET | Service discovery manifest |
| `/osp/v1/provision` | POST | Provision a new resource |
| `/osp/v1/resources/{id}` | GET | Get resource status |
| `/osp/v1/resources/{id}` | DELETE | Deprovision a resource |
| `/osp/v1/resources/{id}/credentials` | POST | Rotate credentials |
| `/osp/v1/resources/{id}/upgrade` | POST | Change tier |
| `/osp/v1/resources/{id}/usage` | GET | Get usage information |

## Example Flow

```
Agent                                Provider
  |                                     |
  |  GET /.well-known/osp.json          |
  |------------------------------------>|
  |  ServiceManifest                    |
  |<------------------------------------|
  |                                     |
  |  POST /osp/v1/provision             |
  |  { offering_id, tier_id, ... }      |
  |------------------------------------>|
  |  ProvisionResponse                  |
  |  { resource_id, credentials, ... }  |
  |<------------------------------------|
  |                                     |
  |  (Agent uses the service)           |
  |                                     |
  |  DELETE /osp/v1/resources/{id}      |
  |------------------------------------>|
  |  { status: "deprovisioned" }        |
  |<------------------------------------|
```

## Sandbox Mode for Testing

OSP supports sandbox environments that let you test integrations without affecting production resources or incurring charges. Add a `sandbox` object to any provision request:

```json
{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "project_name": "test-my-integration",
  "sandbox": {
    "enabled": true,
    "ttl_hours": 24,
    "auto_destroy": true
  }
}
```

Sandbox resources auto-destroy after the TTL expires and can be promoted to permanent if your test succeeds. You can also seed sandbox databases from existing resources using `seed_from` and `seed_mode` options.

See the [Provider Guide](for-providers.md#sandbox-mode-support) and [Agent Guide](for-agents.md#using-sandbox-mode-for-testing) for full details.

## Agent Identity Setup

Agents authenticate with providers using one of three methods:

| Method | Best For | How |
|--------|----------|-----|
| **Ed25519 DID** | Production agents | Present a TAP attestation token via `agent_attestation` field |
| **OAuth / OIDC** | Cloud platform agents, CI/CD | Send a federated identity token via the `authentication` object |
| **API Key** | Development, simple integrations | Use a provider-issued `resource_access_token` in the `Authorization` header |

For most production use cases, generate an Ed25519 key pair and obtain a TAP attestation:

```bash
# Your agent presents the attestation in every request
POST /osp/v1/provision
Authorization: Bearer <agent_attestation_token>
```

See the [Agent Guide](for-agents.md#agent-identity) for detailed setup instructions for each method.

## Cost Visibility

Track infrastructure spending with the cost summary endpoint:

```bash
GET /osp/v1/projects/{project_id}/cost
```

This returns a breakdown of costs by resource, including base subscription costs and metered usage, period-over-period comparisons, and proactive cost alerts. Organizations can set budget guardrails that automatically block provisioning when spending limits are reached.

See the [Provider Guide](for-providers.md#cost-summary-endpoint) for implementation details and the [Agent Guide](for-agents.md#querying-cost-summary) for how to query costs.

## Next Steps

- Read the full [Protocol Specification](../spec/osp-v1.0.md)
- Explore the [JSON Schemas](../schemas/) for message formats
- Check out the [Examples](../examples/) for end-to-end scenarios
- Browse the reference implementations in [TypeScript](../reference-implementation/typescript/) or [Python](../reference-implementation/python/)
- See the [Error Code Reference](error-reference.md) for all error codes and recommended actions
