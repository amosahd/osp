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

## Next Steps

- Read the full [Protocol Specification](../spec/osp-v1.0.md)
- Explore the [JSON Schemas](../schemas/) for message formats
- Check out the [Examples](../examples/) for end-to-end scenarios
- Browse the reference implementations in [TypeScript](../reference-implementation/typescript/) or [Python](../reference-implementation/python/)
