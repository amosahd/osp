# Open Service Protocol (OSP) v1.0

> An open standard for AI agents to discover, provision, and manage developer services.

**Status:** Draft
**Date:** 2026-03-27
**License:** Apache 2.0
**Authors:** OSP Working Group

---

## Abstract

The Open Service Protocol (OSP) defines a standard interface through which AI agents and automated processes discover, provision, manage, and deprovision developer services such as databases, hosting platforms, authentication providers, and analytics systems. OSP is payment-rail agnostic, provider-neutral, and designed for machine-to-machine interaction without browser-based signup flows. It solves the problem of fragmented, proprietary service provisioning by establishing a single open protocol that any provider can implement and any agent can consume.

---

## Table of Contents

- [1. Introduction](#1-introduction)
  - [1.1 Problem Statement](#11-problem-statement)
  - [1.2 Design Goals](#12-design-goals)
  - [1.3 Non-Goals](#13-non-goals)
  - [1.4 Relationship to Existing Standards](#14-relationship-to-existing-standards)
  - [1.5 Notational Conventions](#15-notational-conventions)
  - [1.6 Version Negotiation](#16-version-negotiation)
- [2. Terminology](#2-terminology)
- [3. Protocol Objects](#3-protocol-objects)
  - [3.1 ServiceManifest](#31-servicemanifest)
  - [3.2 ServiceOffering](#32-serviceoffering)
  - [3.3 ServiceTier](#33-servicetier)
  - [3.4 ProvisionRequest](#34-provisionrequest)
  - [3.5 ProvisionResponse](#35-provisionresponse)
  - [3.6 CredentialBundle](#36-credentialbundle)
  - [3.7 UsageReport](#37-usagereport)
- [4. Discovery](#4-discovery)
  - [4.1 Well-Known Endpoint](#41-well-known-endpoint)
  - [4.2 Registry](#42-registry)
  - [4.3 Manifest Verification](#43-manifest-verification)
  - [4.4 Manifest Versioning](#44-manifest-versioning)
  - [4.5 Offering Deprecation and Sunset](#45-offering-deprecation-and-sunset)
  - [4.6 Service Templates (Stacks)](#46-service-templates-stacks)
  - [4.7 Provider Compatibility](#47-provider-compatibility)
- [5. Provisioning](#5-provisioning)
  - [5.1 Synchronous Flow (Happy Path)](#51-synchronous-flow-happy-path)
  - [5.2 Asynchronous Flow](#52-asynchronous-flow)
  - [5.3 Free Tier Flow](#53-free-tier-flow)
  - [5.4 Credential Encryption](#54-credential-encryption)
  - [5.5 Idempotency](#55-idempotency)
  - [5.6 Deprovisioning](#56-deprovisioning)
  - [5.7 Geographic Compliance](#57-geographic-compliance)
  - [5.8 Multi-Resource Provisioning](#58-multi-resource-provisioning)
- [6. Provider Endpoints](#6-provider-endpoints)
  - [6.1 POST /osp/v1/provision](#61-post-ospv1provision)
  - [6.2 DELETE /osp/v1/deprovision/{resource_id}](#62-delete-ospv1deprovisionresource_id)
  - [6.3 GET /osp/v1/credentials/{resource_id}](#63-get-ospv1credentialsresource_id)
  - [6.4 POST /osp/v1/rotate/{resource_id}](#64-post-ospv1rotateresource_id)
  - [6.5 GET /osp/v1/status/{resource_id}](#65-get-ospv1statusresource_id)
  - [6.6 GET /osp/v1/usage/{resource_id}](#66-get-ospv1usageresource_id)
  - [6.7 GET /osp/v1/health](#67-get-ospv1health)
  - [6.8 POST /osp/v1/dispute/{resource_id}](#68-post-ospv1disputeresource_id)
  - [6.9 Webhook Management](#69-webhook-management)
  - [6.10 GET /osp/v1/events/{resource_id}](#610-get-ospv1eventsresource_id)
  - [6.11 POST /osp/v1/estimate](#611-post-ospv1estimate)
  - [6.12 POST /osp/v1/share/{resource_id}](#612-post-ospv1shareresource_id)
  - [6.13 POST /osp/v1/delegate/{resource_id}](#613-post-ospv1delegateresource_id)
  - [6.14 Resource Snapshots](#614-resource-snapshots)
  - [6.15 GET /osp/v1/metrics/{resource_id}](#615-get-ospv1metricsresource_id)
  - [6.16 Resource Migration (Cross-Provider)](#616-resource-migration-cross-provider)
- [7. Billing](#7-billing)
  - [7.1 Payment Methods](#71-payment-methods)
  - [7.2 Usage-Based Billing](#72-usage-based-billing)
  - [7.3 Tier Changes](#73-tier-changes)
- [8. Security](#8-security)
  - [8.1 Manifest Signatures](#81-manifest-signatures)
  - [8.2 Credential Encryption](#82-credential-encryption)
  - [8.3 Nonce-Based Replay Protection](#83-nonce-based-replay-protection)
  - [8.4 Transport Security](#84-transport-security)
  - [8.5 Webhook Authentication and Delivery](#85-webhook-authentication-and-delivery)
  - [8.6 Rate Limiting](#86-rate-limiting)
  - [8.7 Agent Identity Revocation](#87-agent-identity-revocation)
  - [8.8 Request Tracing](#88-request-tracing)
  - [8.9 Provider Key Rotation](#89-provider-key-rotation)
  - [8.10 Threat Model](#810-threat-model)
- [9. Conformance](#9-conformance)
  - [9.1 Provider Conformance](#91-provider-conformance)
  - [9.2 Agent Conformance](#92-agent-conformance)
  - [9.3 Conformance Levels](#93-conformance-levels)
- [10. Extension Points](#10-extension-points)
  - [10.1 Custom Payment Methods](#101-custom-payment-methods)
  - [10.2 Provider-Specific Extensions](#102-provider-specific-extensions)
  - [10.3 Custom Credential Fields](#103-custom-credential-fields)
  - [10.4 Service Improvement Proposals (SIPs)](#104-service-improvement-proposals-sips)
- [11. Project Management](#11-project-management)
  - [11.1 Project Object](#111-project-object)
  - [11.2 Project Endpoints](#112-project-endpoints)
  - [11.3 Environment Variable Management](#113-environment-variable-management)
  - [11.4 Cross-Project Resource Sharing](#114-cross-project-resource-sharing)
  - [11.5 Project Templates (Presets)](#115-project-templates-presets)
  - [11.6 Infrastructure-as-Code (Declarative Configuration)](#116-infrastructure-as-code-declarative-configuration)
  - [11.7 Account Linking (Pre-Provisioning)](#117-account-linking-pre-provisioning)
  - [11.8 LLM Context Generation](#118-llm-context-generation)
- [12. Agent Credential Safety](#12-agent-credential-safety)
  - [12.1 The Problem](#121-the-problem)
  - [12.2 Credential Delivery Modes](#122-credential-delivery-modes)
  - [12.3 Credential Visibility Controls](#123-credential-visibility-controls)
  - [12.4 .gitignore and .cursorignore Generation](#124-gitignore-and-cursorignore-generation)
  - [12.5 Credential Leak Detection](#125-credential-leak-detection)
- [13. Developer Experience](#13-developer-experience)
  - [13.1 Typed Environment Variables](#131-typed-environment-variables)
  - [13.2 Clone-to-Running Flow](#132-clone-to-running-flow)
  - [13.3 Framework-Aware Env Generation](#133-framework-aware-env-generation)
  - [13.4 Interactive Setup Wizard](#134-interactive-setup-wizard)
  - [13.5 Environment Diffing](#135-environment-diffing)
  - [13.6 Team Onboarding](#136-team-onboarding)
- [14. Ecosystem Integration](#14-ecosystem-integration)
  - [14.1 Browser Automation Fallback](#141-browser-automation-fallback)
  - [14.2 Credential Import](#142-credential-import)
  - [14.3 Sandbox and Preview Environments](#143-sandbox-and-preview-environments)
  - [14.4 MCP Integration](#144-mcp-integration)
  - [14.5 CI/CD Integration](#145-cicd-integration)
  - [14.6 Cost Dashboard](#146-cost-dashboard)
  - [14.7 Notifications and Alerts](#147-notifications-and-alerts)
- [Appendix A: Complete JSON Schemas](#appendix-a-complete-json-schemas)
- [Appendix B: Example Flows](#appendix-b-example-flows)
- [Appendix C: Comparison with Stripe Projects](#appendix-c-comparison-with-stripe-projects)
- [Appendix D: Canonical JSON Serialization](#appendix-d-canonical-json-serialization)
- [Appendix E: Test Vectors](#appendix-e-test-vectors)
- [Appendix F: Bulk Operations (Informative)](#appendix-f-bulk-operations-informative)
- [Appendix G: Provider Integration Priority](#appendix-g-provider-integration-priority)

---

## 1. Introduction

### 1.1 Problem Statement

AI agents increasingly need to provision infrastructure on behalf of developers and organizations: databases, hosting, authentication services, analytics, storage, and more. Today, agents must navigate a fragmented landscape:

- **Manual signup flows** require browser interaction, CAPTCHA solving, and email verification -- none of which agents handle well.
- **Proprietary CLIs** (e.g., Stripe Projects, launched 2026-03-26) lock agents into a single vendor's ecosystem, payment rail, and approval process.
- **Ad-hoc API wrapping** requires per-provider integration work, with no standard for discovery, credential delivery, or billing.

There is no open standard that allows an agent to ask "what services are available?", select one, pay for it through any payment method, receive credentials securely, and manage the lifecycle of that resource. OSP fills this gap.

### 1.2 Design Goals

1. **Open.** Apache 2.0 licensed. No gatekeeping, no invite lists, no approval queues.
2. **Payment-rail agnostic.** Works with Sardis Protocol, Stripe Shared Payment Tokens, x402, Machine Payments Protocol, traditional invoices, or free tiers. OSP does not privilege any payment system.
3. **Provider self-registration.** Any provider publishes a manifest at a well-known URL. No central authority decides who can participate.
4. **Agent-native.** Designed for MCP tools, CLIs, and SDKs -- not browser-based signup. Every interaction is a structured API call.
5. **Secure credential delivery.** Credentials are encrypted to the agent's Ed25519 public key. Providers never need to store decryptable secrets.
6. **Verifiable manifests.** Provider manifests are signed. Agents verify authenticity before trusting any offering.
7. **Simple to implement.** A minimal conformant provider implements eight REST endpoints and publishes one JSON file.

### 1.3 Non-Goals

OSP intentionally does not define:

- **A payment protocol.** OSP declares which payment methods are accepted and carries payment proofs, but the actual payment logic belongs to Sardis, Stripe, x402, MPP, or other systems.
- **Dispute resolution.** OSP provides a lightweight dispute *initiation* endpoint (Section 6.8) that produces a signed receipt, but the actual resolution, arbitration, and fund movement are handled by layers above OSP (e.g., the Sardis Protocol's escrow and dispute system).
- **Agent identity.** OSP references trust tiers but does not define how agents prove their identity. Use TAP (Trust & Attestation Protocol), AgentCertificates, or similar systems.
- **Service-specific APIs.** OSP provisions a database and delivers credentials; it does not define how to run SQL queries. That is the provider's own API.

### 1.4 Relationship to Existing Standards

| Standard | Relationship to OSP |
|----------|-------------------|
| **MCP (Model Context Protocol)** | OSP tools can be exposed as MCP tools. MCP handles agent-tool communication; OSP handles service lifecycle. |
| **AP2 / UCP** | OSP billing hooks can trigger AP2 mandates or UCP checkout sessions for payment authorization. |
| **x402** | OSP's `payment_method` field supports `x402` as a payment rail. The provider returns HTTP 402 with payment terms; the agent pays inline. |
| **MPP (Machine Payments Protocol)** | OSP's `payment_method` field supports `mpp` sessions for machine-to-machine payments. |
| **Stripe SPT (Shared Payment Tokens)** | OSP can carry Stripe SPTs as a `payment_proof` for providers that accept Stripe billing. |
| **TAP (Trust & Attestation Protocol)** | OSP's `trust_tier_required` field maps to TAP verification levels. Providers declare the minimum trust tier; agents present TAP attestations. |
| **Sardis Protocol** | OSP's escrow profiles reference Sardis escrow contracts. Usage reports can trigger Sardis settlement flows. |

### 1.5 Notational Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

All JSON examples use relaxed formatting for readability. Conformant implementations MUST produce valid JSON per [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259).

All timestamps are [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) strings in UTC (e.g., `"2026-03-27T12:00:00Z"`).

All cryptographic keys use base64url encoding without padding, per [RFC 4648 Section 5](https://www.rfc-editor.org/rfc/rfc4648#section-5).

### 1.6 Version Negotiation

Every OSP request and response includes the `X-OSP-Version` header declaring the protocol version.

**Version negotiation rules:**

1. Agents MUST include `X-OSP-Version: 1.0` in every request.
2. Providers MUST include `X-OSP-Version` in every response, declaring the version they used to process the request.
3. If the provider supports the agent's requested version, it MUST process the request using that version's semantics.
4. If the provider does not support the agent's version, it MUST return `HTTP 406 Not Acceptable` with a body listing supported versions:

```json
{
  "error": {
    "code": "version_not_supported",
    "message": "OSP version 1.0 is not supported",
    "supported_versions": ["1.1", "2.0"],
    "recommended_version": "1.1"
  }
}
```

5. Providers MAY support multiple versions simultaneously. The manifest's `osp_version` field declares the primary version, but the health endpoint SHOULD list all supported versions.
6. **Minor versions** (1.0 → 1.1) are backward compatible. A 1.1 provider MUST accept 1.0 requests.
7. **Major versions** (1.x → 2.0) MAY be incompatible. Providers SHOULD support the previous major version for at least 12 months after a new major version is released.
8. Agents SHOULD include `X-OSP-Version-Min` to declare the minimum version they support, allowing providers to use newer features when available:

```http
X-OSP-Version: 1.0
X-OSP-Version-Min: 1.0
```

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Provider** | A SaaS company or infrastructure operator that offers services through OSP (e.g., Supabase, Vercel, Neon, Cloudflare). |
| **Agent** | An AI agent, automated process, or CLI tool that discovers and provisions services on behalf of a principal. |
| **Principal** | The human user or organization that authorizes the agent to act. The principal is ultimately responsible for billing and resource ownership. |
| **ServiceManifest** | A signed JSON document published by a provider describing its available services, pricing, and endpoints. |
| **Offering** | A specific service within a manifest (e.g., "Managed PostgreSQL", "Edge Functions", "Auth Service"). |
| **Tier** | A pricing and capability level within an offering (e.g., Free, Pro, Enterprise). |
| **Resource** | A provisioned instance of a service. Each resource has a unique `resource_id` and associated credentials. |
| **CredentialBundle** | A JSON object containing (optionally encrypted) credentials for accessing a provisioned resource. |
| **UsageReport** | A provider-submitted document detailing resource consumption for a billing period. |
| **Nonce** | A unique, non-repeating string included in requests to prevent replay attacks. |
| **Payment Proof** | An opaque token or object that proves payment has been made or authorized through the declared payment method. |
| **Trust Tier** | A level of agent identity verification, mapped to external systems like TAP. Values: `none`, `basic`, `verified`, `enterprise`. |

---

## 3. Protocol Objects

### 3.1 ServiceManifest

The root discovery object. Providers MUST publish this at `/.well-known/osp.json` on their domain.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `osp_version` | `string` | REQUIRED | Protocol version. MUST be `"1.0"` for this specification. |
| `manifest_id` | `string` | REQUIRED | A globally unique identifier for this manifest. MUST be a UUID v4. |
| `manifest_version` | `integer` | REQUIRED | Monotonically increasing version number. Starts at `1`. Incremented on any change to the manifest. |
| `published_at` | `string` | REQUIRED | RFC 3339 timestamp of when this manifest version was published. |
| `provider` | `object` | REQUIRED | Provider identity information. See [Provider Object](#provider-object). |
| `offerings` | `array<ServiceOffering>` | REQUIRED | List of service offerings. MUST contain at least one offering. |
| `accepted_payment_methods` | `array<string>` | REQUIRED | Payment methods accepted across all offerings. Individual tiers MAY restrict this further. |
| `trust_tier_required` | `string` | OPTIONAL | Minimum trust tier for any interaction. One of: `none`, `basic`, `verified`, `enterprise`. Default: `none`. |
| `endpoints` | `object` | REQUIRED | Base URLs for provider API endpoints. See [Endpoints Object](#endpoints-object). |
| `extensions` | `object` | OPTIONAL | Provider-specific metadata. Agents SHOULD ignore unrecognized extensions. |
| `provider_signature` | `string` | REQUIRED | Ed25519 signature over the canonical JSON serialization of the manifest (excluding this field). Base64url-encoded. |
| `provider_public_key` | `string` | REQUIRED | The Ed25519 public key used to create `provider_signature`. Base64url-encoded. 32 bytes. |

#### Provider Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_id` | `string` | REQUIRED | A globally unique identifier for the provider. MUST be a UUID v4 or a reverse-domain string (e.g., `"com.supabase"`). |
| `display_name` | `string` | REQUIRED | Human-readable provider name (e.g., `"Supabase"`). Max 128 characters. |
| `description` | `string` | OPTIONAL | Brief description of the provider. Max 512 characters. |
| `homepage_url` | `string` | REQUIRED | The provider's homepage URL. MUST be HTTPS. |
| `support_url` | `string` | OPTIONAL | URL for support or documentation. |
| `logo_url` | `string` | OPTIONAL | URL to a square logo image (PNG or SVG, minimum 128x128). |

#### Endpoints Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `base_url` | `string` | REQUIRED | Base URL for all OSP API endpoints (e.g., `"https://api.supabase.com"`). MUST be HTTPS. |
| `webhook_url` | `string` | OPTIONAL | URL where the agent can register webhooks for async events. |
| `status_page_url` | `string` | OPTIONAL | URL to the provider's public status page. |

#### Example

```json
{
  "osp_version": "1.0",
  "manifest_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "manifest_version": 3,
  "published_at": "2026-03-27T10:00:00Z",
  "provider": {
    "provider_id": "com.supabase",
    "display_name": "Supabase",
    "description": "The open-source Firebase alternative. Postgres database, Auth, Edge Functions, Realtime, and Storage.",
    "homepage_url": "https://supabase.com",
    "support_url": "https://supabase.com/docs",
    "logo_url": "https://supabase.com/brand-assets/supabase-logo-icon.svg"
  },
  "offerings": [
    {
      "offering_id": "supabase/managed-postgres",
      "name": "Managed PostgreSQL",
      "description": "Fully managed PostgreSQL with realtime, auth, and edge functions.",
      "category": "database",
      "tiers": [
        {
          "tier_id": "free",
          "name": "Free",
          "price": {"amount": "0.00", "currency": "USD", "interval": "monthly"}
        }
      ],
      "credentials_schema": {
        "type": "object",
        "required": ["connection_uri"],
        "properties": {
          "connection_uri": {"type": "string", "format": "uri"}
        }
      }
    }
  ],
  "accepted_payment_methods": ["free", "stripe_spt", "sardis_wallet"],
  "trust_tier_required": "none",
  "endpoints": {
    "base_url": "https://api.supabase.com",
    "webhook_url": "https://api.supabase.com/osp/v1/webhooks",
    "status_page_url": "https://status.supabase.com"
  },
  "extensions": {},
  "provider_public_key": "VGhpcyBpcyBhIGJhc2U2NHVybCBlbmNvZGVkIEVkMjU1MTkgcHVibGljIGtleQ",
  "provider_signature": "c2lnbmF0dXJlX292ZXJfY2Fub25pY2FsX2pzb25fc2VyaWFsaXphdGlvbg"
}
```

*(The `offerings` array is shown in abbreviated form here; see Section 3.2 for full offering examples.)*

---

### 3.2 ServiceOffering

A specific service within a provider's manifest.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `offering_id` | `string` | REQUIRED | Globally unique offering identifier. Format: {provider-slug}/{service-slug} (e.g., "supabase/postgres"). MUST match pattern `[a-z0-9-]+/[a-z0-9-]+`, max 128 characters. |
| `name` | `string` | REQUIRED | Human-readable offering name. Max 128 characters. |
| `description` | `string` | REQUIRED | Description of the service. Max 1024 characters. |
| `category` | `string` | REQUIRED | Service category. One of: `database`, `hosting`, `auth`, `storage`, `analytics`, `messaging`, `search`, `compute`, `cdn`, `monitoring`, `ml`, `email`, `dns`, `other`. |
| `tags` | `array<string>` | OPTIONAL | Freeform tags for discovery (e.g., `["postgres", "sql", "relational"]`). Max 20 tags, each max 32 characters. |
| `tiers` | `array<ServiceTier>` | REQUIRED | Available pricing tiers. MUST contain at least one tier. |
| `regions` | `array<string \| RegionObject>` | OPTIONAL | Available deployment regions. Each element is either a string (e.g., `"us-east-1"`) or a RegionObject with jurisdiction metadata (see Section 5.7). Providers SHOULD use RegionObjects when geographic compliance is relevant. If omitted, the provider selects the region. |
| `credentials_schema` | `object` | REQUIRED | JSON Schema describing the shape of credentials delivered upon provisioning. This tells agents what keys to expect. |
| `configuration_schema` | `object` | OPTIONAL | JSON Schema describing optional configuration parameters the agent can pass in the provision request. |
| `estimated_provision_seconds` | `integer` | OPTIONAL | Estimated time to provision in seconds. `0` means synchronous. Default: `0`. |
| `fulfillment_proof_type` | `string` | OPTIONAL | Type of fulfillment proof the provider supplies. One of: `none`, `credential_test`, `health_check_url`, `signed_receipt`. Default: `none`. |
| `documentation_url` | `string` | OPTIONAL | URL to offering-specific documentation. |
| `trust_tier_required` | `string` | OPTIONAL | Override of manifest-level trust tier for this specific offering. |

#### Example

```json
{
  "offering_id": "supabase/managed-postgres",
  "name": "Managed PostgreSQL",
  "description": "Fully managed PostgreSQL database with automatic backups, connection pooling, and read replicas.",
  "category": "database",
  "tags": ["postgres", "sql", "relational", "acid"],
  "tiers": [
    {
      "tier_id": "free",
      "name": "Free",
      "price": {"amount": "0.00", "currency": "USD", "interval": "monthly"}
    },
    {
      "tier_id": "pro",
      "name": "Pro",
      "price": {"amount": "25.00", "currency": "USD", "interval": "monthly"}
    }
  ],
  "regions": ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
  "credentials_schema": {
    "type": "object",
    "properties": {
      "connection_uri": {
        "type": "string",
        "description": "PostgreSQL connection URI",
        "format": "uri"
      },
      "host": {
        "type": "string",
        "description": "Database host"
      },
      "port": {
        "type": "integer",
        "description": "Database port"
      },
      "database": {
        "type": "string",
        "description": "Database name"
      },
      "username": {
        "type": "string",
        "description": "Database username"
      },
      "password": {
        "type": "string",
        "description": "Database password"
      },
      "ssl_mode": {
        "type": "string",
        "description": "SSL connection mode"
      }
    },
    "required": ["connection_uri", "host", "port", "database", "username", "password"]
  },
  "configuration_schema": {
    "type": "object",
    "properties": {
      "postgres_version": {
        "type": "string",
        "enum": ["15", "16", "17"],
        "default": "17",
        "description": "PostgreSQL major version"
      },
      "enable_pooling": {
        "type": "boolean",
        "default": true,
        "description": "Enable PgBouncer connection pooling"
      }
    }
  },
  "estimated_provision_seconds": 30,
  "fulfillment_proof_type": "credential_test",
  "documentation_url": "https://supabase.com/docs/guides/database"
}
```

*(The `tiers` and `regions` arrays are shown in abbreviated form here; see Section 3.3 for full tier examples and Section 5.7 for RegionObject examples with jurisdiction metadata.)*

#### RegionObject

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | REQUIRED | Region identifier (e.g., `"us-east-1"`). |
| `jurisdiction` | `string` | OPTIONAL | ISO 3166-1 alpha-2 country code or region code (e.g., `"US"`, `"EU"`, `"SG"`). |
| `provider_region` | `string` | OPTIONAL | Provider's internal region name (e.g., `"aws-us-east-1"`). |
| `gdpr_compliant` | `boolean` | OPTIONAL | Whether the region complies with GDPR. |
| `certifications` | `array<string>` | OPTIONAL | Compliance certifications (e.g., `"soc2-type-ii"`, `"iso-27001"`). |

---

### 3.3 ServiceTier

A pricing and capability level within a service offering.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tier_id` | `string` | REQUIRED | Unique identifier within the offering. MUST be a slug (`[a-z0-9-]+`, max 64 characters). |
| `name` | `string` | REQUIRED | Human-readable tier name (e.g., `"Free"`, `"Pro"`, `"Enterprise"`). Max 64 characters. |
| `description` | `string` | OPTIONAL | Description of what this tier includes. Max 512 characters. |
| `price` | `object` | REQUIRED | Pricing information. See [Price Object](#price-object). |
| `limits` | `object` | OPTIONAL | Resource limits for this tier. Provider-defined key-value pairs. See [Limits Object](#limits-object). |
| `features` | `array<string>` | OPTIONAL | List of features included in this tier (e.g., `["automatic_backups", "read_replicas"]`). |
| `escrow_profile` | `object` | OPTIONAL | Escrow configuration for payment protection. See [Escrow Profile Object](#escrow-profile-object). |
| `rate_limit` | `object` | OPTIONAL | Rate limiting applied to provisioned resources. See [Rate Limit Object](#rate-limit-object). |
| `accepted_payment_methods` | `array<string>` | OPTIONAL | Payment methods accepted for this specific tier. If omitted, inherits from the manifest level. |
| `trust_tier_required` | `string` | OPTIONAL | Override of offering-level trust tier for this specific tier. |
| `auto_deprovision` | `boolean` | OPTIONAL | Whether the resource is automatically deprovisioned when the billing period ends without renewal. Default: `false`. |
| `sla` | `object` | OPTIONAL | Service level agreement. See [SLA Object](#sla-object). |

#### Price Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | `string` | REQUIRED | Price amount as a decimal string (e.g., `"0.00"`, `"25.00"`, `"0.005"`). Use `"0.00"` for free tiers. |
| `currency` | `string` | REQUIRED | ISO 4217 currency code (e.g., `"USD"`, `"EUR"`) or `"USDC"` for stablecoin payments. |
| `interval` | `string` | REQUIRED | Billing interval. One of: `one_time`, `hourly`, `daily`, `monthly`, `yearly`. |
| `metered` | `boolean` | OPTIONAL | Whether this tier uses usage-based pricing in addition to the base amount. Default: `false`. |
| `metered_dimensions` | `array<object>` | OPTIONAL | If `metered` is `true`, describes the usage dimensions. See [Metered Dimension Object](#metered-dimension-object). |

#### Metered Dimension Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dimension_id` | `string` | REQUIRED | Unique identifier for this dimension (e.g., `"storage_gb"`, `"api_calls"`). |
| `name` | `string` | REQUIRED | Human-readable name. |
| `unit` | `string` | REQUIRED | Unit of measurement (e.g., `"GB"`, `"requests"`, `"hours"`). |
| `price_per_unit` | `string` | REQUIRED | Price per unit as a decimal string. |
| `included_quantity` | `string` | OPTIONAL | Quantity included in the base price before metered charges apply. Default: `"0"`. |

#### Limits Object

The `limits` object contains provider-defined key-value pairs describing resource constraints. Keys SHOULD use snake_case and be descriptive. Values MUST be numbers or strings.

Common limit keys (RECOMMENDED but not required):

| Key | Type | Description |
|-----|------|-------------|
| `max_storage_gb` | `number` | Maximum storage in gigabytes |
| `max_connections` | `number` | Maximum concurrent connections |
| `max_rows` | `number` | Maximum number of rows |
| `max_bandwidth_gb_month` | `number` | Maximum monthly bandwidth in GB |
| `max_requests_per_second` | `number` | Maximum requests per second |
| `max_compute_hours` | `number` | Maximum compute hours per billing period |
| `max_projects` | `number` | Maximum number of projects/databases |

#### Escrow Profile Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `required` | `boolean` | REQUIRED | Whether escrow is required for this tier. |
| `provider` | `string` | OPTIONAL | Escrow provider identifier (e.g., `"sardis"`, `"custom"`). |
| `release_condition` | `string` | OPTIONAL | Condition for releasing escrowed funds. One of: `provision_success`, `uptime_24h`, `uptime_7d`, `manual`. |
| `dispute_window_hours` | `integer` | OPTIONAL | Number of hours after provisioning during which disputes can be raised. Default: `72`. |

#### Rate Limit Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requests_per_second` | `integer` | OPTIONAL | Maximum API requests per second to the OSP management endpoints for this resource. |
| `requests_per_minute` | `integer` | OPTIONAL | Maximum API requests per minute. |
| `burst` | `integer` | OPTIONAL | Maximum burst size above the sustained rate. |

#### SLA Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uptime_percent` | `string` | OPTIONAL | Target uptime percentage (e.g., "99.9", "99.95"). |
| `response_time_p50_ms` | `integer` | OPTIONAL | Target p50 response time in milliseconds. |
| `response_time_p99_ms` | `integer` | OPTIONAL | Target p99 response time in milliseconds. |
| `support_response_hours` | `integer` | OPTIONAL | Maximum support response time in hours. |
| `sla_url` | `string` | OPTIONAL | URL to the full SLA document. |

Providers declaring SLA fields SHOULD honor them. SLA violations MAY be cited as evidence in disputes (Section 6.8).

#### Example

```json
{
  "tier_id": "free",
  "name": "Free",
  "description": "Perfect for hobby projects and experimentation. No credit card required.",
  "price": {
    "amount": "0.00",
    "currency": "USD",
    "interval": "monthly",
    "metered": false
  },
  "limits": {
    "max_storage_gb": 0.5,
    "max_rows": 50000,
    "max_connections": 10,
    "max_bandwidth_gb_month": 2,
    "max_projects": 2
  },
  "features": ["automatic_backups_daily", "community_support"],
  "accepted_payment_methods": ["free"],
  "auto_deprovision": false
}
```

```json
{
  "tier_id": "pro",
  "name": "Pro",
  "description": "For production workloads with dedicated resources and priority support.",
  "price": {
    "amount": "25.00",
    "currency": "USD",
    "interval": "monthly",
    "metered": true,
    "metered_dimensions": [
      {
        "dimension_id": "storage_gb",
        "name": "Database Storage",
        "unit": "GB",
        "price_per_unit": "0.125",
        "included_quantity": "8"
      },
      {
        "dimension_id": "bandwidth_gb",
        "name": "Data Transfer",
        "unit": "GB",
        "price_per_unit": "0.09",
        "included_quantity": "50"
      }
    ]
  },
  "limits": {
    "max_storage_gb": 100,
    "max_rows": "unlimited",
    "max_connections": 100,
    "max_bandwidth_gb_month": 250,
    "max_projects": 10
  },
  "features": [
    "automatic_backups_daily",
    "point_in_time_recovery",
    "read_replicas",
    "priority_support",
    "connection_pooling"
  ],
  "escrow_profile": {
    "required": false,
    "provider": "sardis",
    "release_condition": "provision_success",
    "dispute_window_hours": 72
  },
  "rate_limit": {
    "requests_per_second": 10,
    "burst": 50
  },
  "accepted_payment_methods": ["stripe_spt", "sardis_wallet"],
  "auto_deprovision": true
}
```

---

### 3.4 ProvisionRequest

The object an agent sends to provision a service.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `offering_id` | `string` | REQUIRED | The `offering_id` from the provider's manifest. |
| `tier_id` | `string` | REQUIRED | The `tier_id` from the selected offering. |
| `project_name` | `string` | OPTIONAL | A human-readable name for the resource (e.g., `"my-app-db"`). Max 64 characters, `[a-z0-9-]+`. |
| `region` | `string` | OPTIONAL | Desired deployment region. MUST be one of the offering's `regions`. If omitted, the provider selects. |
| `configuration` | `object` | OPTIONAL | Configuration parameters matching the offering's `configuration_schema`. |
| `payment_method` | `string` | REQUIRED | The payment method being used. MUST be one of the tier's `accepted_payment_methods`. |
| `payment_proof` | `object` | OPTIONAL | Proof of payment or payment authorization. Structure depends on `payment_method`. Required when `payment_method` is not `free`. See [Section 7.1](#71-payment-methods). |
| `agent_public_key` | `string` | OPTIONAL | Agent's Ed25519 public key for credential encryption. Base64url-encoded, 32 bytes. If provided, the provider MUST encrypt sensitive credentials. |
| `nonce` | `string` | REQUIRED | Unique request identifier for replay protection. MUST be a UUID v4 or a random string of at least 32 characters. |
| `idempotency_key` | `string` | OPTIONAL | If provided, the provider MUST return the same response for duplicate requests with this key within 24 hours. |
| `webhook_url` | `string` | OPTIONAL | URL where the provider should send provisioning status updates. MUST be HTTPS. |
| `tier_change` | `object` | OPTIONAL | If this request is a tier change for an existing resource. See [Tier Change Object](#tier-change-object). |
| `principal_id` | `string` | OPTIONAL | Identifier for the principal (human/org) authorizing this provisioning. Opaque to OSP, but providers SHOULD validate principal_id ownership through one of: (1) the agent_attestation token binding the agent to this principal, (2) a separate principal verification API, or (3) treating principal_id as advisory only for rate-limiting purposes. Providers MUST NOT rely on principal_id alone for authorization -- use agent_attestation for security-critical decisions. |
| `agent_attestation` | `string` | OPTIONAL | TAP or equivalent attestation token proving the agent's identity and trust tier. |
| `metadata` | `object` | OPTIONAL | Arbitrary key-value metadata. Max 20 keys, keys max 64 characters, values max 256 characters. See [Structured Tags](#structured-tags) for recommended conventions. |

#### Tier Change Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resource_id` | `string` | REQUIRED | The ID of the existing resource to change. |
| `previous_tier_id` | `string` | REQUIRED | The current tier of the resource. |
| `proration` | `string` | OPTIONAL | Requested proration behavior. One of: `immediate`, `next_period`, `none`. Default: provider-defined. |

#### Example

```json
{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "project_name": "my-saas-db",
  "region": "us-east-1",
  "configuration": {
    "postgres_version": "17",
    "enable_pooling": true
  },
  "payment_method": "stripe_spt",
  "payment_proof": {
    "spt_token": "spt_1234567890abcdef",
    "amount": "25.00",
    "currency": "USD"
  },
  "agent_public_key": "YWdlbnRfcHVibGljX2tleV9lZDI1NTE5X2Jhc2U2NHVybA",
  "nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "idempotency_key": "provision-my-saas-db-2026-03-27",
  "webhook_url": "https://agent.example.com/hooks/osp",
  "principal_id": "org_abc123",
  "metadata": {
    "environment": "production",
    "team": "backend"
  }
}
```

#### Structured Tags

While `metadata` is freeform, agents and providers SHOULD follow these conventions for interoperability:

| Key Pattern | Description | Example |
|-------------|-------------|---------|
| `env` | Deployment environment | `"production"`, `"staging"`, `"development"` |
| `team` | Owning team | `"backend"`, `"data-science"` |
| `project` | Project identifier | `"my-saas-app"` |
| `cost_center` | Billing allocation | `"eng-infra-2026"` |
| `osp_stack_id` | Multi-resource stack identifier | `"stack_my-backend"` |
| `osp_stack_step` | Position in stack provisioning | `"2/3"` |
| `data_residency` | Required data jurisdiction | `"EU"`, `"US"` |
| `compliance_frameworks` | Comma-separated compliance requirements | `"gdpr,soc2,hipaa"` |
| `ttl_hours` | Requested resource lifetime | `"720"` (30 days) |
| `managed_by` | Tool or system that created this resource | `"claude-code"`, `"cursor"`, `"github-actions"` |

Tags with the `osp_` prefix are reserved for protocol use. Providers MUST pass `osp_`-prefixed tags through to their logging and billing systems. Custom tags SHOULD use reverse-domain notation to avoid collisions (e.g., `com.acme.department`).

**Filtering by tags:** The `GET /osp/v1/status` endpoint (when listing resources) and the registry search endpoint SHOULD support filtering by metadata tags.

---

### 3.5 ProvisionResponse

The object a provider returns after processing a provision request.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resource_id` | `string` | REQUIRED | Globally unique identifier for the provisioned resource. MUST be a UUID v4 or provider-scoped unique string. |
| `offering_id` | `string` | REQUIRED | The offering that was provisioned. |
| `tier_id` | `string` | REQUIRED | The tier that was provisioned. |
| `status` | `string` | REQUIRED | Current provisioning status. One of: `provisioned`, `provisioning`, `failed`. |
| `credentials_bundle` | `CredentialBundle` | OPTIONAL | Credentials for the resource. REQUIRED when `status` is `provisioned`. MUST be absent when `status` is `provisioning` or `failed`. |
| `estimated_ready_seconds` | `integer` | OPTIONAL | Estimated seconds until the resource is ready. REQUIRED when `status` is `provisioning`. |
| `poll_url` | `string` | OPTIONAL | URL to poll for status updates. REQUIRED when `status` is `provisioning`. |
| `webhook_supported` | `boolean` | OPTIONAL | Whether the provider will send webhook notifications. Default: `false`. |
| `region` | `string` | OPTIONAL | The actual region where the resource was deployed. |
| `created_at` | `string` | REQUIRED | RFC 3339 timestamp of resource creation. |
| `expires_at` | `string` | OPTIONAL | RFC 3339 timestamp of when the resource will be automatically deprovisioned (for free tiers or trials). |
| `dashboard_url` | `string` | OPTIONAL | URL to a web dashboard for this resource (for human inspection). |
| `error` | `object` | OPTIONAL | Error details when `status` is `failed`. See [Error Object](#error-object). |

#### Error Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | REQUIRED | Machine-readable error code. See [Error Codes](#error-codes). |
| `message` | `string` | REQUIRED | Human-readable error message. |
| `details` | `object` | OPTIONAL | Additional error context. |
| `retryable` | `boolean` | REQUIRED | Whether the agent SHOULD retry the request. |
| `retry_after_seconds` | `integer` | OPTIONAL | Suggested wait time before retrying. |

#### Error Codes

| Code | Description |
|------|-------------|
| `invalid_offering` | The specified `offering_id` does not exist. |
| `invalid_tier` | The specified `tier_id` does not exist within the offering. |
| `invalid_region` | The specified region is not available for this offering. |
| `invalid_configuration` | The configuration object does not match the offering's `configuration_schema`. |
| `payment_required` | Payment proof is missing or invalid. |
| `payment_declined` | The payment method was declined. |
| `insufficient_funds` | The payment method has insufficient funds. |
| `trust_tier_insufficient` | The agent's trust tier does not meet the minimum requirement. |
| `quota_exceeded` | The principal has exceeded their quota for this offering. |
| `region_unavailable` | The requested region is temporarily unavailable. |
| `nonce_reused` | The nonce has already been used. |
| `rate_limited` | Too many requests. Check `retry_after_seconds`. |
| `provider_error` | An internal provider error occurred. |
| `capacity_exhausted` | The provider has no available capacity. |

#### Example: Synchronous Success

```json
{
  "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_abc:pass_xyz@db.supabase.co:5432/postgres",
      "host": "db.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_abc",
      "password": "pass_xyz",
      "ssl_mode": "require"
    },
    "delivery_proof": {
      "type": "credential_test",
      "test_query": "SELECT 1",
      "verified_at": "2026-03-27T12:00:05Z"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 720,
    "issued_at": "2026-03-27T12:00:00Z"
  },
  "region": "us-east-1",
  "created_at": "2026-03-27T12:00:00Z",
  "dashboard_url": "https://app.supabase.com/project/abc123"
}
```

#### Example: Asynchronous Provisioning

```json
{
  "resource_id": "res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "status": "provisioning",
  "estimated_ready_seconds": 45,
  "poll_url": "https://api.supabase.com/osp/v1/status/res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  "webhook_supported": true,
  "region": "us-east-1",
  "created_at": "2026-03-27T12:01:00Z"
}
```

#### Example: Failure

```json
{
  "resource_id": "res_00000000-0000-0000-0000-000000000000",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "status": "failed",
  "created_at": "2026-03-27T12:02:00Z",
  "error": {
    "code": "payment_declined",
    "message": "The Stripe payment token was declined. Please check your payment method.",
    "details": {
      "stripe_error_code": "card_declined",
      "decline_code": "insufficient_funds"
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

### 3.6 CredentialBundle

Encrypted or plaintext credentials for a provisioned resource.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | `string` | REQUIRED | Credential format. One of: `plaintext`, `encrypted`. |
| `credentials` | `object` | OPTIONAL | Plaintext credentials matching the offering's `credentials_schema`. REQUIRED when `format` is `plaintext`. MUST be absent when `format` is `encrypted`. |
| `encrypted_credentials` | `object` | OPTIONAL | Encrypted credentials. REQUIRED when `format` is `encrypted`. See [Encrypted Credentials Object](#encrypted-credentials-object). |
| `delivery_proof` | `object` | OPTIONAL | Proof that the credentials are valid. See [Delivery Proof Object](#delivery-proof-object). |
| `rotation_supported` | `boolean` | REQUIRED | Whether the provider supports credential rotation for this resource. |
| `rotation_interval_hours` | `integer` | OPTIONAL | Recommended rotation interval in hours. Only meaningful when `rotation_supported` is `true`. |
| `issued_at` | `string` | REQUIRED | RFC 3339 timestamp of when the credentials were generated. |
| `expires_at` | `string` | OPTIONAL | RFC 3339 timestamp of when the credentials expire (if applicable). |
| `scope` | `string` | OPTIONAL | Access level of the credentials. One of: `admin`, `read_write`, `read_only`, `custom`. Default: `admin` (full access). |
| `scope_description` | `string` | OPTIONAL | Human-readable description of what the credentials can do (e.g., "Read/write access to database, no schema modifications"). |
| `scope_restrictions` | `array<string>` | OPTIONAL | Machine-readable list of restrictions (e.g., `["no_ddl", "no_delete", "read_only_replicas"]`). Provider-defined. |

#### Encrypted Credentials Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `algorithm` | `string` | REQUIRED | Encryption algorithm. MUST be `"x25519-xsalsa20-poly1305"` (NaCl box using X25519 key agreement derived from Ed25519 keys, with XSalsa20-Poly1305 AEAD). |
| `agent_public_key` | `string` | REQUIRED | The agent's Ed25519 public key that was used (for verification). Base64url-encoded. |
| `provider_ephemeral_public_key` | `string` | REQUIRED | The provider's ephemeral X25519 public key used for this encryption. Base64url-encoded. |
| `nonce` | `string` | REQUIRED | Encryption nonce. Base64url-encoded, 24 bytes. |
| `ciphertext` | `string` | REQUIRED | Encrypted JSON credentials. Base64url-encoded. The plaintext is the JSON serialization of the `credentials` object. |

#### Delivery Proof Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | REQUIRED | Proof type matching the offering's `fulfillment_proof_type`. One of: `none`, `credential_test`, `health_check_url`, `signed_receipt`. |
| `test_query` | `string` | OPTIONAL | For `credential_test`: the query or operation that was used to verify. |
| `health_check_url` | `string` | OPTIONAL | For `health_check_url`: URL the agent can hit to verify the resource is running. |
| `signed_receipt` | `string` | OPTIONAL | For `signed_receipt`: Ed25519 signature over `resource_id + issued_at`. Base64url-encoded. |
| `verified_at` | `string` | OPTIONAL | RFC 3339 timestamp of when the proof was generated. |

#### Credential Scope

Credentials MAY be scoped to limit the agent's access level. This is critical for least-privilege security:

1. Providers SHOULD issue the minimum scope needed for the tier's functionality.
2. Agents MAY request a specific scope in the `ProvisionRequest.configuration`:

```json
"configuration": {
  "credential_scope": "read_write"
}
```

3. If the provider cannot honor the requested scope, it SHOULD provision with the closest available scope and indicate the actual scope in the `CredentialBundle`.
4. Providers SHOULD support issuing multiple credential sets with different scopes for the same resource (e.g., one admin credential for migrations, one read_only for the application).

**Example scoped credentials:**

```json
{
  "format": "plaintext",
  "scope": "read_write",
  "scope_description": "Read/write access to all tables. Cannot modify schema or manage users.",
  "scope_restrictions": ["no_ddl", "no_user_management"],
  "credentials": {
    "connection_uri": "postgresql://app_user:pass@db.example.com:5432/main",
    "username": "app_user",
    "password": "pass_xyz"
  },
  "rotation_supported": true,
  "issued_at": "2026-03-27T12:00:00Z"
}
```

#### Example: Encrypted Credentials

```json
{
  "format": "encrypted",
  "encrypted_credentials": {
    "algorithm": "x25519-xsalsa20-poly1305",
    "agent_public_key": "YWdlbnRfcHVibGljX2tleV9lZDI1NTE5X2Jhc2U2NHVybA",
    "provider_ephemeral_public_key": "ZXBoZW1lcmFsX3B1YmxpY19rZXlfeDI1NTE5",
    "nonce": "dW5pcXVlXzI0X2J5dGVfbm9uY2VfaGVyZQ",
    "ciphertext": "ZW5jcnlwdGVkX2pzb25fY3JlZGVudGlhbHNfZ29faGVyZQ"
  },
  "delivery_proof": {
    "type": "credential_test",
    "test_query": "SELECT 1",
    "verified_at": "2026-03-27T12:00:05Z"
  },
  "rotation_supported": true,
  "rotation_interval_hours": 720,
  "issued_at": "2026-03-27T12:00:00Z"
}
```

---

### 3.7 UsageReport

Provider-submitted billing data for usage-based pricing.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `report_id` | `string` | REQUIRED | Unique identifier for this report. UUID v4. |
| `resource_id` | `string` | REQUIRED | The resource this report covers. |
| `period_start` | `string` | REQUIRED | RFC 3339 timestamp for the start of the billing period. |
| `period_end` | `string` | REQUIRED | RFC 3339 timestamp for the end of the billing period. |
| `line_items` | `array<LineItem>` | REQUIRED | Itemized usage charges. |
| `base_amount` | `string` | REQUIRED | The base tier price for this period (e.g., `"25.00"`). |
| `metered_amount` | `string` | REQUIRED | Total metered charges above the base price. |
| `total_amount` | `string` | REQUIRED | Total amount due (`base_amount` + `metered_amount`). |
| `currency` | `string` | REQUIRED | ISO 4217 currency code. |
| `provider_signature` | `string` | REQUIRED | Ed25519 signature over the canonical JSON serialization (excluding this field). |
| `generated_at` | `string` | REQUIRED | RFC 3339 timestamp of when the report was generated. |

#### LineItem Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dimension_id` | `string` | REQUIRED | Matches a `metered_dimension` from the tier. |
| `description` | `string` | REQUIRED | Human-readable description of the charge. |
| `quantity` | `string` | REQUIRED | Usage quantity as a decimal string. |
| `unit` | `string` | REQUIRED | Unit of measurement. |
| `included_quantity` | `string` | REQUIRED | Quantity included in the base price. |
| `billable_quantity` | `string` | REQUIRED | Quantity above the included amount (`quantity - included_quantity`, minimum `"0"`). |
| `unit_price` | `string` | REQUIRED | Price per unit as a decimal string. |
| `amount` | `string` | REQUIRED | Total charge for this line item (`billable_quantity * unit_price`). |

#### Example

```json
{
  "report_id": "rpt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "resource_id": "res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  "period_start": "2026-03-01T00:00:00Z",
  "period_end": "2026-04-01T00:00:00Z",
  "line_items": [
    {
      "dimension_id": "storage_gb",
      "description": "Database Storage",
      "quantity": "12.5",
      "unit": "GB",
      "included_quantity": "8",
      "billable_quantity": "4.5",
      "unit_price": "0.125",
      "amount": "0.56"
    },
    {
      "dimension_id": "bandwidth_gb",
      "description": "Data Transfer",
      "quantity": "32.1",
      "unit": "GB",
      "included_quantity": "50",
      "billable_quantity": "0",
      "unit_price": "0.09",
      "amount": "0.00"
    }
  ],
  "base_amount": "25.00",
  "metered_amount": "0.56",
  "total_amount": "25.56",
  "currency": "USD",
  "provider_signature": "c2lnbmVkX3VzYWdlX3JlcG9ydF9lZDI1NTE5",
  "generated_at": "2026-04-01T00:05:00Z"
}
```

---

## 4. Discovery

### 4.1 Well-Known Endpoint

Providers MUST publish a valid ServiceManifest at the following URL on their domain:

```
https://{provider-domain}/.well-known/osp.json
```

**Requirements:**

1. The endpoint MUST respond with `Content-Type: application/json`.
2. The endpoint MUST use HTTPS (TLS 1.2+, TLS 1.3 RECOMMENDED).
3. The endpoint MUST respond within 10 seconds.
4. The endpoint SHOULD set `Cache-Control` headers with a `max-age` of at least 300 seconds (5 minutes) and no more than 86400 seconds (24 hours).
5. The endpoint MUST support `GET` requests and SHOULD support `HEAD` requests.
6. The response MUST include an `ETag` header for efficient caching.

**Example request:**

```http
GET /.well-known/osp.json HTTP/1.1
Host: supabase.com
Accept: application/json
```

**Example response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600
ETag: "v3-abc123"

{...ServiceManifest...}
```

### 4.2 Registry

OSP supports an optional centralized registry for aggregated discovery. A registry is a service that indexes multiple providers' manifests to enable cross-provider search.

**Registry interaction is not required for OSP conformance.** Agents MAY discover providers through registries, direct URL, out-of-band knowledge, or any other mechanism.

#### Registry API (Informative)

A conformant registry SHOULD implement:

**`GET /osp/registry/v1/search`**

Query parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | `string` | Filter by offering category. |
| `tags` | `string` | Comma-separated tags to match. |
| `payment_method` | `string` | Filter by accepted payment method. |
| `trust_tier` | `string` | Filter by maximum trust tier required. |
| `q` | `string` | Free-text search across provider names, offering names, and descriptions. |
| `limit` | `integer` | Maximum results to return. Default: 20. Max: 100. |
| `starting_after` | `string` | Cursor-based pagination. The `provider_id` after which to return results. Mutually exclusive with `offset`. RECOMMENDED over `offset` for stable pagination at scale. |
| `offset` | `integer` | Offset-based pagination. Default: 0. DEPRECATED in favor of `starting_after` — supported for backward compatibility but NOT RECOMMENDED for new implementations. |

**Example request:**

```http
GET /osp/registry/v1/search?category=database&payment_method=free&q=postgres HTTP/1.1
Host: registry.osp.dev
Accept: application/json
```

**Example response:**

```json
{
  "results": [
    {
      "provider_id": "com.supabase",
      "display_name": "Supabase",
      "manifest_url": "https://supabase.com/.well-known/osp.json",
      "offerings_matched": [
        {
          "offering_id": "supabase/managed-postgres",
          "name": "Managed PostgreSQL",
          "category": "database",
          "has_free_tier": true,
          "lowest_price": { "amount": "0.00", "currency": "USD", "interval": "monthly" }
        }
      ],
      "trust_tier_required": "none",
      "manifest_verified": true,
      "last_verified_at": "2026-03-27T06:00:00Z"
    },
    {
      "provider_id": "com.neon",
      "display_name": "Neon",
      "manifest_url": "https://neon.tech/.well-known/osp.json",
      "offerings_matched": [
        {
          "offering_id": "neon/serverless-postgres",
          "name": "Serverless PostgreSQL",
          "category": "database",
          "has_free_tier": true,
          "lowest_price": { "amount": "0.00", "currency": "USD", "interval": "monthly" }
        }
      ],
      "trust_tier_required": "none",
      "manifest_verified": true,
      "last_verified_at": "2026-03-27T06:00:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

#### Provider Self-Registration

Providers register with a registry by submitting their manifest URL:

```http
POST /osp/registry/v1/register HTTP/1.1
Host: registry.osp.dev
Content-Type: application/json

{
  "manifest_url": "https://supabase.com/.well-known/osp.json"
}
```

The registry MUST:
1. Fetch the manifest from the submitted URL.
2. Verify the `provider_signature`.
3. Confirm the manifest URL domain matches `provider.homepage_url` or that the manifest includes a DNS TXT record verification (see Section 4.3).
4. Index the manifest for search.

The registry MUST NOT:
1. Require approval or manual review for registration.
2. Charge providers for basic listing.
3. Modify or proxy the provider's manifest.

### 4.3 Manifest Verification

Agents MUST verify the `provider_signature` before trusting any manifest. Verification proceeds as follows:

1. **Extract the signature and public key.** Read `provider_signature` and `provider_public_key` from the manifest.
2. **Construct the signing payload.** Create a copy of the manifest JSON, remove the `provider_signature` field, and serialize to canonical JSON (keys sorted alphabetically at all levels, no whitespace, no trailing commas, UTF-8 encoding).
3. **Verify the Ed25519 signature.** Using the `provider_public_key`, verify that `provider_signature` is a valid Ed25519 signature over the canonical JSON bytes.

If verification fails, the agent MUST reject the manifest and MUST NOT provision any services from it.

**Public key binding.** To establish that the `provider_public_key` actually belongs to the provider (and not an attacker serving a modified manifest), agents SHOULD use at least one of:

- **TLS origin verification:** The manifest was fetched over HTTPS from the provider's domain. This binds the key to whoever controls the domain's TLS certificate.
- **DNS TXT record:** The provider publishes a DNS TXT record at `_osp.{domain}` containing the base64url-encoded public key. Example: `_osp.supabase.com TXT "VGhpcyBpcyBhIGJhc2U2NHVybA"`.
- **Registry attestation:** A trusted registry has independently verified the key binding.

### 4.4 Manifest Versioning

Manifests are **immutable once published** for a given `manifest_version`. Any change to the manifest (adding offerings, changing prices, updating endpoints) MUST increment `manifest_version`.

Previous manifest versions SHOULD be accessible at:

```
https://{provider-domain}/.well-known/osp.v{N}.json
```

where `{N}` is the version number. For example, version 2 would be at `/.well-known/osp.v2.json`.

The canonical `/.well-known/osp.json` MUST always serve the latest version.

Providers SHOULD maintain at least the 3 most recent versions to allow agents to handle transitions gracefully.

**Version negotiation.** When an agent has cached a manifest at version `N` and discovers the provider is now at version `M` (where `M > N`), the agent SHOULD:

1. Fetch the new manifest.
2. Verify its signature.
3. Check for breaking changes (removed offerings, changed pricing, removed payment methods).
4. Update its local cache.

### 4.5 Offering Deprecation and Sunset

Providers MAY deprecate offerings or tiers that they intend to discontinue.

#### Deprecation Fields

ServiceOffering and ServiceTier objects support the following optional deprecation fields:

| Field | Type | Description |
|-------|------|-------------|
| `deprecated` | `boolean` | Whether this offering/tier is deprecated. Default: `false`. |
| `deprecated_at` | `string` | RFC 3339 timestamp of when the deprecation was announced. |
| `sunset_at` | `string` | RFC 3339 timestamp of when the offering/tier will cease to function. |
| `successor_id` | `string` | The `offering_id` or `tier_id` that replaces this one. |
| `migration_guide_url` | `string` | URL to documentation on how to migrate. |

#### Deprecation Rules

1. Providers MUST give at least 90 days notice between `deprecated_at` and `sunset_at`.
2. Existing provisioned resources MUST continue to function until `sunset_at`.
3. New provisioning requests for deprecated offerings/tiers SHOULD return a warning header: `X-OSP-Deprecated: sunset={sunset_at}; successor={successor_id}`.
4. After `sunset_at`, provisioning requests for the deprecated offering/tier MUST return `410 Gone`.
5. Existing resources MUST be given a 30-day grace period after `sunset_at` during which they continue to function but cannot be renewed.
6. Providers MUST notify agents with active resources via webhook (`event: "offering.deprecated"`) when deprecation is announced.

#### Example

```json
{
  "offering_id": "supabase/postgres-v15",
  "name": "Managed PostgreSQL 15",
  "deprecated": true,
  "deprecated_at": "2026-03-01T00:00:00Z",
  "sunset_at": "2026-06-01T00:00:00Z",
  "successor_id": "supabase/postgres-v17",
  "migration_guide_url": "https://supabase.com/docs/migrate-pg15-to-pg17",
  ...
}
```

### 4.6 Service Templates (Stacks)

The OSP registry MAY publish **service templates** — pre-configured combinations of services that work well together. Templates are informative, not prescriptive.

#### Template Format

```json
{
  "template_id": "nextjs-starter",
  "name": "Next.js Full-Stack Starter",
  "description": "Production-ready Next.js app with database, auth, and analytics",
  "category": "web-application",
  "resources": [
    {
      "alias": "database",
      "offering_id": "supabase/managed-postgres",
      "tier_id": "pro",
      "required": true,
      "alternatives": ["neon/serverless-postgres", "turso/libsql"]
    },
    {
      "alias": "hosting",
      "offering_id": "vercel/hosting",
      "tier_id": "pro",
      "required": true,
      "depends_on": ["database"],
      "configuration": {
        "framework": "nextjs",
        "environment_variables": {
          "DATABASE_URL": "${database.credentials.connection_uri}"
        }
      },
      "alternatives": ["railway/hosting"]
    },
    {
      "alias": "auth",
      "offering_id": "clerk/auth",
      "tier_id": "free",
      "required": false,
      "alternatives": ["supabase/auth"]
    },
    {
      "alias": "analytics",
      "offering_id": "posthog/analytics",
      "tier_id": "free",
      "required": false
    }
  ],
  "estimated_total_monthly": {"amount": "50.00", "currency": "USD"},
  "author": "osp-community",
  "version": 1
}
```

**Key features:**

- `alternatives` — Agent can substitute equivalent services (Supabase → Neon for database)
- `depends_on` — Provisioning order. `${alias.credentials.field}` references inject upstream credentials
- `required` vs optional resources — Agent can skip optional resources
- `estimated_total_monthly` — Sum of all required resource base prices

**Registry template endpoint:**

```http
GET /osp/registry/v1/templates?category=web-application HTTP/1.1
Host: registry.osp.dev
```

Templates are authored by the community and curated by registry operators. Providers MAY submit templates that showcase their services.

### 4.7 Provider Compatibility

Providers MAY declare compatibility with other providers' services in their manifest's `extensions` field. This helps agents choose complementary services.

```json
"extensions": {
  "osp_compatibility": {
    "works_well_with": [
      {"offering_id": "vercel/hosting", "reason": "Native Supabase integration, automatic env var injection"},
      {"offering_id": "clerk/auth", "reason": "Supabase Auth alternative with SSO support"}
    ],
    "migrates_from": [
      {"offering_id": "neon/serverless-postgres", "format": "pg_dump", "effort": "low"},
      {"offering_id": "planetscale/mysql", "format": "csv", "effort": "high", "note": "Schema translation required (MySQL → Postgres)"}
    ],
    "integrations": [
      {"name": "Prisma", "documentation_url": "https://supabase.com/docs/guides/prisma"},
      {"name": "Drizzle ORM", "documentation_url": "https://supabase.com/docs/guides/drizzle"}
    ]
  }
}
```

**Fields:**

| Field | Description |
|-------|-------------|
| `works_well_with` | Services that have native integrations or are commonly used together |
| `migrates_from` | Services that users can migrate from, with effort level and format |
| `integrations` | Developer tools and ORMs with documented integration guides |

This data is informative — agents SHOULD use it to make recommendations but MUST NOT treat it as authoritative (providers have incentives to promote their own ecosystem).

The registry MAY independently verify compatibility claims and surface them in search results.

---

## 5. Provisioning

### 5.1 Synchronous Flow (Happy Path)

The standard provisioning flow when resources can be created immediately:

```
Agent                                Provider
  |                                     |
  |  1. GET /.well-known/osp.json       |
  |------------------------------------>|
  |  2. ServiceManifest                  |
  |<------------------------------------|
  |                                     |
  |  3. [Verify manifest signature]      |
  |                                     |
  |  4. [Select offering + tier]         |
  |                                     |
  |  5. POST /osp/v1/provision           |
  |     ProvisionRequest                 |
  |------------------------------------>|
  |  6. [Create resource, verify payment]|
  |  7. ProvisionResponse               |
  |     status: "provisioned"            |
  |     credentials_bundle: {...}        |
  |<------------------------------------|
  |                                     |
  |  8. [Verify credentials work]        |
  |                                     |
```

**Step-by-step:**

1. The agent fetches the provider's ServiceManifest from `/.well-known/osp.json`.
2. The provider returns the manifest.
3. The agent verifies the `provider_signature` (see Section 4.3).
4. The agent selects an offering and tier based on its requirements.
5. The agent sends a `ProvisionRequest` to the provider's provision endpoint.
6. The provider validates the request, verifies payment (if applicable), and creates the resource.
7. The provider returns a `ProvisionResponse` with `status: "provisioned"` and a `CredentialBundle`.
8. The agent optionally verifies the credentials work (e.g., connecting to the database, hitting a health check).

**Concurrent provisioning:** When multiple agents share the same `principal_id`, concurrent provision requests for the same offering may result in duplicate resources. To prevent this:

1. Agents SHOULD use `idempotency_key` with a deterministic value derived from the principal + offering + project_name (e.g., `sha256(principal_id + offering_id + project_name)`).
2. Providers MUST deduplicate requests with the same `idempotency_key` within 24 hours, returning the original response.
3. If deduplication is not feasible, providers SHOULD enforce per-principal resource quotas (`quota_exceeded` error).

### 5.2 Asynchronous Flow

For resources that take significant time to provision (dedicated instances, GPU allocations, multi-region deployments):

```
Agent                                Provider
  |                                     |
  |  1. POST /osp/v1/provision           |
  |     ProvisionRequest                 |
  |------------------------------------>|
  |  2. ProvisionResponse               |
  |     status: "provisioning"           |
  |     estimated_ready_seconds: 120     |
  |     poll_url: "..."                  |
  |<------------------------------------|
  |                                     |
  |  3. [Wait...]                        |
  |                                     |
  |  4. GET /osp/v1/status/{resource_id} |
  |------------------------------------>|
  |  5. StatusResponse                   |
  |     status: "provisioning"           |
  |     progress: 0.6                    |
  |<------------------------------------|
  |                                     |
  |  6. [Wait...]                        |
  |                                     |
  |  7. GET /osp/v1/status/{resource_id} |
  |------------------------------------>|
  |  8. StatusResponse                   |
  |     status: "provisioned"            |
  |     credentials_bundle: {...}        |
  |<------------------------------------|
  |                                     |
```

**Polling rules:**

- Agents SHOULD wait at least `estimated_ready_seconds * 0.5` before the first poll.
- Agents MUST NOT poll more frequently than once every 5 seconds.
- Agents SHOULD use exponential backoff if the resource is not yet ready.
- Agents MUST stop polling after 1 hour and treat the provisioning as failed.

**Webhook alternative:**

If the agent provided a `webhook_url` in the `ProvisionRequest` and the provider supports webhooks (`webhook_supported: true`), the provider SHOULD send a POST to the webhook URL when provisioning completes:

```json
{
  "event": "resource.provisioned",
  "resource_id": "res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  "status": "provisioned",
  "credentials_bundle": { "..." : "..." },
  "timestamp": "2026-03-27T12:03:00Z",
  "provider_signature": "..."
}
```

Webhook requests MUST include an `X-OSP-Signature` header (see Section 8.5).

### 5.3 Free Tier Flow

When the selected tier has a price of `"0.00"`:

1. The agent sets `payment_method` to `"free"`.
2. The agent MAY omit `payment_proof`.
3. The provider MUST NOT require payment proof.
4. **Sybil resistance:** For free tiers, providers SHOULD require `agent_attestation` with a minimum trust tier of `basic` or higher, OR require a verifiable `principal_id` in the request. This prevents automated resource exhaustion by unverified agents. Providers that accept `trust_tier: none` for free tiers MUST implement aggressive rate limiting (RECOMMENDED: 1 free resource per IP per hour, 3 per IP per day).
5. The provider MAY impose additional rate limits on free-tier provisioning (e.g., one free database per principal per day, maximum 2 concurrent free resources per principal).
6. Providers SHOULD set `expires_at` on free-tier resources (RECOMMENDED: 7-30 days) to reclaim unused capacity.

**Example free-tier ProvisionRequest:**

```json
{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "project_name": "my-hobby-project",
  "payment_method": "free",
  "nonce": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90"
}
```

### 5.4 Credential Encryption

When an agent provides `agent_public_key` in the `ProvisionRequest`, the provider MUST encrypt sensitive credentials. The encryption process:

1. **Key conversion.** Convert the agent's Ed25519 public key to an X25519 public key (see [RFC 8032 Section 5.1.5](https://www.rfc-editor.org/rfc/rfc8032#section-5.1.5) for the birational map).
2. **Ephemeral key generation.** The provider generates a fresh ephemeral X25519 keypair.
3. **Shared secret.** Compute X25519 Diffie-Hellman between the ephemeral secret key and the agent's X25519 public key.
4. **Encryption.** Encrypt the JSON-serialized credentials using XSalsa20-Poly1305 with a random 24-byte nonce.
5. **Bundle.** Return the encrypted credentials in the `CredentialBundle` with `format: "encrypted"`.

The agent decrypts by:

1. Converting its Ed25519 secret key to an X25519 secret key.
2. Computing X25519 DH with the `provider_ephemeral_public_key`.
3. Decrypting the `ciphertext` using the shared secret and `nonce`.

**Security properties:**
- Only the agent holding the Ed25519 private key can decrypt the credentials.
- The provider does not retain the ephemeral secret key after encryption.
- The provider SHOULD NOT store decryptable credentials -- only the encrypted bundle.
- Each credential delivery uses a fresh ephemeral key, providing forward secrecy.

### 5.5 Idempotency

When an agent includes an `idempotency_key` in the `ProvisionRequest`:

1. The provider MUST store the response associated with this key for at least 24 hours.
2. If the provider receives another request with the same `idempotency_key`, it MUST return the stored response without creating a new resource.
3. The idempotency key is scoped to the provider. Different providers MAY receive the same key without conflict.
4. If the original request is still being processed, the provider SHOULD return the in-progress `ProvisionResponse` (status: `provisioning`).

### 5.6 Deprovisioning

Agents deprovision resources by calling `DELETE /osp/v1/deprovision/{resource_id}`.

**Deprovisioning behavior:**

1. The provider MUST revoke all credentials associated with the resource.
2. The provider SHOULD retain data for a grace period (RECOMMENDED: 7 days) before permanent deletion.
3. The provider MUST stop billing for the resource effective immediately.
4. If the resource is under an escrow arrangement, the provider MUST notify the escrow system.

**Deprovisioning is permanent.** After the grace period, the resource and its data are irrecoverable.

### 5.7 Geographic Compliance

Agents and providers SHOULD be aware of data residency requirements when provisioning resources across jurisdictions.

**Provider responsibilities:**

1. Providers MUST declare available `regions` in the ServiceOffering (Section 3.2).
2. Providers SHOULD include region metadata indicating the jurisdiction:

```json
"regions": [
  {"id": "us-east-1", "jurisdiction": "US", "provider_region": "aws-us-east-1"},
  {"id": "eu-west-1", "jurisdiction": "EU", "provider_region": "aws-eu-west-1", "gdpr_compliant": true},
  {"id": "ap-southeast-1", "jurisdiction": "SG", "provider_region": "aws-ap-southeast-1"}
]
```

3. When a resource is provisioned, the `ProvisionResponse` MUST include the actual `region` where the resource was deployed.
4. Providers MUST NOT move a provisioned resource to a different region without the agent's explicit consent (via a tier change or new provision request).

**Agent responsibilities:**

1. Agents operating under data residency constraints SHOULD always specify `region` in the `ProvisionRequest`.
2. If the agent specifies a region and the provider cannot honor it, the provider MUST return `invalid_region` error — NOT silently provision in a different region.
3. Agents SHOULD include data residency requirements in `metadata`:

```json
"metadata": {
  "data_residency": "EU",
  "compliance_frameworks": ["gdpr", "soc2"]
}
```

**Provider response for compliance-relevant provisioning:**

When the provisioned resource has compliance implications, providers SHOULD include a `compliance` object in the `ProvisionResponse`:

```json
{
  "resource_id": "res_abc123",
  "status": "provisioned",
  "region": "eu-west-1",
  "compliance": {
    "jurisdiction": "EU",
    "gdpr_compliant": true,
    "data_processing_agreement_url": "https://provider.com/dpa",
    "certifications": ["soc2-type-ii", "iso-27001"]
  }
}
```

### 5.8 Multi-Resource Provisioning

Agents frequently need to provision multiple related services (database + hosting + auth) as a single logical unit. OSP v1.0 handles this through a **saga pattern** with compensation, not distributed transactions.

#### Stack Descriptor (Informative)

Agents MAY define a stack descriptor to orchestrate multi-resource provisioning:

```json
{
  "stack_id": "stack_my-app-backend",
  "resources": [
    {"offering_id": "supabase/managed-postgres", "tier_id": "pro", "alias": "db"},
    {"offering_id": "vercel/hosting", "tier_id": "pro", "alias": "hosting", "depends_on": ["db"]},
    {"offering_id": "clerk/auth", "tier_id": "free", "alias": "auth"}
  ]
}
```

Stack descriptors are NOT a protocol object — they are a client-side abstraction. The agent provisions each resource individually via `POST /osp/v1/provision`.

#### Saga Execution

1. Agent provisions resources in dependency order (resources with no `depends_on` first, in parallel where possible).
2. Each provision call is independent — there is no server-side transaction spanning providers.
3. If a resource fails to provision:
   - Agent SHOULD deprovision all previously-provisioned resources in the stack (compensation).
   - Agent SHOULD record the partial state for debugging.
   - Agent MAY retry the failed resource before compensating.

#### Linking Resources

When provisioning depends on credentials from a prior resource (e.g., hosting needs the database URL), the agent passes the upstream credentials in the downstream `configuration`:

```json
{
  "offering_id": "vercel/hosting",
  "tier_id": "pro",
  "configuration": {
    "environment_variables": {
      "DATABASE_URL": "postgresql://user:pass@db.supabase.co:5432/postgres"
    }
  },
  "nonce": "...",
  "metadata": {
    "osp_stack_id": "stack_my-app-backend",
    "osp_stack_step": "2/3"
  }
}
```

The `osp_stack_id` and `osp_stack_step` metadata fields are OPTIONAL but RECOMMENDED for traceability. Providers SHOULD pass these through to their logging systems.

#### Future: Batch Endpoint (Planned for OSP v1.1)

A `POST /osp/v1/provision-batch` endpoint for atomic multi-resource provisioning within a single provider is planned for v1.1. This would allow provisioning database + auth from the same provider in one call. Cross-provider atomicity remains a client-side saga.

---

## 6. Provider Endpoints

All endpoints are relative to the `endpoints.base_url` from the ServiceManifest.

All endpoints:
- MUST use HTTPS (TLS 1.3 RECOMMENDED, TLS 1.2 minimum).
- MUST accept and return `Content-Type: application/json`.
- MUST include the `X-OSP-Version: 1.0` response header.
- SHOULD include `X-Request-Id` response header for debugging.
- MUST return appropriate HTTP status codes (see each endpoint).

### 6.1 POST /osp/v1/provision

Provision a new resource or change an existing resource's tier.

**Request:**

```http
POST /osp/v1/provision HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{ProvisionRequest}
```

**Response (synchronous success):**

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-OSP-Version: 1.0
X-Request-Id: req_abc123

{ProvisionResponse with status: "provisioned"}
```

**Response (asynchronous):**

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
X-OSP-Version: 1.0
X-Request-Id: req_abc123

{ProvisionResponse with status: "provisioning"}
```

**Response (failure):**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-OSP-Version: 1.0

{ProvisionResponse with status: "failed"}
```

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `201 Created` | Resource provisioned synchronously. |
| `202 Accepted` | Resource is being provisioned asynchronously. |
| `400 Bad Request` | Invalid request (malformed JSON, missing required fields, invalid configuration). |
| `402 Payment Required` | Payment proof is missing, invalid, or declined. |
| `403 Forbidden` | Trust tier insufficient or agent not authorized. |
| `409 Conflict` | Nonce reused or idempotency key conflict with different parameters. |
| `429 Too Many Requests` | Rate limited. Includes `Retry-After` header. |
| `500 Internal Server Error` | Provider internal error. |
| `503 Service Unavailable` | Provider temporarily unable to provision. Includes `Retry-After` header. |

**Full Example:**

```http
POST /osp/v1/provision HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "project_name": "quickstart-db",
  "region": "us-east-1",
  "configuration": {
    "postgres_version": "17"
  },
  "payment_method": "free",
  "nonce": "550e8400-e29b-41d4-a716-446655440000",
  "idempotency_key": "provision-quickstart-2026-03-27"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-OSP-Version: 1.0
X-Request-Id: req_7f3b1a2c

{
  "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_abc:pass_xyz@db-us-east-1.supabase.co:5432/postgres",
      "host": "db-us-east-1.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_abc",
      "password": "pass_xyz",
      "ssl_mode": "require"
    },
    "delivery_proof": {
      "type": "credential_test",
      "test_query": "SELECT 1",
      "verified_at": "2026-03-27T12:00:05Z"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 720,
    "issued_at": "2026-03-27T12:00:00Z"
  },
  "region": "us-east-1",
  "created_at": "2026-03-27T12:00:00Z",
  "expires_at": null,
  "dashboard_url": "https://app.supabase.com/project/quickstart-db"
}
```

---

### 6.2 DELETE /osp/v1/deprovision/{resource_id}

Deprovision (delete) a resource.

**Request:**

```http
DELETE /osp/v1/deprovision/res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678 HTTP/1.1
Host: api.supabase.com
X-OSP-Version: 1.0
```

**Request body (optional):**

```json
{
  "reason": "Project no longer needed",
  "skip_grace_period": false,
  "nonce": "660e8400-e29b-41d4-a716-446655440001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | OPTIONAL | Human-readable reason for deprovisioning. Max 256 characters. |
| `skip_grace_period` | `boolean` | OPTIONAL | If `true`, the provider SHOULD delete data immediately with no grace period. Default: `false`. |
| `nonce` | `string` | REQUIRED | Unique request identifier for replay protection. |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
  "status": "deprovisioned",
  "deprovisioned_at": "2026-03-27T15:00:00Z",
  "data_retained_until": "2026-04-03T15:00:00Z",
  "final_usage_report": {
    "report_id": "rpt_final_abc123",
    "total_amount": "0.00",
    "currency": "USD"
  }
}
```

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Resource deprovisioned. |
| `404 Not Found` | Resource ID does not exist. |
| `409 Conflict` | Resource is already deprovisioned. |
| `500 Internal Server Error` | Provider internal error. |

---

### 6.3 GET /osp/v1/credentials/{resource_id}

Retrieve current credentials for a resource. Used when the agent needs to re-fetch credentials (e.g., after restart, or for a different agent instance authorized by the same principal).

**Request:**

```http
GET /osp/v1/credentials/res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678 HTTP/1.1
Host: api.supabase.com
X-OSP-Version: 1.0
X-OSP-Agent-Public-Key: YWdlbnRfcHVibGljX2tleV9lZDI1NTE5X2Jhc2U2NHVybA
```

| Header | Required | Description |
|--------|----------|-------------|
| `X-OSP-Agent-Public-Key` | OPTIONAL | Agent's Ed25519 public key for credential encryption. If provided, the provider MUST encrypt credentials. |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_abc:pass_xyz@db-us-east-1.supabase.co:5432/postgres",
      "host": "db-us-east-1.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_abc",
      "password": "pass_xyz",
      "ssl_mode": "require"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 720,
    "issued_at": "2026-03-27T12:00:00Z"
  }
}
```

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Credentials returned. |
| `404 Not Found` | Resource ID does not exist. |
| `403 Forbidden` | Caller is not authorized to access this resource's credentials. |
| `503 Service Unavailable` | Resource is still being provisioned. |

**Authentication:**

Providers MUST authenticate credential retrieval requests using one of the following mechanisms, in order of preference:

1. **`Authorization: Bearer <agent_attestation>`** (RECOMMENDED) — The agent presents the same TAP attestation or `agent_attestation` token from the original `ProvisionRequest`. This is the RECOMMENDED approach because it ties credential access to verified agent identity without requiring a separate credential.

2. **`Authorization: Bearer <resource_token>`** — The provider issues a `resource_access_token` in the original `ProvisionResponse` (included in `credentials_bundle.metadata`). The agent presents this token for subsequent credential operations.

3. **Mutual TLS** — For enterprise deployments where both parties manage certificates.

Providers MUST NOT serve credentials without authentication. If the agent supplies `Authorization: Bearer <token>`, the provider MUST validate the token before returning credentials. If no recognized authentication is provided, the provider MUST return `401 Unauthorized` with a `WWW-Authenticate` header indicating the accepted schemes:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="osp", schemes="agent_attestation resource_token"
```

---

### 6.4 POST /osp/v1/rotate/{resource_id}

Rotate credentials for a resource. The old credentials MUST remain valid for a grace period to allow for zero-downtime rotation.

**Grace period rules:**

1. The grace period MUST be at least 5 minutes (RECOMMENDED: 15 minutes).
2. The provider MUST include the `old_credentials_valid_until` timestamp in the rotation response.
3. During the grace period, BOTH old and new credentials MUST work.
4. After the grace period, the old credentials MUST return HTTP 401 with the header `X-OSP-Credentials-Rotated: true` and the body SHOULD include the `resource_id` so the agent knows which resource's credentials expired (rather than interpreting it as an authorization failure).
5. The provider MUST NOT invalidate old credentials before `old_credentials_valid_until`.

**Request:**

```http
POST /osp/v1/rotate/res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678 HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "agent_public_key": "YWdlbnRfcHVibGljX2tleV9lZDI1NTE5X2Jhc2U2NHVybA",
  "nonce": "770e8400-e29b-41d4-a716-446655440002",
  "invalidate_previous_after_seconds": 300
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_public_key` | `string` | OPTIONAL | Ed25519 public key for encrypting the new credentials. |
| `nonce` | `string` | REQUIRED | Unique request identifier. |
| `invalidate_previous_after_seconds` | `integer` | OPTIONAL | Seconds to keep old credentials valid. Default: `300` (5 minutes). Max: `3600` (1 hour). |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_abc:new_pass_123@db-us-east-1.supabase.co:5432/postgres",
      "host": "db-us-east-1.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_abc",
      "password": "new_pass_123",
      "ssl_mode": "require"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 720,
    "issued_at": "2026-03-27T18:00:00Z"
  },
  "old_credentials_valid_until": "2026-03-27T18:15:00Z"
}
```

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Credentials rotated. |
| `404 Not Found` | Resource ID does not exist. |
| `409 Conflict` | A rotation is already in progress. |
| `422 Unprocessable Entity` | Rotation is not supported for this resource. |

---

### 6.5 GET /osp/v1/status/{resource_id}

Get the current status of a resource. Used for polling during asynchronous provisioning and for ongoing health checks.

**Request:**

```http
GET /osp/v1/status/res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d HTTP/1.1
Host: api.supabase.com
X-OSP-Version: 1.0
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "status": "provisioned",
  "health": "healthy",
  "region": "us-east-1",
  "created_at": "2026-03-27T12:01:00Z",
  "credentials_bundle": null,
  "current_usage": {
    "storage_gb": 12.5,
    "bandwidth_gb_month": 32.1,
    "connections_active": 8
  },
  "dashboard_url": "https://app.supabase.com/project/my-saas-db"
}
```

#### StatusResponse Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resource_id` | `string` | REQUIRED | The resource ID. |
| `offering_id` | `string` | REQUIRED | The offering ID. |
| `tier_id` | `string` | REQUIRED | The current tier. |
| `status` | `string` | REQUIRED | One of: `provisioning`, `provisioned`, `degraded`, `deprovisioning`, `deprovisioned`, `failed`. |
| `health` | `string` | OPTIONAL | Health status. One of: `healthy`, `degraded`, `unhealthy`, `unknown`. Only meaningful when `status` is `provisioned`. |
| `progress` | `number` | OPTIONAL | Provisioning progress as a float between 0.0 and 1.0. Only meaningful when `status` is `provisioning`. |
| `region` | `string` | OPTIONAL | Deployment region. |
| `created_at` | `string` | REQUIRED | RFC 3339 timestamp. |
| `credentials_bundle` | `CredentialBundle` | OPTIONAL | Included when `status` transitions to `provisioned` for the first time (or when explicitly requested). Normally `null` to avoid unnecessary credential exposure. |
| `current_usage` | `object` | OPTIONAL | Current usage metrics. Provider-defined key-value pairs. |
| `dashboard_url` | `string` | OPTIONAL | URL to web dashboard. |
| `estimated_ready_seconds` | `integer` | OPTIONAL | Updated estimate of time until ready (for `provisioning` status). |
| `error` | `object` | OPTIONAL | Error details if `status` is `failed` or `degraded`. See [Error Object](#error-object). |

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Status returned. |
| `404 Not Found` | Resource ID does not exist. |

---

### 6.6 GET /osp/v1/usage/{resource_id}

Get usage and billing information for a resource.

**Request:**

```http
GET /osp/v1/usage/res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d HTTP/1.1
Host: api.supabase.com
X-OSP-Version: 1.0
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | `string` | OPTIONAL | Billing period to query. Format: `YYYY-MM`. Default: current period. |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  "current_period": {
    "period_start": "2026-03-01T00:00:00Z",
    "period_end": "2026-04-01T00:00:00Z",
    "status": "in_progress"
  },
  "usage_to_date": {
    "line_items": [
      {
        "dimension_id": "storage_gb",
        "description": "Database Storage",
        "quantity": "12.5",
        "unit": "GB",
        "included_quantity": "8",
        "billable_quantity": "4.5",
        "unit_price": "0.125",
        "amount": "0.56"
      },
      {
        "dimension_id": "bandwidth_gb",
        "description": "Data Transfer",
        "quantity": "32.1",
        "unit": "GB",
        "included_quantity": "50",
        "billable_quantity": "0",
        "unit_price": "0.09",
        "amount": "0.00"
      }
    ],
    "base_amount": "25.00",
    "metered_amount": "0.56",
    "estimated_total": "25.56",
    "currency": "USD"
  },
  "previous_reports": [
    {
      "report_id": "rpt_feb2026",
      "period_start": "2026-02-01T00:00:00Z",
      "period_end": "2026-03-01T00:00:00Z",
      "total_amount": "28.13",
      "currency": "USD"
    }
  ]
}
```

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Usage data returned. |
| `404 Not Found` | Resource ID does not exist. |

---

### 6.7 GET /osp/v1/health

Provider health check endpoint. Used by registries and agents to verify the provider's OSP API is operational.

**Request:**

```http
GET /osp/v1/health HTTP/1.1
Host: api.supabase.com
X-OSP-Version: 1.0
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "status": "healthy",
  "osp_version": "1.0",
  "provider_id": "com.supabase",
  "timestamp": "2026-03-27T12:00:00Z",
  "endpoints": {
    "provision": "operational",
    "deprovision": "operational",
    "credentials": "operational",
    "rotate": "operational",
    "status": "operational",
    "usage": "operational"
  },
  "latency_ms": {
    "provision_p50": 450,
    "provision_p99": 2300
  }
}
```

#### HealthResponse Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | REQUIRED | Overall health. One of: `healthy`, `degraded`, `unhealthy`. |
| `osp_version` | `string` | REQUIRED | OSP protocol version supported. |
| `provider_id` | `string` | REQUIRED | Provider identifier. |
| `timestamp` | `string` | REQUIRED | RFC 3339 timestamp. |
| `endpoints` | `object` | OPTIONAL | Per-endpoint status. Keys are endpoint names, values are `operational`, `degraded`, or `down`. |
| `latency_ms` | `object` | OPTIONAL | Performance metrics. Provider-defined. |

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Provider is healthy or degraded (check `status` field). |
| `503 Service Unavailable` | Provider is unhealthy. |

---

### 6.8 POST /osp/v1/dispute/{resource_id}

Signal a dispute for a provisioned resource. This endpoint does NOT resolve disputes — it creates an `osp_dispute_receipt` that the agent carries to the settlement rail (e.g., Sardis escrow, Stripe chargeback) for resolution. This ensures the provider is notified of the issue at the OSP layer before the agent escalates.

**Request:**

```http
POST /osp/v1/dispute/res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678 HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0
Authorization: Bearer <agent_attestation>

{
  "reason_code": "service_not_delivered",
  "description": "Database provisioned but connection_uri returns ECONNREFUSED for 6+ hours",
  "evidence_hash": "sha256:a1b2c3d4e5f6...",
  "evidence_url": "https://evidence.example.com/disp-001"
}
```

**Dispute Reason Codes:**

| Code | Description |
|------|-------------|
| `service_not_delivered` | Resource provisioned but service is inaccessible |
| `credentials_invalid` | Credentials do not work (auth failure, connection refused) |
| `wrong_tier` | Resource provisioned at incorrect tier or with incorrect limits |
| `billing_mismatch` | Usage report does not match agent's observed usage |
| `unauthorized_charge` | Payment proof was used beyond its authorized scope |
| `quality_degraded` | Service is consistently below provider's stated SLA |

**Response:**

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-OSP-Version: 1.0

{
  "dispute_id": "disp_9a8b7c6d-5e4f-3a2b-1c0d-ef9876543210",
  "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
  "reason_code": "service_not_delivered",
  "status": "filed",
  "filed_at": "2026-03-27T14:30:00Z",
  "osp_dispute_receipt": "eyJhbGciOiJFZERTQSIsInR5cCI6Ik9TUF9ESVNQVVRFX1JFQ0VJUFQifQ...",
  "settlement_rails": ["sardis_escrow", "stripe_chargeback"],
  "provider_response_deadline": "2026-03-30T14:30:00Z"
}
```

The `osp_dispute_receipt` is a signed JWT that the agent presents to the settlement rail as proof that the dispute was filed at the OSP layer. It contains: `dispute_id`, `resource_id`, `reason_code`, `filed_at`, `provider_id`, and the provider's Ed25519 signature.

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `201 Created` | Dispute filed successfully. |
| `400 Bad Request` | Invalid reason code or missing required fields. |
| `404 Not Found` | Resource ID does not exist. |
| `409 Conflict` | An active dispute already exists for this resource. |
| `422 Unprocessable Entity` | Dispute window has expired for this resource. |

---

### 6.9 Webhook Management

The initial `webhook_url` is set during provisioning (Section 3.4). OSP v1.0 provides endpoints for managing webhooks after provisioning.

#### POST /osp/v1/webhooks/{resource_id}

Register or update a webhook for an existing resource.

**Request:**

```http
POST /osp/v1/webhooks/res_abc123 HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
Authorization: Bearer <agent_attestation>

{
  "webhook_url": "https://new-agent.example.com/hooks/osp",
  "events": ["resource.status_changed", "credentials.rotated", "usage.threshold_reached"],
  "secret_rotation": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `webhook_url` | `string` | REQUIRED | New webhook URL. MUST be HTTPS. |
| `events` | `array<string>` | OPTIONAL | Event types to subscribe to. Default: all events. |
| `secret_rotation` | `boolean` | OPTIONAL | Whether to generate a new webhook secret. Default: `false`. |

**Response:**

```http
HTTP/1.1 200 OK

{
  "webhook_id": "wh_abc123",
  "resource_id": "res_abc123",
  "webhook_url": "https://new-agent.example.com/hooks/osp",
  "events": ["resource.status_changed", "credentials.rotated", "usage.threshold_reached"],
  "secret": "whsec_new_secret_if_rotated",
  "created_at": "2026-03-27T14:00:00Z"
}
```

The `secret` field is ONLY included when `secret_rotation` is `true` or when this is the first webhook registration for the resource. Agents MUST store this secret securely.

#### DELETE /osp/v1/webhooks/{resource_id}

Remove webhook registration for a resource.

```http
DELETE /osp/v1/webhooks/res_abc123 HTTP/1.1
Authorization: Bearer <agent_attestation>
```

Returns `204 No Content` on success.

#### Webhook Event Types

| Event | Trigger |
|-------|---------|
| `resource.provisioned` | Async provisioning completed |
| `resource.status_changed` | Resource status changed (healthy → degraded, etc.) |
| `resource.approaching_limit` | Resource approaching tier limits (>80% usage) |
| `resource.sunset_warning` | Offering/tier deprecation notice |
| `credentials.rotated` | Credentials were auto-rotated by the provider |
| `credentials.expiring` | Credentials approaching expiration |
| `usage.report_ready` | New usage report available |
| `usage.threshold_reached` | Usage crossed a billing threshold |
| `billing.payment_failed` | Recurring payment failed |
| `billing.payment_succeeded` | Recurring payment succeeded |

Providers MUST support at minimum: `resource.provisioned` and `resource.status_changed`. All other events are OPTIONAL.

---

### 6.10 GET /osp/v1/events/{resource_id}

Retrieve an audit trail of all lifecycle events for a resource. This provides agents with visibility into what the provider has done with their resource.

**Request:**

```http
GET /osp/v1/events/res_abc123?since=2026-03-27T00:00:00Z&limit=50 HTTP/1.1
Host: api.supabase.com
Authorization: Bearer <agent_attestation>
X-OSP-Version: 1.0
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since` | `string` | OPTIONAL | RFC 3339 timestamp. Return events after this time. |
| `until` | `string` | OPTIONAL | RFC 3339 timestamp. Return events before this time. |
| `limit` | `integer` | OPTIONAL | Maximum events to return. Default: 50. Max: 200. |
| `starting_after` | `string` | OPTIONAL | Cursor-based pagination. Event ID to start after. |
| `event_type` | `string` | OPTIONAL | Filter by event type. |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "resource_id": "res_abc123",
  "events": [
    {
      "event_id": "evt_001",
      "event_type": "resource.provisioned",
      "timestamp": "2026-03-27T12:00:00Z",
      "details": {
        "tier_id": "pro",
        "region": "us-east-1"
      }
    },
    {
      "event_id": "evt_002",
      "event_type": "credentials.issued",
      "timestamp": "2026-03-27T12:00:01Z",
      "details": {
        "scope": "admin",
        "encrypted": true
      }
    },
    {
      "event_id": "evt_003",
      "event_type": "resource.health_check",
      "timestamp": "2026-03-27T13:00:00Z",
      "details": {
        "status": "healthy",
        "latency_ms": 12
      }
    }
  ],
  "has_more": false,
  "cursor": "evt_003"
}
```

**Event Types:**

| Event Type | Description |
|------------|-------------|
| `resource.provisioned` | Resource was created |
| `resource.deprovisioned` | Resource was deleted |
| `resource.tier_changed` | Tier was upgraded/downgraded |
| `resource.region_changed` | Resource was migrated (with consent) |
| `resource.health_check` | Periodic health check result |
| `resource.status_changed` | Status changed (healthy/degraded/unhealthy) |
| `credentials.issued` | New credentials were generated |
| `credentials.rotated` | Credentials were rotated |
| `credentials.accessed` | Credentials were retrieved (audit) |
| `billing.charged` | Billing event occurred |
| `billing.usage_reported` | Usage report was generated |
| `dispute.filed` | Dispute was filed |
| `dispute.resolved` | Dispute was resolved |
| `webhook.registered` | Webhook was registered or updated |
| `webhook.delivery_failed` | Webhook delivery failed (for debugging) |

This endpoint is OPTIONAL but RECOMMENDED. Providers at conformance level **OSP Full** MUST implement it. Event retention SHOULD be at least 90 days.

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Events returned. |
| `404 Not Found` | Resource ID does not exist. |
| `501 Not Implemented` | Provider does not support event streaming. |

### 6.11 POST /osp/v1/estimate

Estimate the cost of provisioning a service without actually provisioning it. Agents use this to compare pricing across providers before committing.

**Request:**

```http
POST /osp/v1/estimate HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "region": "us-east-1",
  "configuration": {
    "postgres_version": "17",
    "enable_pooling": true
  },
  "estimated_usage": {
    "storage_gb": 25,
    "api_calls_per_month": 1000000,
    "bandwidth_gb": 100
  },
  "billing_periods": 3
}
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "estimate": {
    "base_cost": {"amount": "25.00", "currency": "USD", "interval": "monthly"},
    "metered_cost": {
      "storage_gb": {"quantity": 17, "unit_price": "0.125", "subtotal": "2.13", "note": "8 GB included, 17 GB overage"},
      "bandwidth_gb": {"quantity": 50, "unit_price": "0.09", "subtotal": "4.50", "note": "50 GB included, 50 GB overage"}
    },
    "total_monthly": "31.63",
    "total_for_period": "94.89",
    "currency": "USD",
    "billing_periods": 3
  },
  "comparison_hint": "This is 26% more expensive than the estimated cost on neon/serverless-postgres Pro tier for the same usage profile.",
  "valid_until": "2026-03-27T13:00:00Z"
}
```

The `comparison_hint` field is OPTIONAL and informative — providers MAY include it to help agents make informed decisions. The `valid_until` field indicates when the estimate expires (prices may change).

**HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| `200 OK` | Estimate returned. |
| `400 Bad Request` | Invalid offering_id, tier_id, or usage parameters. |
| `404 Not Found` | Offering or tier not found. |

This endpoint is OPTIONAL. Providers at conformance level **OSP Full** SHOULD implement it.

### 6.12 POST /osp/v1/share/{resource_id}

Grant another agent access to a provisioned resource with a specific credential scope.

**Request:**

```http
POST /osp/v1/share/res_abc123 HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
Authorization: Bearer <owner_agent_attestation>

{
  "target_agent_public_key": "base64url_target_agent_ed25519_public_key",
  "scope": "read_only",
  "scope_restrictions": ["no_ddl", "no_delete"],
  "expires_at": "2026-04-27T00:00:00Z",
  "label": "researcher-agent-access"
}
```

**Response:**

```http
HTTP/1.1 201 Created

{
  "share_id": "share_xyz789",
  "resource_id": "res_abc123",
  "scope": "read_only",
  "credentials_bundle": {
    "format": "encrypted",
    "scope": "read_only",
    "scope_restrictions": ["no_ddl", "no_delete"],
    "encrypted_credentials": {
      "algorithm": "x25519-xsalsa20-poly1305",
      "agent_public_key": "base64url_target_agent_key",
      "provider_ephemeral_public_key": "...",
      "nonce": "...",
      "ciphertext": "..."
    },
    "issued_at": "2026-03-27T14:00:00Z",
    "expires_at": "2026-04-27T00:00:00Z"
  }
}
```

**Revoking shared access:**

```http
DELETE /osp/v1/share/{share_id} HTTP/1.1
Authorization: Bearer <owner_agent_attestation>
```

Returns `204 No Content`. The shared credentials are immediately invalidated.

**Listing shares:**

```http
GET /osp/v1/shares/{resource_id} HTTP/1.1
Authorization: Bearer <owner_agent_attestation>
```

Returns all active shares for the resource with their scopes and expiry.

This endpoint is OPTIONAL. It enables multi-agent collaboration where one agent provisions infrastructure and delegates scoped access to specialized agents (e.g., a data pipeline agent gets read-only DB access).

### 6.13 POST /osp/v1/delegate/{resource_id}

Transfer management authority (not just credentials) for a resource to another agent. The delegated agent can rotate credentials, change tiers, and deprovision.

**Request:**

```http
POST /osp/v1/delegate/res_abc123 HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
Authorization: Bearer <owner_agent_attestation>

{
  "delegate_agent_public_key": "base64url_delegate_agent_ed25519_public_key",
  "permissions": ["credentials.read", "credentials.rotate", "status.read", "usage.read"],
  "expires_at": "2026-06-27T00:00:00Z",
  "revocable": true
}
```

Available permissions:

| Permission | Allows |
|------------|--------|
| `credentials.read` | GET /osp/v1/credentials |
| `credentials.rotate` | POST /osp/v1/rotate |
| `status.read` | GET /osp/v1/status |
| `usage.read` | GET /osp/v1/usage |
| `events.read` | GET /osp/v1/events |
| `tier.change` | POST /osp/v1/provision (tier_change) |
| `deprovision` | DELETE /osp/v1/deprovision |
| `share` | POST /osp/v1/share |
| `full` | All of the above |

**Response:**

```http
HTTP/1.1 201 Created

{
  "delegation_id": "del_abc789",
  "resource_id": "res_abc123",
  "permissions": ["credentials.read", "credentials.rotate", "status.read", "usage.read"],
  "expires_at": "2026-06-27T00:00:00Z",
  "delegation_token": "eyJhbGciOiJFZERTQSJ9..."
}
```

The `delegation_token` is a signed JWT that the delegated agent presents in the `Authorization` header for subsequent operations on this resource. It encodes the permissions, expiry, and resource binding.

This endpoint is OPTIONAL. It enables handoff scenarios: an infrastructure-provisioning agent sets everything up, then delegates day-to-day management to an operations agent.

### 6.14 Resource Snapshots

Providers MAY support point-in-time snapshots for backup and restore.

#### POST /osp/v1/snapshot/{resource_id}

Create a snapshot of the current resource state.

```http
POST /osp/v1/snapshot/res_abc123 HTTP/1.1
Authorization: Bearer <agent_attestation>

{
  "label": "before-migration-v2",
  "retention_days": 30
}
```

**Response:**

```json
{
  "snapshot_id": "snap_def456",
  "resource_id": "res_abc123",
  "status": "creating",
  "label": "before-migration-v2",
  "created_at": "2026-03-27T15:00:00Z",
  "expires_at": "2026-04-26T15:00:00Z",
  "size_bytes": null
}
```

#### POST /osp/v1/restore/{resource_id}

Restore a resource from a snapshot. This replaces the current resource state.

```http
POST /osp/v1/restore/res_abc123 HTTP/1.1
Authorization: Bearer <agent_attestation>

{
  "snapshot_id": "snap_def456",
  "confirm": true
}
```

**Response:**

```json
{
  "resource_id": "res_abc123",
  "status": "restoring",
  "from_snapshot": "snap_def456",
  "estimated_ready_seconds": 120,
  "poll_url": "/osp/v1/status/res_abc123",
  "warning": "Current data will be replaced. New credentials will be issued after restore."
}
```

Restore is a destructive operation — the provider MUST require `"confirm": true` in the request body.

#### GET /osp/v1/snapshots/{resource_id}

List available snapshots.

```json
{
  "snapshots": [
    {"snapshot_id": "snap_def456", "label": "before-migration-v2", "created_at": "...", "size_bytes": 52428800, "status": "ready"},
    {"snapshot_id": "snap_abc123", "label": "weekly-backup", "created_at": "...", "size_bytes": 48234496, "status": "ready"}
  ]
}
```

These endpoints are OPTIONAL. Providers SHOULD declare snapshot support in the offering's `features` array: `"features": ["snapshots", "point_in_time_recovery"]`.

### 6.15 GET /osp/v1/metrics/{resource_id}

Retrieve real-time resource metrics. Unlike usage reports (billing data), metrics are operational data for monitoring.

**Request:**

```http
GET /osp/v1/metrics/res_abc123?period=1h&resolution=1m HTTP/1.1
Authorization: Bearer <agent_attestation>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | `string` | Time window: `5m`, `1h`, `6h`, `24h`, `7d`. Default: `1h`. |
| `resolution` | `string` | Data point interval: `10s`, `1m`, `5m`, `1h`. Default: auto. |
| `metrics` | `string` | Comma-separated metric names to return. Default: all available. |

**Response:**

```json
{
  "resource_id": "res_abc123",
  "period": {"start": "2026-03-27T14:00:00Z", "end": "2026-03-27T15:00:00Z"},
  "resolution": "1m",
  "metrics": {
    "cpu_percent": {
      "current": 23.5,
      "avg": 18.2,
      "max": 67.1,
      "data_points": [12.3, 15.1, 18.7, "..."]
    },
    "memory_percent": {
      "current": 45.2,
      "avg": 42.8,
      "max": 58.3
    },
    "active_connections": {
      "current": 7,
      "avg": 5.2,
      "max": 12
    },
    "queries_per_second": {
      "current": 142,
      "avg": 98.5,
      "max": 312
    },
    "storage_bytes": {
      "current": 52428800
    },
    "latency_ms": {
      "p50": 2.3,
      "p95": 12.7,
      "p99": 45.2
    }
  }
}
```

Metric names are provider-defined but SHOULD follow these conventions:

| Metric | Unit | Description |
|--------|------|-------------|
| `cpu_percent` | `%` | CPU utilization |
| `memory_percent` | `%` | Memory utilization |
| `storage_bytes` | `bytes` | Storage used |
| `active_connections` | `count` | Current connections |
| `queries_per_second` | `qps` | Query throughput |
| `latency_ms` | `ms` | Operation latency (with percentiles) |
| `bandwidth_bytes` | `bytes` | Network throughput |
| `error_rate` | `%` | Error percentage |

This endpoint is OPTIONAL. Providers SHOULD declare metrics support in `features`: `"features": ["live_metrics"]`.

#### Server-Sent Events (SSE) — Real-Time Stream

For continuous monitoring, providers MAY support SSE:

```http
GET /osp/v1/metrics/res_abc123/stream HTTP/1.1
Accept: text/event-stream
Authorization: Bearer <agent_attestation>
```

```
event: metric
data: {"timestamp":"2026-03-27T15:00:01Z","cpu_percent":23.5,"connections":7,"qps":142}

event: metric
data: {"timestamp":"2026-03-27T15:00:02Z","cpu_percent":24.1,"connections":7,"qps":138}

event: alert
data: {"type":"approaching_limit","metric":"storage_bytes","current":0.85,"threshold":0.80}
```

### 6.16 Resource Migration (Cross-Provider)

Migrating a resource from one provider to another (e.g., Supabase Postgres → Neon Postgres) requires coordination between both providers. OSP defines a standardized migration flow.

#### Migration Flow

```
Source Provider          Agent              Target Provider
      |                   |                       |
      |  1. POST /osp/v1/export/res_abc           |
      |<------------------|                       |
      |  2. Export bundle  |                       |
      |------------------>|                       |
      |                   |  3. POST /osp/v1/provision (with import)
      |                   |---------------------->|
      |                   |  4. Import + provision |
      |                   |<----------------------|
      |                   |                       |
      |  5. POST /osp/v1/deprovision/res_abc      |
      |<------------------|                       |
      |                   |                       |
```

#### POST /osp/v1/export/{resource_id}

Request an export bundle from the source provider.

```http
POST /osp/v1/export/res_abc123 HTTP/1.1
Authorization: Bearer <agent_attestation>

{
  "format": "pg_dump",
  "include_data": true,
  "include_schema": true,
  "encryption_key": "base64url_agent_public_key"
}
```

**Response:**

```json
{
  "export_id": "exp_xyz789",
  "resource_id": "res_abc123",
  "status": "exporting",
  "format": "pg_dump",
  "estimated_ready_seconds": 60,
  "poll_url": "/osp/v1/export/exp_xyz789/status"
}
```

When ready:

```json
{
  "export_id": "exp_xyz789",
  "status": "ready",
  "download_url": "https://exports.supabase.com/exp_xyz789.enc",
  "download_expires_at": "2026-03-27T16:00:00Z",
  "size_bytes": 104857600,
  "checksum": "sha256:a1b2c3...",
  "format": "pg_dump",
  "metadata": {
    "postgres_version": "17",
    "tables": 24,
    "rows": 1523847
  }
}
```

#### Import During Provisioning

The target provider accepts an import bundle in the provision request:

```json
{
  "offering_id": "neon/serverless-postgres",
  "tier_id": "pro",
  "project_name": "migrated-db",
  "configuration": {
    "import": {
      "source_url": "https://exports.supabase.com/exp_xyz789.enc",
      "format": "pg_dump",
      "checksum": "sha256:a1b2c3...",
      "decryption_key": "base64url_agent_private_key_encrypted_bundle"
    }
  },
  "nonce": "...",
  "payment_method": "sardis_wallet",
  "payment_proof": {"...": "..."}
}
```

Export and import formats are provider-defined but SHOULD use industry standards:

| Category | Recommended Formats |
|----------|-------------------|
| PostgreSQL | `pg_dump` (custom format), `pg_dump_sql` (plain SQL) |
| MySQL | `mysqldump`, `csv` |
| Redis | `rdb`, `aof` |
| Object Storage | `tar.gz` with manifest |
| Generic | `json_lines`, `csv` |

These endpoints are OPTIONAL. Providers SHOULD declare migration support in `features`: `"features": ["export", "import"]`.

---

## 7. Billing

### 7.1 Payment Methods

OSP is payment-rail agnostic. The `payment_method` field in `ProvisionRequest` declares which payment system the agent uses. The `payment_proof` field carries the proof or authorization for that payment.

#### Defined Payment Methods

| Method | Description | `payment_proof` Structure |
|--------|-------------|--------------------------|
| `free` | No payment required. | Omit `payment_proof`. |
| `sardis_wallet` | Payment via Sardis, a rail-agnostic agentic payment platform with escrow, spending policies, and multi-rail settlement. | `{ "wallet_address": "...", "payment_tx": "...", "escrow_id": "..." }` |
| `stripe_spt` | Stripe Shared Payment Token. | `{ "spt_token": "spt_...", "amount": "...", "currency": "..." }` |
| `x402` | HTTP 402 micropayment. | `{ "payment_header": "...", "receipt": "..." }` |
| `mpp` | Machine Payments Protocol session. | `{ "session_id": "...", "authorization": "..." }` |
| `invoice` | Traditional invoice billing (enterprise). | `{ "billing_entity": "...", "po_number": "...", "billing_email": "..." }` |
| `external` | Payment handled outside OSP. | `{ "reference": "...", "method_description": "..." }` |

#### x402 Flow

When a provider accepts `x402` and the agent does not include `payment_proof`:

1. The provider responds with `HTTP 402 Payment Required`.
2. The response body contains payment terms per the x402 specification.
3. The agent processes the payment and re-sends the `ProvisionRequest` with the `payment_proof` containing the x402 receipt.

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-OSP-Version: 1.0
X-Payment-Terms: x402

{
  "payment_required": {
    "method": "x402",
    "amount": "25.00",
    "currency": "USD",
    "recipient": "0x1234...abcd",
    "memo": "OSP provision: supabase/managed-postgres/pro"
  }
}
```

#### Custom Payment Methods

Providers MAY declare custom payment methods by using a namespaced identifier:

```json
"accepted_payment_methods": ["free", "stripe_spt", "com.provider.custom_billing"]
```

Custom payment method identifiers MUST use reverse-domain notation. The `payment_proof` structure for custom methods is defined by the provider and documented in their manifest's `extensions` object.

### 7.2 Usage-Based Billing

For tiers with `metered: true`, providers track usage and generate `UsageReport` objects at the end of each billing period.

**Usage reporting flow:**

1. During the billing period, the provider tracks resource usage internally.
2. At the end of the period, the provider generates a signed `UsageReport`.
3. The billing system (Sardis, Stripe, etc.) processes the report and charges the principal.

**How the billing system receives the report depends on the payment method:**

| Payment Method | Report Delivery |
|----------------|----------------|
| `sardis_wallet` | Provider submits the report to the Sardis platform, which validates via countersignature, deducts from escrow, or charges the wallet. |
| `stripe_spt` | Provider uses the Stripe API to charge the SPT based on the usage report. |
| `invoice` | Provider generates an invoice and sends it to the `billing_email`. |
| `external` | Provider handles billing outside OSP. |
| `free` | No billing. Usage tracked for limits enforcement only. |

**Agent access to usage reports:**

Agents can query current and historical usage via `GET /osp/v1/usage/{resource_id}` (see Section 6.6). Providers SHOULD also make signed `UsageReport` objects available for independent verification.

### 7.3 Tier Changes

To upgrade or downgrade a resource's tier, the agent sends a `ProvisionRequest` with the `tier_change` field populated:

```json
{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "payment_method": "stripe_spt",
  "payment_proof": {
    "spt_token": "spt_1234567890abcdef",
    "amount": "25.00",
    "currency": "USD"
  },
  "nonce": "880e8400-e29b-41d4-a716-446655440003",
  "tier_change": {
    "resource_id": "res_7f3b1a2c-4d5e-6f78-90ab-cdef12345678",
    "previous_tier_id": "free",
    "proration": "immediate"
  }
}
```

**Proration behavior:**

| Value | Description |
|-------|-------------|
| `immediate` | The new tier takes effect immediately. The provider prorates charges for the remainder of the current billing period. |
| `next_period` | The current tier remains active until the end of the billing period. The new tier starts at the next period. |
| `none` | No proration. The new tier's full price is charged immediately, regardless of remaining time in the current period. |

Providers define their own proration calculation rules. The response MUST include the prorated amount (if applicable) in the `ProvisionResponse`.

---

## 8. Security

### 8.1 Manifest Signatures

All ServiceManifests MUST be signed with the provider's Ed25519 private key.

**Signing process:**

1. Construct the manifest JSON object with all fields except `provider_signature`.
2. Serialize to canonical JSON: keys sorted lexicographically at all nesting levels, no whitespace between tokens, no trailing commas, UTF-8 encoding.
3. Sign the resulting byte string with Ed25519.
4. Base64url-encode the 64-byte signature (without padding).
5. Add the encoded signature as the `provider_signature` field.

**Verification process:**

1. Parse the manifest JSON.
2. Extract and remove the `provider_signature` field.
3. Re-serialize the remaining object to canonical JSON (same rules as signing).
4. Verify the Ed25519 signature using `provider_public_key`.

**Key rotation:** When a provider rotates their signing key, they MUST:
1. Publish a new manifest version signed with the new key.
2. Update their DNS TXT record (if used).
3. The old key SHOULD be listed in the manifest's `extensions` under `previous_public_keys` for a transition period of at least 30 days.

### 8.2 Credential Encryption

When the agent provides `agent_public_key` in a `ProvisionRequest` or in the `X-OSP-Agent-Public-Key` header:

1. The provider MUST encrypt all sensitive credential fields (passwords, API keys, tokens, connection strings containing credentials).
2. The provider MUST use the `x25519-xsalsa20-poly1305` algorithm (NaCl `crypto_box`).
3. The provider MUST generate a fresh ephemeral keypair for each encryption operation.
4. The provider MUST NOT store the ephemeral private key after encryption.
5. The provider SHOULD NOT store plaintext credentials after delivering the encrypted bundle.

When the agent does not provide `agent_public_key`:

1. The provider MAY return plaintext credentials.
2. The response MUST still use HTTPS (transport encryption).
3. Agents are RECOMMENDED to always provide a public key for defense-in-depth.

### 8.3 Nonce-Based Replay Protection

1. Every `ProvisionRequest`, rotation request, and deprovision request MUST include a unique `nonce`.
2. The `nonce` MUST be a UUID v4 or a cryptographically random string of at least 32 characters.
3. Providers MUST reject any request with a `nonce` that has been seen within the previous 24 hours.
4. Providers MUST return error code `nonce_reused` (HTTP 409) when a duplicate nonce is detected.
5. Providers SHOULD use a bloom filter or similar probabilistic data structure for efficient nonce tracking, with a false positive rate no greater than 1 in 10^9.

**Distinction from idempotency keys:** A `nonce` prevents replay attacks -- it ensures a request is processed at most once. An `idempotency_key` ensures that retrying a failed request produces the same result. They serve different purposes and both MAY be present in a request. When both are present:
- The `nonce` MUST be unique per attempt.
- The `idempotency_key` MUST be the same across retry attempts.

### 8.4 Transport Security

1. All OSP endpoints MUST use TLS.
2. TLS 1.3 is RECOMMENDED. TLS 1.2 is the minimum acceptable version.
3. TLS 1.0 and 1.1 MUST NOT be supported.
4. Providers SHOULD support HSTS (`Strict-Transport-Security` header) with a `max-age` of at least 31536000 (1 year).
5. Mutual TLS (mTLS) is RECOMMENDED for production deployments where both parties can manage certificates.
6. Certificate pinning is NOT RECOMMENDED due to operational complexity, but providers MAY document their certificate chain for agents that choose to pin.

### 8.5 Webhook Authentication and Delivery

When a provider sends webhook notifications to an agent's `webhook_url`:

**Authentication:**

1. The provider MUST include an `X-OSP-Signature` header.
2. The signature is computed as: `HMAC-SHA256(webhook_secret, timestamp + "." + request_body)`.
3. The `X-OSP-Signature` header value format: `t={unix_timestamp},v1={hex_encoded_hmac}`.
4. The `X-OSP-Timestamp` header MUST contain the Unix timestamp used in the signature.
5. Agents MUST reject webhooks where the timestamp is more than 300 seconds (5 minutes) old.
6. The `webhook_secret` is established during provisioning. Providers MUST include it in the `CredentialBundle` under the key `osp_webhook_secret` when the agent provides a `webhook_url`.

**Retry Policy:**

Providers MUST implement retries for failed webhook deliveries. A delivery is considered failed if the agent's endpoint returns a non-2xx status code, times out (RECOMMENDED timeout: 10 seconds), or is unreachable.

Required retry schedule (exponential backoff):

| Attempt | Delay After Previous | Cumulative Time |
|---------|---------------------|-----------------|
| 1 (initial) | Immediate | 0 |
| 2 | 1 minute | 1 minute |
| 3 | 15 minutes | 16 minutes |
| 4 | 1 hour | 1 hour 16 minutes |
| 5 | 4 hours | 5 hours 16 minutes |
| 6 (final) | 24 hours | 29 hours 16 minutes |

After 6 failed attempts, the provider MUST stop retrying and MUST mark the webhook subscription as `failed`. The resource remains provisioned — the agent can recover by polling `GET /osp/v1/status/{resource_id}`.

Each retry MUST include the `X-OSP-Delivery-Attempt` header with the attempt number (1-6) so agents can detect duplicates and measure delivery reliability.

**Example webhook headers:**

```http
POST /hooks/osp HTTP/1.1
Host: agent.example.com
Content-Type: application/json
X-OSP-Signature: t=1711540800,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
X-OSP-Timestamp: 1711540800
```

**Verification process:**

1. Extract the timestamp `t` and signature `v1` from `X-OSP-Signature`.
2. Construct the signed payload: `{timestamp}.{raw_request_body}`.
3. Compute `HMAC-SHA256(webhook_secret, signed_payload)`.
4. Compare the computed HMAC with `v1` using constant-time comparison.
5. Verify the timestamp is within 300 seconds of the current time.

### 8.6 Rate Limiting

Providers MUST implement rate limiting on all OSP endpoints.

1. Rate limit responses MUST use HTTP status `429 Too Many Requests`.
2. Rate limit responses MUST include the `Retry-After` header with the number of seconds to wait.
3. Providers SHOULD include rate limit information using the IETF standard headers (per [draft-ietf-httpapi-ratelimit-headers](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)):
   - `RateLimit-Limit`: Maximum requests per window.
   - `RateLimit-Remaining`: Remaining requests in the current window.
   - `RateLimit-Reset`: Seconds until the window resets.

   Note: The `X-RateLimit-*` prefix is deprecated per modern HTTP conventions. Providers MAY include both prefixed and unprefixed headers during a transition period, but MUST include the unprefixed versions.

**Recommended minimum rate limits:**

| Endpoint | Minimum Rate Limit |
|----------|-------------------|
| `POST /osp/v1/provision` | 10 requests per minute per principal |
| `DELETE /osp/v1/deprovision/{id}` | 10 requests per minute per principal |
| `GET /osp/v1/credentials/{id}` | 30 requests per minute per resource |
| `POST /osp/v1/rotate/{id}` | 5 requests per hour per resource |
| `GET /osp/v1/status/{id}` | 60 requests per minute per resource |
| `GET /osp/v1/usage/{id}` | 30 requests per minute per resource |
| `GET /osp/v1/health` | 60 requests per minute per IP |

### 8.7 Agent Identity Revocation

If an agent's private key is compromised, the principal needs a way to invalidate all active sessions and prevent the compromised agent from accessing provisioned resources.

**Revocation Check:**

1. Providers that accept `agent_attestation` tokens SHOULD periodically verify that the attestation has not been revoked. The verification mechanism depends on the identity system:
   - **TAP attestations:** Check the issuer's revocation endpoint (typically `/.well-known/tap-revocations.json` or a WebSocket stream).
   - **JWKS-based attestations:** Check the issuer's JWKS endpoint for key removal.
   - **Custom attestations:** The `agent_attestation` MAY include an `aud` (audience) and `exp` (expiration) claim. Short-lived attestations (RECOMMENDED: 1-hour expiry) limit the window of compromise.

2. Providers SHOULD check revocation status at minimum on each `GET /osp/v1/credentials` and `POST /osp/v1/provision` request. Providers MAY cache revocation status for up to 5 minutes.

3. When a revoked attestation is detected, the provider MUST:
   - Return `403 Forbidden` with error code `attestation_revoked`.
   - Suspend credential delivery for all resources associated with that agent.
   - NOT deprovision the resource (the principal may re-authorize a new agent).

4. Agents SHOULD use short-lived attestations (1-hour expiry with refresh) rather than long-lived tokens. This bounds the blast radius of a key compromise to the attestation's remaining lifetime.

**Principal-Initiated Revocation:**

The principal (not the agent) can notify providers of a compromised agent by calling:

```http
POST /osp/v1/revoke-agent HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
Authorization: Bearer <principal_attestation>

{
  "agent_public_key": "compromised_key_base64url",
  "reason": "key_compromised",
  "effective_immediately": true
}
```

This endpoint is OPTIONAL for providers but RECOMMENDED for providers accepting trust tier `verified` or higher.

### 8.8 Request Tracing

All OSP requests and responses SHOULD include the `X-OSP-Trace-Id` header for distributed tracing.

1. If the agent includes `X-OSP-Trace-Id` in a request, the provider MUST echo it in the response.
2. If the agent does not include the header, the provider SHOULD generate one and include it in the response.
3. The trace ID MUST be propagated to webhook deliveries for the same provisioning flow.
4. Format: UUID v4 or any string up to 128 characters.

This enables debugging of multi-service provisioning flows where an agent provisions database + hosting + auth in sequence. The same trace ID links all three operations.

**Example:**

```http
POST /osp/v1/provision HTTP/1.1
X-OSP-Trace-Id: trace_a1b2c3d4-e5f6-7890-abcd-ef1234567890

---

HTTP/1.1 201 Created
X-OSP-Trace-Id: trace_a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 8.9 Provider Key Rotation

Providers MUST be able to rotate their Ed25519 signing keys without breaking existing integrations.

**Key rotation protocol:**

1. **Key identification.** Each provider key MUST have a unique Key ID (`kid`). The `kid` MUST be included in the manifest alongside the public key:

```json
{
  "provider_public_key": "base64url_encoded_ed25519_public_key",
  "provider_key_id": "key-2026-03"
}
```

2. **JWKS endpoint.** Providers SHOULD publish their active and recently-retired public keys at `/.well-known/osp-keys.json`:

```json
{
  "keys": [
    {
      "kid": "key-2026-03",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "base64url_encoded_public_key",
      "use": "sig",
      "status": "active"
    },
    {
      "kid": "key-2025-12",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "base64url_encoded_old_public_key",
      "use": "sig",
      "status": "retired",
      "retired_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

3. **Rotation procedure:**
   - Provider generates new Ed25519 key pair with new `kid`.
   - Provider publishes new manifest signed with the new key.
   - Provider adds new key to JWKS endpoint with `status: "active"`.
   - Old key transitions to `status: "retired"` but remains in JWKS for 90 days.
   - Agents verifying old manifests (cached or versioned) use the `kid` to look up the correct key from JWKS.

4. **Agent verification with key rotation:**
   - If the manifest includes `provider_key_id`, agents SHOULD fetch the JWKS endpoint to verify the key binding.
   - If the manifest does NOT include `provider_key_id`, agents fall back to the inline `provider_public_key` (backward compatible with pre-rotation manifests).
   - Agents SHOULD cache JWKS responses for up to 1 hour.
   - If a signature fails with the inline key, agents SHOULD retry with keys from the JWKS endpoint before rejecting the manifest.

5. **Emergency rotation:** If a provider key is compromised:
   - Provider immediately publishes new manifest with new key.
   - Provider removes compromised key from JWKS (sets `status: "revoked"`).
   - Agents encountering a `revoked` key MUST reject the manifest immediately and alert the principal.

### 8.10 Threat Model

OSP addresses the following threat vectors specific to agent service provisioning:

| ID | Threat | Attack Vector | Mitigation |
|----|--------|--------------|------------|
| T1 | **Manifest Spoofing** | Attacker serves a fake manifest on a compromised CDN or DNS hijack | Ed25519 manifest signatures (8.1) + DNS TXT key binding (4.3) + JWKS verification (8.9) |
| T2 | **Credential Interception** | MITM intercepts credentials in transit | TLS 1.3 (8.4) + Ed25519 credential encryption (8.2) — even with MITM, credentials are encrypted to agent's key |
| T3 | **Replay Attack** | Attacker replays a valid ProvisionRequest to duplicate resources | Unique nonce per request + 24-hour nonce window (8.3) + idempotency keys (5.5) |
| T4 | **Free Tier Abuse (Sybil)** | Attacker provisions thousands of free resources with fake identities | Trust tier requirements (5.3) + per-principal rate limits + agent attestation |
| T5 | **Credential Stuffing** | Attacker brute-forces the credential retrieval endpoint | Authentication required on GET /credentials (6.3) + rate limiting (8.6) |
| T6 | **Provider Impersonation** | Attacker creates a fake provider with a real-looking manifest | Manifest signature verification (4.3) + registry attestation + TLS origin binding |
| T7 | **Usage Report Inflation** | Malicious provider inflates usage to overcharge | Agent-side usage verification via GET /osp/v1/usage + dispute endpoint (6.8) + countersignature support in billing layer |
| T8 | **Webhook Hijacking** | Attacker redirects webhook to their endpoint to intercept credentials | HMAC-SHA256 webhook signatures (8.5) + HTTPS-only webhooks + webhook secret rotation (6.9) |
| T9 | **Key Compromise (Agent)** | Agent's Ed25519 private key is stolen | Short-lived attestations (8.7) + principal-initiated revocation + provider revocation checks |
| T10 | **Key Compromise (Provider)** | Provider's signing key is stolen | JWKS with key status (8.9) + emergency rotation procedure + agents reject revoked keys |
| T11 | **Stale Manifest Attack** | Attacker serves old manifest version with known vulnerabilities or removed offerings | Manifest versioning (4.4) + agents SHOULD fetch latest before provisioning + `published_at` freshness check |
| T12 | **Resource Squatting** | Agent provisions resources and never uses them, consuming provider capacity | Free tier expiration (`expires_at`) + auto_deprovision on billing failure + provider-defined idle timeouts |
| T13 | **Cross-Provider Data Leakage** | Provider A learns what agent provisions from Provider B via shared metadata | Minimal metadata by default + agents SHOULD NOT include cross-provider information in metadata + ZKP support planned for v1.1 |

**Residual risks (not addressed in v1.0):**

- **Timing attacks on credential rotation:** An attacker observing rotation timing can infer when credentials change. Mitigation: providers SHOULD add random jitter to rotation schedules.
- **Supply chain attacks on providers:** If a legitimate provider is compromised internally, OSP cannot detect this. Mitigation: external monitoring, reputation systems (out of scope for v1.0).
- **Agent hallucination provisioning:** An LLM-based agent might provision wrong services due to hallucination. Mitigation: application-layer validation, spending mandates (Sardis Protocol), human approval workflows.

---

## 9. Conformance

### 9.1 Provider Conformance

A provider is **OSP v1.0 conformant** if and only if it satisfies ALL of the following:

1. **Manifest publication.** Publishes a valid ServiceManifest at `/.well-known/osp.json` that validates against the schema in Appendix A.
2. **Manifest signing.** Signs the manifest with Ed25519 and includes a valid `provider_signature` and `provider_public_key`.
3. **Endpoint implementation.** Implements all eight endpoints defined in Section 6:
   - `POST /osp/v1/provision`
   - `DELETE /osp/v1/deprovision/{resource_id}`
   - `GET /osp/v1/credentials/{resource_id}`
   - `POST /osp/v1/rotate/{resource_id}`
   - `GET /osp/v1/status/{resource_id}`
   - `GET /osp/v1/usage/{resource_id}`
   - `GET /osp/v1/health`
   - `POST /osp/v1/dispute/{resource_id}`
4. **Credential encryption.** Encrypts credentials with `x25519-xsalsa20-poly1305` when the agent provides `agent_public_key`.
5. **Nonce enforcement.** Rejects duplicate nonces within a 24-hour window.
6. **Transport security.** All endpoints use TLS 1.2 or higher.
7. **Error handling.** Returns well-formed error responses with recognized error codes.
8. **Version header.** Includes `X-OSP-Version: 1.0` in all responses.
9. **Conformance test suite.** Passes the OSP conformance test suite (available at the OSP project repository).

### 9.2 Agent Conformance

An agent is **OSP v1.0 conformant** if and only if it satisfies ALL of the following:

1. **Manifest verification.** Verifies the `provider_signature` of every ServiceManifest before trusting it. MUST reject manifests with invalid signatures.
2. **Nonce generation.** Includes a unique `nonce` (UUID v4 or 32+ random characters) in every `ProvisionRequest`, rotation request, and deprovision request.
3. **Credential encryption support.** Provides `agent_public_key` in requests and is capable of decrypting `x25519-xsalsa20-poly1305` encrypted credential bundles.
4. **Async handling.** Handles both synchronous (`status: "provisioned"`) and asynchronous (`status: "provisioning"`) provision responses correctly.
5. **Polling discipline.** When polling for async provisioning, respects the minimum 5-second interval and 1-hour timeout.
6. **Error handling.** Handles all defined error codes and respects `Retry-After` headers.
7. **Version header.** Includes `X-OSP-Version: 1.0` in all requests.

### 9.3 Conformance Levels

Providers and agents MAY advertise their conformance level:

| Level | Provider Requirements | Agent Requirements |
|-------|----------------------|-------------------|
| **OSP Core** | All 8 mandatory endpoints (6.1-6.8) + Sections 9.1 requirements | All Section 9.2 requirements |
| **OSP Core + Webhooks** | Core + webhook management endpoint (6.9) + webhook delivery with retries (8.5) | Core + webhook receiver with HMAC verification |
| **OSP Core + Events** | Core + audit event stream endpoint (6.10) with 90-day retention | Core + event polling capability |
| **OSP Core + Escrow** | Core + escrow profiles in tiers + integration with escrow provider (Sardis or equivalent) | Core + escrow ACK/NACK support |
| **OSP Full** | Core + Webhooks + Events + Escrow + JWKS key rotation (8.9) + geographic compliance (5.7) + all RECOMMENDED features | Core + Webhooks + Events + Escrow + full credential scope support |

---

## 10. Extension Points

### 10.1 Custom Payment Methods

Providers can declare custom payment methods using reverse-domain notation in `accepted_payment_methods`:

```json
"accepted_payment_methods": ["free", "stripe_spt", "com.acme.custom_billing"]
```

Custom payment methods MUST be documented in the manifest's `extensions` object:

```json
"extensions": {
  "payment_methods": {
    "com.acme.custom_billing": {
      "description": "Acme Corp internal billing system",
      "documentation_url": "https://acme.com/docs/osp-billing",
      "payment_proof_schema": {
        "type": "object",
        "properties": {
          "acme_account_id": { "type": "string" },
          "authorization_token": { "type": "string" }
        },
        "required": ["acme_account_id", "authorization_token"]
      }
    }
  }
}
```

### 10.2 Provider-Specific Extensions

The ServiceManifest, ServiceOffering, and ServiceTier objects all support an `extensions` field for provider-specific metadata. Agents SHOULD ignore unrecognized extensions.

**Naming convention:** Extension keys MUST use reverse-domain notation to avoid collisions:

```json
"extensions": {
  "com.supabase.branching": {
    "supported": true,
    "max_branches": 10
  },
  "com.supabase.edge_functions": {
    "runtime": "deno",
    "max_functions": 25
  }
}
```

### 10.3 Custom Credential Fields

Providers MAY include additional fields in the `credentials` object beyond those defined in the `credentials_schema`. Agents SHOULD ignore unrecognized credential fields but MUST NOT error on them.

### 10.4 Service Improvement Proposals (SIPs)

Changes to the OSP specification follow the SIP process:

1. **SIP Proposal.** Anyone can propose a SIP by submitting it to the OSP project repository.
2. **Discussion Period.** SIPs are discussed publicly for a minimum of 30 days.
3. **Reference Implementation.** SIPs MUST include a reference implementation or proof-of-concept.
4. **Acceptance.** SIPs are accepted by rough consensus of the OSP community.
5. **Versioning.** Accepted SIPs that change the protocol increment the minor version (e.g., 1.1, 1.2). Breaking changes increment the major version (e.g., 2.0).

**SIP Categories:**

| Category | Description |
|----------|-------------|
| `core` | Changes to protocol objects, endpoints, or security requirements. |
| `billing` | New payment methods or billing flow changes. |
| `discovery` | Changes to manifest format or registry API. |
| `security` | Security-related improvements. |
| `informational` | Best practices, guidelines, or non-normative documents. |

---

## 11. Project Management

### 11.1 Project Object

A **Project** groups related resources under a single organizational unit. Projects enable bulk operations, shared configuration, and cross-resource coordination.

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | `string` | REQUIRED | Unique project identifier. Format: `proj_{random}`. |
| `name` | `string` | REQUIRED | Human-readable project name. Max 64 characters. |
| `description` | `string` | OPTIONAL | Project description. Max 256 characters. |
| `resources` | `array<string>` | REQUIRED | List of resource_ids in this project. |
| `environment` | `string` | OPTIONAL | Environment label: `development`, `staging`, `production`. |
| `metadata` | `object` | OPTIONAL | Project-level metadata (team, cost_center, etc.). |
| `env_config` | `EnvConfig` | OPTIONAL | Environment variable configuration. See Section 11.3. |
| `created_at` | `string` | REQUIRED | RFC 3339 timestamp. |
| `principal_id` | `string` | OPTIONAL | Owning principal. |

#### Example

```json
{
  "project_id": "proj_my-saas-app",
  "name": "My SaaS App",
  "description": "Production backend stack",
  "environment": "production",
  "resources": ["res_db_abc", "res_hosting_def", "res_auth_ghi"],
  "metadata": {
    "team": "backend",
    "env": "production",
    "managed_by": "claude-code"
  },
  "created_at": "2026-03-27T12:00:00Z"
}
```

### 11.2 Project Endpoints

#### POST /osp/v1/projects

Create a new project.

```http
POST /osp/v1/projects HTTP/1.1

{
  "name": "My SaaS App",
  "environment": "production",
  "metadata": {"team": "backend"}
}
```

Response: `201 Created` with Project object.

#### GET /osp/v1/projects

List all projects for the authenticated principal.

```http
GET /osp/v1/projects?environment=production HTTP/1.1
```

#### GET /osp/v1/projects/{project_id}

Get project details including all resources and their status.

```http
GET /osp/v1/projects/proj_my-saas HTTP/1.1
```

Response includes aggregated status:

```json
{
  "project_id": "proj_my-saas",
  "name": "My SaaS App",
  "resources": [
    {"resource_id": "res_db", "service": "supabase/managed-postgres", "tier": "pro", "status": "healthy"},
    {"resource_id": "res_host", "service": "vercel/hosting", "tier": "pro", "status": "healthy"},
    {"resource_id": "res_auth", "service": "clerk/auth", "tier": "free", "status": "healthy"}
  ],
  "total_monthly_cost": {"amount": "45.00", "currency": "USD"},
  "health": "all_healthy"
}
```

#### POST /osp/v1/projects/{project_id}/provision

Provision a resource and automatically add it to the project.

```json
{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "project_name": "my-saas-db"
}
```

This is equivalent to `POST /osp/v1/provision` + adding the resource_id to the project, but in one call.

#### DELETE /osp/v1/projects/{project_id}

Deprovision ALL resources in the project and delete the project. Requires `confirm: true`.

```json
{"confirm": true, "deprovision_resources": true}
```

If `deprovision_resources` is `false`, the project is deleted but resources remain active (orphaned).

### 11.3 Environment Variable Management

The core pain point: developers waste hours copying API keys between dashboards, .env files, and deployment platforms. OSP standardizes this.

#### EnvConfig Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | `string` | OPTIONAL | Output format: `dotenv`, `json`, `yaml`, `toml`, `shell`. Default: `dotenv`. |
| `prefix_style` | `string` | OPTIONAL | How to prefix vars: `none`, `service_name`, `offering_id`. Default: `none`. |
| `include_non_secret` | `boolean` | OPTIONAL | Include non-secret values (URLs, project IDs). Default: `true`. |
| `exclude_keys` | `array<string>` | OPTIONAL | Credential keys to exclude from output. |
| `renames` | `object` | OPTIONAL | Key renames: `{"SUPABASE_URL": "DATABASE_URL"}`. |

#### GET /osp/v1/projects/{project_id}/env

Generate a complete environment file from all resources in the project.

```http
GET /osp/v1/projects/proj_my-saas/env?format=dotenv HTTP/1.1
Authorization: Bearer <agent_attestation>
```

Response:

```
# Generated by OSP — proj_my-saas (production)
# supabase/managed-postgres (res_db_abc)
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# vercel/hosting (res_host_def)
VERCEL_TOKEN=vercel_...
VERCEL_PROJECT_ID=prj_...

# clerk/auth (res_auth_ghi)
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
```

**Key features:**
- Comments indicate which service each variable comes from
- Non-secret values (URLs) are included alongside secrets
- `NEXT_PUBLIC_` prefixed vars are auto-generated for frontend frameworks when applicable

#### POST /osp/v1/projects/{project_id}/env/sync

Sync environment variables to a deployment platform.

```json
{
  "target": "vercel",
  "target_config": {
    "vercel_token": "...",
    "vercel_project_id": "prj_abc",
    "environment": "production"
  },
  "filter": {
    "include_resources": ["res_db_abc", "res_auth_ghi"],
    "exclude_keys": ["SUPABASE_SERVICE_KEY"]
  }
}
```

Supported sync targets (extensible):

| Target | What It Does |
|--------|-------------|
| `vercel` | Sets environment variables in Vercel project settings |
| `railway` | Sets variables in Railway service |
| `cloudflare` | Sets secrets in Cloudflare Workers |
| `github_actions` | Sets repository secrets in GitHub Actions |
| `local_file` | Writes to a local `.env` file path |
| `doppler` | Syncs to Doppler project |

#### Monorepo Support

For monorepos, env can be scoped to specific packages:

```http
GET /osp/v1/projects/proj_my-saas/env?format=dotenv&scope=packages/api HTTP/1.1
```

The project's `env_config` can define per-package mappings:

```json
{
  "env_config": {
    "monorepo_mappings": {
      "packages/api": {
        "include_resources": ["res_db", "res_auth"],
        "renames": {"SUPABASE_URL": "DATABASE_URL"}
      },
      "packages/web": {
        "include_resources": ["res_auth"],
        "prefix_style": "none",
        "include_public_only": true
      },
      "packages/worker": {
        "include_resources": ["res_db", "res_queue"],
        "exclude_keys": ["SUPABASE_ANON_KEY"]
      }
    }
  }
}
```

This means `GET /env?scope=packages/api` returns ONLY the vars for the API package, with the correct renames. No more "which .env goes where."

### 11.4 Cross-Project Resource Sharing

When the same service instance (e.g., one Supabase DB) is used across multiple projects:

```http
POST /osp/v1/projects/proj_staging/link HTTP/1.1

{
  "resource_id": "res_db_abc",
  "source_project_id": "proj_production",
  "credential_scope": "read_only"
}
```

The resource now appears in both projects' `GET /env` output, but with different credential scopes. The staging project gets read-only credentials while production has full access.

### 11.5 Project Templates (Presets)

Pre-configured project templates that provision an entire stack in one command.

#### GET /osp/registry/v1/presets

```json
{
  "presets": [
    {
      "preset_id": "nextjs-supabase-starter",
      "name": "Next.js + Supabase + Vercel",
      "description": "Full-stack Next.js app with Supabase Postgres, Auth, and Vercel hosting",
      "resources": [
        {"offering_id": "supabase/managed-postgres", "tier_id": "free", "alias": "db"},
        {"offering_id": "supabase/auth", "tier_id": "free", "alias": "auth"},
        {"offering_id": "vercel/hosting", "tier_id": "hobby", "alias": "hosting"}
      ],
      "env_config": {
        "renames": {"SUPABASE_URL": "NEXT_PUBLIC_SUPABASE_URL"},
        "monorepo_mappings": null
      },
      "estimated_monthly_cost": "0.00",
      "setup_time_seconds": 60,
      "popularity": 4523,
      "author": "osp-community"
    }
  ]
}
```

#### POST /osp/v1/projects/from-preset

Provision an entire stack from a preset:

```json
{
  "preset_id": "nextjs-supabase-starter",
  "project_name": "my-new-app",
  "environment": "development",
  "overrides": {
    "db": {"tier_id": "pro", "region": "eu-west-1"},
    "hosting": {"tier_id": "pro"}
  }
}
```

Response: a Project object with all resources provisioned and env ready.

This replaces the "spend 2 hours setting up a new project" flow with a single API call.

### 11.6 Infrastructure-as-Code (Declarative Configuration)

Projects can be defined declaratively in an `osp.yaml` file:

```yaml
# osp.yaml — declarative project configuration
version: "1.0"
project:
  name: my-saas-app
  environment: production

resources:
  database:
    offering: supabase/managed-postgres
    tier: pro
    region: us-east-1
    config:
      postgres_version: "17"
      enable_pooling: true

  hosting:
    offering: vercel/hosting
    tier: pro
    depends_on: [database]
    config:
      framework: nextjs

  auth:
    offering: clerk/auth
    tier: free

  analytics:
    offering: posthog/analytics
    tier: free

env:
  format: dotenv
  renames:
    SUPABASE_URL: DATABASE_URL
    CLERK_PUBLISHABLE_KEY: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  scopes:
    packages/api:
      include: [database, auth]
    packages/web:
      include: [auth, analytics]
      public_only: true
    packages/worker:
      include: [database]
```

#### POST /osp/v1/projects/apply

Apply a declarative configuration (like `terraform apply`):

```json
{
  "config": "<osp.yaml contents as JSON>",
  "plan_only": false,
  "auto_approve": true
}
```

**Plan mode** (`plan_only: true`):

```json
{
  "plan": {
    "create": [
      {"alias": "database", "offering": "supabase/managed-postgres", "tier": "pro", "cost": "25.00/mo"},
      {"alias": "hosting", "offering": "vercel/hosting", "tier": "pro", "cost": "20.00/mo"},
      {"alias": "auth", "offering": "clerk/auth", "tier": "free", "cost": "0.00"},
      {"alias": "analytics", "offering": "posthog/analytics", "tier": "free", "cost": "0.00"}
    ],
    "update": [],
    "destroy": [],
    "total_monthly_cost": "45.00",
    "estimated_setup_time_seconds": 90
  }
}
```

**Apply mode**: executes the plan, provisions all resources in dependency order, and returns the project with env ready.

**Drift detection**: `POST /osp/v1/projects/{id}/drift` compares the live state with the `osp.yaml` and reports differences:

```json
{
  "drifts": [
    {"resource": "database", "field": "tier", "expected": "pro", "actual": "free", "action": "upgrade"},
    {"resource": "cache", "status": "missing", "action": "create"}
  ]
}
```

This gives teams Terraform-like declarative management for their SaaS infrastructure.

### 11.7 Account Linking (Pre-Provisioning)

Link a provider account without provisioning any resources. This is the "I already have a Supabase account, just connect it" flow.

#### POST /osp/v1/accounts/link

```json
{
  "provider_id": "supabase.com",
  "auth_method": "oauth",
  "redirect_url": "https://myagent.com/callback"
}
```

Response:

```json
{
  "link_id": "link_abc123",
  "status": "pending",
  "auth_url": "https://supabase.com/oauth/authorize?client_id=osp&redirect_uri=...",
  "expires_at": "2026-03-27T13:00:00Z"
}
```

After OAuth callback:

```json
{
  "link_id": "link_abc123",
  "status": "linked",
  "provider_id": "supabase.com",
  "account_id": "supabase_org_xyz",
  "existing_resources": [
    {"resource_id": "proj_abc", "name": "existing-project", "importable": true}
  ]
}
```

This enables **importing existing resources** into OSP without re-provisioning. The agent can discover what's already provisioned and bring it under OSP management.

#### POST /osp/v1/accounts/{link_id}/import

Import existing resources from a linked account:

```json
{
  "resources": ["proj_abc"],
  "project_id": "proj_my-saas"
}
```

### 11.8 LLM Context Generation

Providers publish structured LLM context alongside their manifest, enabling agents to understand HOW to use provisioned services.

#### Provider LLM Context

At `/.well-known/osp-llm-context.md` (alongside `osp.json`), providers publish a markdown document optimized for LLM consumption:

```markdown
# Supabase — OSP Agent Context

## Quick Start
After provisioning, your credentials include SUPABASE_URL and SUPABASE_ANON_KEY.
Use the Supabase JS client: `import { createClient } from '@supabase/supabase-js'`

## Common Operations
- Create a table: POST to {SUPABASE_URL}/rest/v1/rpc/exec_sql
- Insert data: POST to {SUPABASE_URL}/rest/v1/{table_name}
- Query data: GET {SUPABASE_URL}/rest/v1/{table_name}?select=*

## Authentication
Use SUPABASE_ANON_KEY for client-side (Row Level Security applies).
Use SUPABASE_SERVICE_KEY for server-side (bypasses RLS — use carefully).

## Common Mistakes
- Don't expose SUPABASE_SERVICE_KEY in client-side code
- Always enable RLS on tables that hold user data
- Use the connection pooler URL for serverless environments
```

#### GET /osp/v1/projects/{project_id}/llm-context

Generate a combined LLM context file for all services in a project:

```http
GET /osp/v1/projects/proj_my-saas/llm-context HTTP/1.1
```

Returns a merged document with context from all providers, plus project-specific env var names. This is what gets fed to Claude, GPT, or Cursor as project context.

```markdown
# Project: my-saas-app (production)

## Available Services

### Database: Supabase Managed PostgreSQL (pro)
Connection: $DATABASE_URL
[...provider LLM context...]

### Auth: Clerk (free)
Publishable key: $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
[...provider LLM context...]

### Hosting: Vercel (pro)
[...provider LLM context...]

## Environment Variables
All variables available via: osp env pull --project my-saas-app
```

---

## 12. Agent Credential Safety

AI coding agents (Cursor, Claude Code, GitHub Copilot) routinely index project files including `.env`, `docker-compose.yml`, and config files. This creates a new attack surface: credentials provisioned via OSP can leak into LLM context windows, training data, or generated code.

### 12.1 The Problem

GitGuardian's 2026 State of Secrets Sprawl report found:
- 28.65 million hardcoded secrets on public GitHub in 2025 (34% YoY increase)
- AI-service key leaks surged 81% YoY
- Claude Code-assisted commits leaked secrets at ~3.2%, 2x the baseline rate
- 24,008 unique secrets exposed in MCP configuration files

When an agent provisions a service via OSP and receives credentials, those credentials must be protected from:
1. **Context window leakage** — the agent's LLM sees the credentials in `.env` and includes them in generated code or commits
2. **Training data inclusion** — credentials end up in the model provider's training pipeline
3. **MCP config exposure** — credentials stored in MCP server config files are indexed
4. **Clipboard/log leakage** — credentials displayed in terminal output are captured

### 12.2 Credential Delivery Modes

OSP defines three credential delivery modes that providers and agents negotiate:

| Mode | How Credentials Are Stored | Agent Sees | Risk Level |
|------|---------------------------|------------|------------|
| `plaintext` | Raw values in `.env` or vault | Full credentials | High — standard today |
| `reference` | Opaque references that resolve at runtime | `osp://supabase/managed-postgres/DATABASE_URL` | Low — agent never sees real values |
| `encrypted_at_rest` | Encrypted on disk, decrypted only at process start | Encrypted blob | Low — requires decryption key at runtime |

#### Reference Mode (RECOMMENDED for AI-assisted development)

Instead of storing raw credentials, OSP can deliver **credential references** that resolve at runtime:

```env
# .env (safe to index by AI agents — no real secrets)
DATABASE_URL=osp://supabase/managed-postgres/connection_uri
SUPABASE_ANON_KEY=osp://supabase/managed-postgres/anon_key
CLERK_SECRET_KEY=osp://clerk/auth/secret_key
RESEND_API_KEY=osp://resend/email/api_key
```

The `osp://` URI scheme:
```
osp://{provider}/{offering}/{credential_key}
```

At runtime, the OSP SDK resolves references by:
1. Looking up the resource in the local vault (encrypted)
2. Decrypting with the agent's key
3. Injecting the real value into the environment

```typescript
// Application code — no changes needed
const db = new Pool({ connectionString: process.env.DATABASE_URL });
// OSP SDK intercepts process.env and resolves osp:// references
```

```python
# Python — OSP SDK patches os.environ
import osp
osp.init()  # Resolves all osp:// references in environment

import os
db_url = os.environ["DATABASE_URL"]  # Returns real connection string
```

**Benefits:**
- AI agents see `osp://supabase/managed-postgres/connection_uri` not `postgresql://user:pass@host:5432/db`
- Safe to commit `.env` files with references (no secrets)
- Credentials never appear in terminal output, logs, or generated code
- Rotation is transparent — the reference stays the same, the resolved value changes

#### Encrypted-at-Rest Mode

For environments where the `osp://` scheme is not supported:

```env
# .env.encrypted (encrypted with project key)
DATABASE_URL=enc:v1:base64_encrypted_blob_here
CLERK_SECRET_KEY=enc:v1:another_encrypted_blob
```

Decrypted at process start by the OSP SDK using a project-level key stored in the system keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager).

### 12.3 Credential Visibility Controls

Providers SHOULD support per-credential visibility settings in the `credentials_schema`:

```json
{
  "credentials_schema": {
    "type": "object",
    "properties": {
      "SUPABASE_URL": {
        "type": "string",
        "description": "Project API URL",
        "osp_visibility": "public"
      },
      "SUPABASE_ANON_KEY": {
        "type": "string",
        "description": "Public anon key (safe for client-side)",
        "osp_visibility": "public"
      },
      "SUPABASE_SERVICE_KEY": {
        "type": "string",
        "description": "Service role key (server-side only)",
        "osp_visibility": "secret"
      }
    }
  }
}
```

Visibility levels:

| Level | Meaning | `.env` Behavior |
|-------|---------|----------------|
| `public` | Safe for client-side code, can appear in `NEXT_PUBLIC_*` vars | Stored as plaintext |
| `internal` | Server-side only, safe for agent to see but not commit | Stored as plaintext in `.env.local` (gitignored) |
| `secret` | Must never appear in agent context or generated code | Stored as `osp://` reference or encrypted |

### 12.4 .gitignore and .cursorignore Generation

When a project is initialized, OSP SHOULD generate ignore files:

```gitignore
# .gitignore (generated by OSP)
.env.local
.env.*.local
.osp/vault.json
.osp/vault.key
```

```
# .cursorignore (or .claudeignore) — prevents AI indexing
.env.local
.env.*.local
.osp/vault.json
.osp/vault.key
*.pem
*.key
```

### 12.5 Credential Leak Detection

OSP clients SHOULD implement basic leak detection:

1. **Pre-commit hook:** Scan staged files for credential patterns (API key prefixes like `sk_`, `pk_live_`, `re_`, `whsec_`). Block commit if found.
2. **Runtime detection:** If a resolved credential appears in a log output or HTTP response body, emit a warning.
3. **MCP config audit:** Scan MCP configuration files for raw credentials and suggest replacing with `osp://` references.

Providers SHOULD publish their credential patterns (regex) in the ServiceManifest for automated detection:

```json
{
  "extensions": {
    "osp_credential_patterns": {
      "SUPABASE_SERVICE_KEY": "^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$",
      "SUPABASE_ANON_KEY": "^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$"
    }
  }
}
```

---

## 13. Developer Experience

### 13.1 Typed Environment Variables

`.env` files are untyped string bags — typos are runtime errors, missing variables cause cryptic failures, and there's no documentation inline. OSP defines a typed env schema that enables validation, documentation, and IDE support.

#### Project Env Schema

OSP generates a `osp.env.schema.json` file from all provisioned services:

```json
{
  "$schema": "https://osp.dev/schemas/env-schema.json",
  "project_id": "proj_my-saas",
  "variables": {
    "DATABASE_URL": {
      "type": "string",
      "format": "postgres-uri",
      "source": "supabase/managed-postgres",
      "resource_id": "res_db_abc",
      "required": true,
      "secret": true,
      "description": "PostgreSQL connection URI",
      "example": "postgresql://user:pass@host:5432/db",
      "validation": "^postgresql://.*"
    },
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": {
      "type": "string",
      "source": "clerk/auth",
      "resource_id": "res_auth_ghi",
      "required": true,
      "secret": false,
      "description": "Clerk publishable key for client-side auth",
      "example": "pk_test_...",
      "validation": "^pk_(test|live)_",
      "framework_prefix": "NEXT_PUBLIC_"
    },
    "RESEND_API_KEY": {
      "type": "string",
      "source": "resend/email",
      "resource_id": "res_email_jkl",
      "required": false,
      "secret": true,
      "description": "Resend API key for transactional email",
      "validation": "^re_"
    }
  }
}
```

#### Env Validation

OSP clients MUST validate environment variables against the schema at startup:

```
$ osp env validate

✓ DATABASE_URL — valid (matches postgres-uri format)
✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — valid (matches pk_test_* pattern)
✗ RESEND_API_KEY — MISSING (required: false, but referenced in code)
✗ STRIPE_SECRET_KEY — INVALID (expected sk_test_*, got pk_test_*)

2 warnings, 0 errors
```

#### IDE Integration

The `osp.env.schema.json` enables IDE features:
- **Autocomplete** — when typing `process.env.`, suggest all known variables
- **Type checking** — warn if a string env var is used as a number
- **Hover documentation** — show description, source service, and whether it's a secret
- **Missing variable detection** — highlight references to undeclared env vars

### 13.2 Clone-to-Running Flow

The goal: a developer clones a repo and has a fully running app in under 60 seconds, with zero manual dashboard visits.

#### The `osp setup` Command

When a repo contains an `osp.yaml` file:

```bash
$ git clone https://github.com/acme/my-saas-app
$ cd my-saas-app
$ osp setup
```

`osp setup` performs:

1. **Parse `osp.yaml`** — read declared services and configuration
2. **Check for existing resources** — if the developer has linked accounts, reuse existing resources where possible
3. **Provision missing resources** — create any services not yet provisioned
4. **Generate `.env`** — write environment variables in the correct format
5. **Run post-setup hooks** — execute database migrations, seed data, install dependencies
6. **Validate** — check all env vars are present and valid
7. **Report** — show setup summary with time elapsed

```
$ osp setup

OSP Setup: my-saas-app
━━━━━━━━━━━━━━━━━━━━━━

[1/6] Parsing osp.yaml...
      3 resources declared (database, auth, email)

[2/6] Checking existing resources...
      ✓ database: found linked Supabase account (supabase.com/acme-org)
      ✗ auth: no Clerk account linked
      ✗ email: no Resend account linked

[3/6] Provisioning...
      ✓ database: reusing existing res_db_abc (supabase/managed-postgres, pro)
      ✓ auth: provisioned res_auth_new (clerk/auth, free) — 2.3s
      ✓ email: provisioned res_email_new (resend/email, free) — 0.8s

[4/6] Generating .env...
      ✓ .env.local written (7 variables, 3 secrets as osp:// references)
      ✓ .env.example updated (7 variables, no secrets)

[5/6] Running post-setup hooks...
      ✓ npm install (12.4s)
      ✓ npx prisma migrate deploy (3.2s)
      ✓ npx prisma db seed (1.1s)

[6/6] Validating...
      ✓ All 7 env vars present and valid
      ✓ Database connection verified (SELECT 1 — 23ms)
      ✓ Auth endpoint reachable (200 OK — 89ms)

━━━━━━━━━━━━━━━━━━━━━━
Setup complete in 22.3s
Run: npm run dev
```

#### osp.yaml Post-Setup Hooks

```yaml
# osp.yaml
setup:
  hooks:
    post_provision:
      - npm install
      - npx prisma migrate deploy
      - npx prisma db seed

    post_env:
      - npx next telemetry disable

    verify:
      - name: Database connection
        command: npx prisma db execute --stdin <<< "SELECT 1"
        timeout: 10s
      - name: Auth endpoint
        url: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:+https://api.clerk.com/v1/health}
        expect_status: 200
```

### 13.3 Framework-Aware Env Generation

Different frameworks need different env var formats. OSP auto-detects the framework and adjusts:

| Framework | Detection | Env Behavior |
|-----------|-----------|-------------|
| **Next.js** | `next.config.js` exists | Prefix public vars with `NEXT_PUBLIC_`. Write to `.env.local`. |
| **Vite** | `vite.config.ts` exists | Prefix public vars with `VITE_`. Write to `.env.local`. |
| **Nuxt** | `nuxt.config.ts` exists | Use `runtimeConfig` format. Write to `.env`. |
| **SvelteKit** | `svelte.config.js` exists | Prefix public vars with `PUBLIC_`. Write to `.env`. |
| **Remix** | `remix.config.js` exists | No prefix convention. Write to `.env`. |
| **Astro** | `astro.config.mjs` exists | Prefix public vars with `PUBLIC_`. Write to `.env`. |
| **Express/Fastify** | `package.json` has express/fastify dep | No prefix. Write to `.env`. |
| **Django** | `manage.py` exists | Write to `.env`. Use `django-environ` format. |
| **FastAPI** | `main.py` with fastapi import | Write to `.env`. Pydantic Settings format. |
| **Rails** | `Gemfile` with rails | Write to `.env`. `dotenv-rails` format. |

When generating env for a monorepo, each package gets framework-appropriate formatting:

```yaml
# osp.yaml
env:
  scopes:
    apps/web:       # Next.js
      framework: nextjs
      include: [database, auth]
    apps/api:       # FastAPI
      framework: fastapi
      include: [database, email]
    packages/shared: # TypeScript library
      framework: none
      include: [database]
```

### 13.4 Interactive Setup Wizard

For projects without an `osp.yaml`, OSP provides an interactive wizard:

```bash
$ osp init

Welcome to OSP! Let's set up your project.

? Project name: my-new-app
? Framework: Next.js (detected from package.json)
? What services do you need?
  ◉ Database (PostgreSQL)
  ◉ Authentication
  ◯ Email
  ◯ Analytics
  ◯ Object Storage
  ◯ Redis/Cache
  ◯ Search

? Database provider:
  ◉ Supabase (★ 94, $0-25/mo)
  ◯ Neon (★ 91, $0-19/mo)
  ◯ PlanetScale (★ 87, $0-29/mo)
  ◯ Turso (★ 78, $0-9/mo)

? Auth provider:
  ◉ Clerk (★ 92, $0-25/mo)
  ◯ Supabase Auth (included with DB)

? Tier: Free (recommended for development)

Creating osp.yaml...
Run `osp setup` to provision everything.
```

### 13.5 Environment Diffing

When environment variables change (new service added, credential rotated, tier upgraded), OSP shows a diff:

```bash
$ osp env diff

Changes since last sync (2026-03-25):

+ POSTHOG_API_KEY=osp://posthog/analytics/api_key    (new: posthog/analytics provisioned)
~ DATABASE_URL                                         (rotated: new credentials issued 2026-03-27)
- SENDGRID_API_KEY                                     (removed: resend/email replaced sendgrid)

Apply changes? [y/N]
```

### 13.6 Team Onboarding

When a new developer joins a team:

```bash
$ git clone https://github.com/acme/my-saas-app
$ cd my-saas-app
$ osp join

Joining project: my-saas-app (production)

? Authenticate: Sign in with GitHub (recommended)
  → Redirecting to OSP auth...
  → Authenticated as @newdev (acme org)

Pulling environment...
  ✓ 12 variables synced from team vault
  ✓ 3 secrets delivered as osp:// references
  ✓ Personal dev credentials generated (scoped: read_only)
  ✓ .env.local written

You're ready! Run: npm run dev
Time: 8.2s
```

Key features:
- **No Slack DMs for env vars** — credentials pulled from team vault
- **Scoped credentials** — new devs get read-only by default, not admin
- **No shared secrets** — each dev gets their own credential set
- **Revocation on offboarding** — `osp leave` revokes all credentials

---

## 14. Ecosystem Integration

### 14.1 Browser Automation Fallback

Not all providers have provisioning APIs. For Tier 3-4 providers (Section Appendix G), OSP supports a **browser automation fallback** using AI browser agents.

#### Flow

When `POST /osp/v1/provision` cannot be fulfilled via API (provider has no OSP endpoints or management API), the OSP client MAY:

1. **Deep link** — Open the provider's signup page with pre-filled parameters:
   ```
   https://dashboard.clerk.com/sign-up?
     utm_source=osp&
     utm_medium=provision&
     project_name=my-app&
     plan=free
   ```

2. **Browser agent** — Delegate to a browser automation agent (Browser Use, Stagehand, Skyvern) to navigate the signup flow:
   ```json
   {
     "fallback": "browser_agent",
     "agent": "browser-use",
     "instructions": "Sign up for Clerk, create an application named '{project_name}', select the free plan, and extract CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY from the API keys page.",
     "timeout_seconds": 300,
     "requires_human_interaction": ["captcha", "email_verification", "2fa"]
   }
   ```

3. **Manual with clipboard** — Guide the user through manual steps and capture credentials:
   ```
   $ osp provision clerk/auth --manual

   Clerk requires manual setup. Follow these steps:

   1. Open: https://dashboard.clerk.com/sign-up
   2. Create account and verify email
   3. Create a new application named "my-app"
   4. Go to API Keys page

   Paste your Publishable Key: pk_test_[pasted]
   Paste your Secret Key: sk_test_[pasted]

   ✓ Credentials verified and saved to vault
   ```

#### Provider Manifest Declaration

Providers SHOULD declare their automation support in the manifest:

```json
{
  "extensions": {
    "osp_automation": {
      "api_provisioning": false,
      "deep_link_template": "https://dashboard.clerk.com/sign-up?project={project_name}&plan={tier_id}",
      "browser_automation_compatible": true,
      "manual_steps": [
        "Create account at https://dashboard.clerk.com",
        "Create application",
        "Copy API keys from dashboard"
      ],
      "estimated_manual_time_minutes": 5,
      "credential_import_supported": true
    }
  }
}
```

### 14.2 Credential Import

For services provisioned outside OSP (existing accounts, manual setup), agents can import credentials:

#### POST /osp/v1/import

```http
POST /osp/v1/import HTTP/1.1
Content-Type: application/json

{
  "provider_id": "openai.com",
  "offering_id": "openai/api",
  "project_id": "proj_my-saas",
  "credentials": {
    "OPENAI_API_KEY": "sk-..."
  },
  "metadata": {
    "imported_from": "manual",
    "imported_at": "2026-03-27T15:00:00Z"
  }
}
```

Response:

```json
{
  "resource_id": "res_imported_abc",
  "status": "imported",
  "managed": false,
  "capabilities": {
    "rotate": false,
    "deprovision": false,
    "usage": false,
    "health_check": false
  },
  "note": "Imported credentials are not managed by OSP. Rotation, deprovisioning, and usage tracking are not available."
}
```

Imported resources appear in `GET /projects/{id}/env` alongside OSP-managed resources, but with `managed: false`. This enables a unified `.env` even when some services can't be fully automated.

### 14.3 Sandbox and Preview Environments

Agents often need temporary environments for testing, PR previews, or experimentation. OSP supports ephemeral sandbox provisioning.

#### Sandbox Mode

```http
POST /osp/v1/provision HTTP/1.1

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "project_name": "pr-preview-142",
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

**Sandbox fields:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Whether this is a sandbox resource |
| `ttl_hours` | `integer` | Auto-destroy after this many hours. Max: 720 (30 days). |
| `auto_destroy` | `boolean` | Whether to auto-destroy on TTL expiry |
| `seed_from` | `string` | Resource ID to seed data from (schema and/or data) |
| `seed_mode` | `string` | `schema_only`, `schema_and_sample_data`, `full_clone` |

Sandbox resources:
- Are tagged with `osp_sandbox: true` in metadata
- Appear with a visual indicator in `osp env` output
- Send `resource.sandbox_expiring` webhook 1 hour before TTL expires
- Are excluded from billing (when on free tier) or charged at sandbox rates
- Can be promoted to permanent: `POST /osp/v1/promote/{resource_id}`

#### PR Preview Environments

Integration with CI/CD:

```yaml
# .github/workflows/preview.yml
- name: Create preview environment
  run: |
    osp projects create --name "pr-${{ github.event.number }}" --environment preview --sandbox --ttl 48h
    osp provision supabase/managed-postgres --tier free --sandbox --seed-from prod --seed-mode schema_only
    osp provision vercel/hosting --tier hobby
    osp env pull --format github-actions >> $GITHUB_ENV

- name: Destroy preview environment
  if: github.event.action == 'closed'
  run: osp projects delete "pr-${{ github.event.number }}" --force --deprovision
```

### 14.4 MCP Integration

OSP services can be exposed as MCP tools, enabling AI agents to provision and manage services natively.

#### OSP MCP Server

An OSP MCP server exposes all OSP operations as MCP tools:

```json
{
  "mcpServers": {
    "osp": {
      "command": "npx",
      "args": ["@osp/mcp-server"],
      "env": {
        "OSP_PROJECT_ID": "proj_my-saas",
        "OSP_AUTH_TOKEN": "osp_..."
      }
    }
  }
}
```

Available MCP tools:

| Tool | Description |
|------|-------------|
| `osp_discover` | Search for available services |
| `osp_provision` | Provision a service |
| `osp_deprovision` | Remove a service |
| `osp_env` | Get current environment variables |
| `osp_status` | Check all services' health |
| `osp_estimate` | Get cost estimate |
| `osp_setup` | Run full project setup |
| `osp_rotate` | Rotate credentials |

This means Claude, Cursor, or any MCP-compatible agent can say "I need a PostgreSQL database" and OSP provisions it without the developer leaving the editor.

#### Provider MCP Context

Providers publish LLM context at `/.well-known/osp-llm-context.md` (Section 11.8). When an agent provisions a service, the provider's context is automatically merged into the project's MCP context, so the agent knows how to USE the service, not just provision it.

### 14.5 CI/CD Integration

OSP integrates with CI/CD pipelines for automated environment management.

#### GitHub Actions

```yaml
- uses: osp/setup-action@v1
  with:
    project-id: proj_my-saas
    environment: staging

# All env vars now available as GitHub Actions env vars
- run: npm test
```

#### Vercel Build Plugin

```json
{
  "plugins": [{
    "package": "@osp/vercel-plugin",
    "config": {
      "project_id": "proj_my-saas",
      "environment_mapping": {
        "production": "production",
        "preview": "staging",
        "development": "development"
      }
    }
  }]
}
```

The plugin automatically syncs OSP env vars to Vercel environment variables before each build.

### 14.6 Cost Dashboard

Agents and developers need visibility into total infrastructure costs across all providers.

#### GET /osp/v1/projects/{project_id}/cost

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
    },
    {
      "resource_id": "res_host",
      "service": "vercel/hosting",
      "tier": "pro",
      "base_cost": "20.00",
      "metered_cost": "2.00",
      "total": "22.00"
    },
    {
      "resource_id": "res_auth",
      "service": "clerk/auth",
      "tier": "pro",
      "base_cost": "20.00",
      "metered_cost": "0.00",
      "total": "20.00"
    }
  ],
  "comparison": {
    "previous_period": "68.20",
    "change_percent": "+9.2%",
    "cost_alerts": [
      {
        "resource": "res_db",
        "alert": "Storage overage increasing — consider upgrading to Team tier ($45/mo, includes 100GB)"
      }
    ]
  }
}
```

### 14.7 Notifications and Alerts

OSP aggregates notifications from all providers into a single stream.

#### GET /osp/v1/projects/{project_id}/notifications

```json
{
  "notifications": [
    {
      "id": "notif_001",
      "type": "credential_expiring",
      "severity": "warning",
      "resource": "res_db",
      "message": "Database credentials expire in 7 days. Run `osp rotate supabase/managed-postgres`.",
      "created_at": "2026-03-27T10:00:00Z",
      "action_url": "osp://rotate/res_db"
    },
    {
      "id": "notif_002",
      "type": "usage_threshold",
      "severity": "info",
      "resource": "res_host",
      "message": "Vercel bandwidth at 80% of pro tier limit (800GB/1TB).",
      "created_at": "2026-03-27T09:00:00Z"
    },
    {
      "id": "notif_003",
      "type": "offering_deprecated",
      "severity": "warning",
      "resource": "res_auth",
      "message": "Clerk auth free tier will sunset on 2026-06-01. Upgrade to Pro or migrate.",
      "created_at": "2026-03-20T00:00:00Z",
      "action_url": "osp://upgrade/res_auth"
    }
  ]
}
```

Notifications are also delivered via:
- Webhook (if configured on the project)
- CLI: `osp notifications`
- MCP: `osp_notifications` tool

---

## Appendix A: Complete JSON Schemas

### A.1 ServiceManifest Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://osp.dev/schemas/v1/service-manifest.json",
  "title": "OSP ServiceManifest",
  "description": "Root discovery object for OSP providers.",
  "type": "object",
  "required": [
    "osp_version",
    "manifest_id",
    "manifest_version",
    "published_at",
    "provider",
    "offerings",
    "accepted_payment_methods",
    "endpoints",
    "provider_signature",
    "provider_public_key"
  ],
  "properties": {
    "osp_version": {
      "type": "string",
      "const": "1.0",
      "description": "OSP protocol version."
    },
    "manifest_id": {
      "type": "string",
      "format": "uuid",
      "description": "Globally unique manifest identifier."
    },
    "manifest_version": {
      "type": "integer",
      "minimum": 1,
      "description": "Monotonically increasing version number."
    },
    "published_at": {
      "type": "string",
      "format": "date-time",
      "description": "Publication timestamp."
    },
    "provider": {
      "$ref": "#/$defs/Provider"
    },
    "offerings": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/ServiceOffering"
      },
      "description": "Available service offerings."
    },
    "accepted_payment_methods": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      },
      "description": "Payment methods accepted across all offerings."
    },
    "trust_tier_required": {
      "type": "string",
      "enum": ["none", "basic", "verified", "enterprise"],
      "default": "none",
      "description": "Minimum trust tier for any interaction."
    },
    "endpoints": {
      "$ref": "#/$defs/Endpoints"
    },
    "extensions": {
      "type": "object",
      "description": "Provider-specific metadata."
    },
    "provider_signature": {
      "type": "string",
      "description": "Ed25519 signature over canonical JSON (excluding this field). Base64url-encoded."
    },
    "provider_public_key": {
      "type": "string",
      "description": "Ed25519 public key. Base64url-encoded, 32 bytes."
    }
  },
  "additionalProperties": false,
  "$defs": {
    "Provider": {
      "type": "object",
      "required": ["provider_id", "display_name", "homepage_url"],
      "properties": {
        "provider_id": {
          "type": "string",
          "minLength": 1,
          "description": "Globally unique provider identifier."
        },
        "display_name": {
          "type": "string",
          "maxLength": 128,
          "description": "Human-readable provider name."
        },
        "description": {
          "type": "string",
          "maxLength": 512,
          "description": "Brief provider description."
        },
        "homepage_url": {
          "type": "string",
          "format": "uri",
          "description": "Provider homepage. Must be HTTPS."
        },
        "support_url": {
          "type": "string",
          "format": "uri",
          "description": "Support or documentation URL."
        },
        "logo_url": {
          "type": "string",
          "format": "uri",
          "description": "Square logo image URL (PNG or SVG, min 128x128)."
        }
      },
      "additionalProperties": false
    },
    "Endpoints": {
      "type": "object",
      "required": ["base_url"],
      "properties": {
        "base_url": {
          "type": "string",
          "format": "uri",
          "description": "Base URL for OSP API endpoints. Must be HTTPS."
        },
        "webhook_url": {
          "type": "string",
          "format": "uri",
          "description": "Webhook registration URL."
        },
        "status_page_url": {
          "type": "string",
          "format": "uri",
          "description": "Public status page URL."
        }
      },
      "additionalProperties": false
    },
    "ServiceOffering": {
      "type": "object",
      "required": ["offering_id", "name", "description", "category", "tiers", "credentials_schema"],
      "properties": {
        "offering_id": {
          "type": "string",
          "pattern": "^[a-z0-9-]+/[a-z0-9-]+$",
          "maxLength": 128,
          "description": "Globally unique offering identifier. Format: {provider-slug}/{service-slug}."
        },
        "name": {
          "type": "string",
          "maxLength": 128,
          "description": "Human-readable offering name."
        },
        "description": {
          "type": "string",
          "maxLength": 1024,
          "description": "Service description."
        },
        "category": {
          "type": "string",
          "enum": [
            "database", "hosting", "auth", "storage", "analytics",
            "messaging", "search", "compute", "cdn", "monitoring",
            "ml", "email", "dns", "other"
          ],
          "description": "Service category."
        },
        "tags": {
          "type": "array",
          "maxItems": 20,
          "items": {
            "type": "string",
            "maxLength": 32
          },
          "description": "Freeform tags for discovery."
        },
        "tiers": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/ServiceTier"
          },
          "description": "Available pricing tiers."
        },
        "regions": {
          "type": "array",
          "items": {
            "oneOf": [
              {"type": "string"},
              {
                "type": "object",
                "required": ["id"],
                "properties": {
                  "id": {"type": "string"},
                  "jurisdiction": {"type": "string"},
                  "provider_region": {"type": "string"},
                  "gdpr_compliant": {"type": "boolean"},
                  "certifications": {"type": "array", "items": {"type": "string"}}
                }
              }
            ]
          },
          "description": "Available deployment regions. Each element is either a string or a RegionObject (see Section 5.7)."
        },
        "credentials_schema": {
          "type": "object",
          "description": "JSON Schema for delivered credentials."
        },
        "configuration_schema": {
          "type": "object",
          "description": "JSON Schema for optional configuration parameters."
        },
        "estimated_provision_seconds": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "description": "Estimated provisioning time in seconds."
        },
        "fulfillment_proof_type": {
          "type": "string",
          "enum": ["none", "credential_test", "health_check_url", "signed_receipt"],
          "default": "none",
          "description": "Type of fulfillment proof."
        },
        "documentation_url": {
          "type": "string",
          "format": "uri",
          "description": "Offering-specific documentation URL."
        },
        "trust_tier_required": {
          "type": "string",
          "enum": ["none", "basic", "verified", "enterprise"],
          "description": "Override of manifest-level trust tier."
        },
        "deprecated": {
          "type": "boolean",
          "default": false,
          "description": "Whether this offering is deprecated."
        },
        "deprecated_at": {
          "type": "string",
          "format": "date-time",
          "description": "Timestamp when the offering was marked deprecated."
        },
        "sunset_at": {
          "type": "string",
          "format": "date-time",
          "description": "Timestamp after which the offering will no longer be available for new provisioning."
        },
        "successor_id": {
          "type": "string",
          "description": "Offering ID of the recommended replacement offering."
        },
        "migration_guide_url": {
          "type": "string",
          "format": "uri",
          "description": "URL to a migration guide for transitioning from this offering to its successor."
        }
      },
      "additionalProperties": false
    },
    "ServiceTier": {
      "type": "object",
      "required": ["tier_id", "name", "price"],
      "properties": {
        "tier_id": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "maxLength": 64,
          "description": "Unique tier identifier within the offering."
        },
        "name": {
          "type": "string",
          "maxLength": 64,
          "description": "Human-readable tier name."
        },
        "description": {
          "type": "string",
          "maxLength": 512,
          "description": "Tier description."
        },
        "price": {
          "$ref": "#/$defs/Price"
        },
        "limits": {
          "type": "object",
          "description": "Resource limits. Provider-defined key-value pairs."
        },
        "features": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Features included in this tier."
        },
        "escrow_profile": {
          "$ref": "#/$defs/EscrowProfile"
        },
        "rate_limit": {
          "$ref": "#/$defs/RateLimit"
        },
        "accepted_payment_methods": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Payment methods for this tier. Overrides manifest level."
        },
        "trust_tier_required": {
          "type": "string",
          "enum": ["none", "basic", "verified", "enterprise"],
          "description": "Override of offering-level trust tier."
        },
        "auto_deprovision": {
          "type": "boolean",
          "default": false,
          "description": "Auto-deprovision on billing period end."
        },
        "sla": {
          "type": "object",
          "description": "Service-level agreement parameters for this tier.",
          "properties": {
            "uptime_percent": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "Guaranteed uptime percentage (e.g., 99.95)."
            },
            "response_time_p50_ms": {
              "type": "integer",
              "minimum": 0,
              "description": "Median (p50) response time target in milliseconds."
            },
            "response_time_p99_ms": {
              "type": "integer",
              "minimum": 0,
              "description": "99th percentile (p99) response time target in milliseconds."
            },
            "support_response_hours": {
              "type": "number",
              "minimum": 0,
              "description": "Maximum support response time in hours."
            },
            "sla_url": {
              "type": "string",
              "format": "uri",
              "description": "URL to the full SLA document."
            }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "Price": {
      "type": "object",
      "required": ["amount", "currency", "interval"],
      "properties": {
        "amount": {
          "type": "string",
          "pattern": "^\\d+\\.\\d{2,}$",
          "description": "Price as decimal string."
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 4,
          "description": "ISO 4217 currency code or USDC."
        },
        "interval": {
          "type": "string",
          "enum": ["one_time", "hourly", "daily", "monthly", "yearly"],
          "description": "Billing interval."
        },
        "metered": {
          "type": "boolean",
          "default": false,
          "description": "Whether usage-based pricing applies."
        },
        "metered_dimensions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/MeteredDimension"
          },
          "description": "Usage dimensions for metered pricing."
        }
      },
      "additionalProperties": false
    },
    "MeteredDimension": {
      "type": "object",
      "required": ["dimension_id", "name", "unit", "price_per_unit"],
      "properties": {
        "dimension_id": {
          "type": "string",
          "description": "Unique dimension identifier."
        },
        "name": {
          "type": "string",
          "description": "Human-readable name."
        },
        "unit": {
          "type": "string",
          "description": "Unit of measurement."
        },
        "price_per_unit": {
          "type": "string",
          "description": "Price per unit as decimal string."
        },
        "included_quantity": {
          "type": "string",
          "default": "0",
          "description": "Quantity included in base price."
        }
      },
      "additionalProperties": false
    },
    "EscrowProfile": {
      "type": "object",
      "required": ["required"],
      "properties": {
        "required": {
          "type": "boolean",
          "description": "Whether escrow is required."
        },
        "provider": {
          "type": "string",
          "description": "Escrow provider identifier."
        },
        "release_condition": {
          "type": "string",
          "enum": ["provision_success", "uptime_24h", "uptime_7d", "manual"],
          "description": "Condition for releasing escrowed funds."
        },
        "dispute_window_hours": {
          "type": "integer",
          "default": 72,
          "description": "Hours after provisioning for disputes."
        }
      },
      "additionalProperties": false
    },
    "RateLimit": {
      "type": "object",
      "properties": {
        "requests_per_second": {
          "type": "integer",
          "description": "Max requests per second."
        },
        "requests_per_minute": {
          "type": "integer",
          "description": "Max requests per minute."
        },
        "burst": {
          "type": "integer",
          "description": "Max burst above sustained rate."
        }
      },
      "additionalProperties": false
    }
  }
}
```

### A.2 ProvisionRequest Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://osp.dev/schemas/v1/provision-request.json",
  "title": "OSP ProvisionRequest",
  "description": "Request to provision a new resource or change an existing resource's tier.",
  "type": "object",
  "required": ["offering_id", "tier_id", "payment_method", "nonce"],
  "properties": {
    "offering_id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+/[a-z0-9-]+$",
      "maxLength": 128,
      "description": "Offering to provision. Format: {provider-slug}/{service-slug}."
    },
    "tier_id": {
      "type": "string",
      "description": "Tier to provision."
    },
    "project_name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "maxLength": 64,
      "description": "Human-readable resource name."
    },
    "region": {
      "type": "string",
      "description": "Desired deployment region."
    },
    "configuration": {
      "type": "object",
      "description": "Configuration matching offering's configuration_schema."
    },
    "payment_method": {
      "type": "string",
      "description": "Payment method identifier."
    },
    "payment_proof": {
      "type": "object",
      "description": "Payment proof. Structure depends on payment_method."
    },
    "agent_public_key": {
      "type": "string",
      "description": "Agent Ed25519 public key for credential encryption. Base64url-encoded."
    },
    "nonce": {
      "type": "string",
      "minLength": 32,
      "description": "Unique request identifier for replay protection."
    },
    "idempotency_key": {
      "type": "string",
      "description": "Idempotency key for safe retries."
    },
    "webhook_url": {
      "type": "string",
      "format": "uri",
      "description": "Webhook URL for async status updates."
    },
    "tier_change": {
      "type": "object",
      "required": ["resource_id", "previous_tier_id"],
      "properties": {
        "resource_id": {
          "type": "string",
          "description": "Existing resource to change."
        },
        "previous_tier_id": {
          "type": "string",
          "description": "Current tier of the resource."
        },
        "proration": {
          "type": "string",
          "enum": ["immediate", "next_period", "none"],
          "description": "Proration behavior."
        }
      },
      "additionalProperties": false,
      "description": "Tier change details for existing resources."
    },
    "principal_id": {
      "type": "string",
      "description": "Identifier for the authorizing principal."
    },
    "agent_attestation": {
      "type": "string",
      "description": "TAP or equivalent attestation token."
    },
    "metadata": {
      "type": "object",
      "maxProperties": 20,
      "additionalProperties": {
        "type": "string",
        "maxLength": 256
      },
      "description": "Arbitrary key-value metadata."
    }
  },
  "additionalProperties": false
}
```

### A.3 ProvisionResponse Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://osp.dev/schemas/v1/provision-response.json",
  "title": "OSP ProvisionResponse",
  "description": "Response after processing a provision request.",
  "type": "object",
  "required": ["resource_id", "offering_id", "tier_id", "status", "created_at"],
  "properties": {
    "resource_id": {
      "type": "string",
      "description": "Unique resource identifier."
    },
    "offering_id": {
      "type": "string",
      "description": "Provisioned offering."
    },
    "tier_id": {
      "type": "string",
      "description": "Provisioned tier."
    },
    "status": {
      "type": "string",
      "enum": ["provisioned", "provisioning", "failed"],
      "description": "Provisioning status."
    },
    "credentials_bundle": {
      "$ref": "#/$defs/CredentialBundle",
      "description": "Resource credentials. Required when status is provisioned."
    },
    "estimated_ready_seconds": {
      "type": "integer",
      "description": "Estimated seconds until ready. Required when status is provisioning."
    },
    "poll_url": {
      "type": "string",
      "format": "uri",
      "description": "Status polling URL. Required when status is provisioning."
    },
    "webhook_supported": {
      "type": "boolean",
      "default": false,
      "description": "Whether the provider will send webhook notifications."
    },
    "region": {
      "type": "string",
      "description": "Actual deployment region."
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Resource creation timestamp."
    },
    "expires_at": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "Auto-deprovision timestamp."
    },
    "dashboard_url": {
      "type": "string",
      "format": "uri",
      "description": "Web dashboard URL."
    },
    "error": {
      "$ref": "#/$defs/Error",
      "description": "Error details when status is failed."
    }
  },
  "additionalProperties": false,
  "$defs": {
    "CredentialBundle": {
      "type": "object",
      "required": ["format", "rotation_supported", "issued_at"],
      "properties": {
        "format": {
          "type": "string",
          "enum": ["plaintext", "encrypted"],
          "description": "Credential format."
        },
        "credentials": {
          "type": "object",
          "description": "Plaintext credentials. Required when format is plaintext."
        },
        "encrypted_credentials": {
          "type": "object",
          "required": ["algorithm", "agent_public_key", "provider_ephemeral_public_key", "nonce", "ciphertext"],
          "properties": {
            "algorithm": {
              "type": "string",
              "const": "x25519-xsalsa20-poly1305",
              "description": "Encryption algorithm."
            },
            "agent_public_key": {
              "type": "string",
              "description": "Agent's Ed25519 public key used. Base64url-encoded."
            },
            "provider_ephemeral_public_key": {
              "type": "string",
              "description": "Provider's ephemeral X25519 public key. Base64url-encoded."
            },
            "nonce": {
              "type": "string",
              "description": "Encryption nonce. Base64url-encoded, 24 bytes."
            },
            "ciphertext": {
              "type": "string",
              "description": "Encrypted JSON credentials. Base64url-encoded."
            }
          },
          "additionalProperties": false,
          "description": "Encrypted credentials. Required when format is encrypted."
        },
        "delivery_proof": {
          "type": "object",
          "required": ["type"],
          "properties": {
            "type": {
              "type": "string",
              "enum": ["none", "credential_test", "health_check_url", "signed_receipt"],
              "description": "Proof type."
            },
            "test_query": {
              "type": "string",
              "description": "Verification query for credential_test."
            },
            "health_check_url": {
              "type": "string",
              "format": "uri",
              "description": "Health check URL."
            },
            "signed_receipt": {
              "type": "string",
              "description": "Ed25519 signature receipt. Base64url-encoded."
            },
            "verified_at": {
              "type": "string",
              "format": "date-time",
              "description": "Verification timestamp."
            }
          },
          "additionalProperties": false,
          "description": "Fulfillment proof."
        },
        "rotation_supported": {
          "type": "boolean",
          "description": "Whether credential rotation is supported."
        },
        "rotation_interval_hours": {
          "type": "integer",
          "description": "Recommended rotation interval in hours."
        },
        "issued_at": {
          "type": "string",
          "format": "date-time",
          "description": "Credential issuance timestamp."
        },
        "expires_at": {
          "type": "string",
          "format": "date-time",
          "description": "Credential expiration timestamp."
        }
      },
      "additionalProperties": false
    },
    "Error": {
      "type": "object",
      "required": ["code", "message", "retryable"],
      "properties": {
        "code": {
          "type": "string",
          "enum": [
            "invalid_offering",
            "invalid_tier",
            "invalid_region",
            "invalid_configuration",
            "payment_required",
            "payment_declined",
            "insufficient_funds",
            "trust_tier_insufficient",
            "quota_exceeded",
            "region_unavailable",
            "nonce_reused",
            "rate_limited",
            "provider_error",
            "capacity_exhausted"
          ],
          "description": "Machine-readable error code."
        },
        "message": {
          "type": "string",
          "description": "Human-readable error message."
        },
        "details": {
          "type": "object",
          "description": "Additional error context."
        },
        "retryable": {
          "type": "boolean",
          "description": "Whether the agent should retry."
        },
        "retry_after_seconds": {
          "type": "integer",
          "description": "Suggested wait before retry."
        }
      },
      "additionalProperties": false
    }
  }
}
```

### A.4 UsageReport Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://osp.dev/schemas/v1/usage-report.json",
  "title": "OSP UsageReport",
  "description": "Provider-submitted billing data for a resource.",
  "type": "object",
  "required": [
    "report_id",
    "resource_id",
    "period_start",
    "period_end",
    "line_items",
    "base_amount",
    "metered_amount",
    "total_amount",
    "currency",
    "provider_signature",
    "generated_at"
  ],
  "properties": {
    "report_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique report identifier."
    },
    "resource_id": {
      "type": "string",
      "description": "Resource this report covers."
    },
    "period_start": {
      "type": "string",
      "format": "date-time",
      "description": "Billing period start."
    },
    "period_end": {
      "type": "string",
      "format": "date-time",
      "description": "Billing period end."
    },
    "line_items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/LineItem"
      },
      "description": "Itemized usage charges."
    },
    "base_amount": {
      "type": "string",
      "description": "Base tier price for the period."
    },
    "metered_amount": {
      "type": "string",
      "description": "Total metered charges."
    },
    "total_amount": {
      "type": "string",
      "description": "Total amount due."
    },
    "currency": {
      "type": "string",
      "description": "ISO 4217 currency code."
    },
    "provider_signature": {
      "type": "string",
      "description": "Ed25519 signature. Base64url-encoded."
    },
    "generated_at": {
      "type": "string",
      "format": "date-time",
      "description": "Report generation timestamp."
    }
  },
  "additionalProperties": false,
  "$defs": {
    "LineItem": {
      "type": "object",
      "required": [
        "dimension_id",
        "description",
        "quantity",
        "unit",
        "included_quantity",
        "billable_quantity",
        "unit_price",
        "amount"
      ],
      "properties": {
        "dimension_id": {
          "type": "string",
          "description": "Metered dimension identifier."
        },
        "description": {
          "type": "string",
          "description": "Human-readable charge description."
        },
        "quantity": {
          "type": "string",
          "description": "Total usage quantity."
        },
        "unit": {
          "type": "string",
          "description": "Unit of measurement."
        },
        "included_quantity": {
          "type": "string",
          "description": "Quantity included in base price."
        },
        "billable_quantity": {
          "type": "string",
          "description": "Quantity above included amount."
        },
        "unit_price": {
          "type": "string",
          "description": "Price per unit."
        },
        "amount": {
          "type": "string",
          "description": "Total charge for this line item."
        }
      },
      "additionalProperties": false
    }
  }
}
```

---

## Appendix B: Example Flows

### B.1 Complete Free-Tier Provisioning Flow

This example shows an agent discovering Supabase, selecting the free PostgreSQL tier, provisioning a database, verifying it works, and later deprovisioning it.

**Step 1: Discovery**

```http
GET /.well-known/osp.json HTTP/1.1
Host: supabase.com
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "osp_version": "1.0",
  "manifest_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "manifest_version": 3,
  "published_at": "2026-03-27T10:00:00Z",
  "provider": {
    "provider_id": "com.supabase",
    "display_name": "Supabase",
    "description": "The open-source Firebase alternative.",
    "homepage_url": "https://supabase.com",
    "support_url": "https://supabase.com/docs"
  },
  "offerings": [
    {
      "offering_id": "supabase/managed-postgres",
      "name": "Managed PostgreSQL",
      "description": "Fully managed PostgreSQL database with automatic backups.",
      "category": "database",
      "tags": ["postgres", "sql", "relational"],
      "tiers": [
        {
          "tier_id": "free",
          "name": "Free",
          "description": "For hobby projects. No credit card required.",
          "price": {
            "amount": "0.00",
            "currency": "USD",
            "interval": "monthly"
          },
          "limits": {
            "max_storage_gb": 0.5,
            "max_rows": 50000,
            "max_connections": 10
          },
          "features": ["automatic_backups_daily"],
          "accepted_payment_methods": ["free"]
        },
        {
          "tier_id": "pro",
          "name": "Pro",
          "description": "For production workloads.",
          "price": {
            "amount": "25.00",
            "currency": "USD",
            "interval": "monthly",
            "metered": true,
            "metered_dimensions": [
              {
                "dimension_id": "storage_gb",
                "name": "Database Storage",
                "unit": "GB",
                "price_per_unit": "0.125",
                "included_quantity": "8"
              }
            ]
          },
          "limits": {
            "max_storage_gb": 100,
            "max_connections": 100
          },
          "features": ["automatic_backups_daily", "point_in_time_recovery", "read_replicas"],
          "accepted_payment_methods": ["stripe_spt", "sardis_wallet"]
        }
      ],
      "regions": ["us-east-1", "eu-west-1"],
      "credentials_schema": {
        "type": "object",
        "properties": {
          "connection_uri": { "type": "string" },
          "host": { "type": "string" },
          "port": { "type": "integer" },
          "database": { "type": "string" },
          "username": { "type": "string" },
          "password": { "type": "string" },
          "ssl_mode": { "type": "string" }
        },
        "required": ["connection_uri", "host", "port", "database", "username", "password"]
      },
      "estimated_provision_seconds": 15,
      "fulfillment_proof_type": "credential_test"
    }
  ],
  "accepted_payment_methods": ["free", "stripe_spt", "sardis_wallet"],
  "endpoints": {
    "base_url": "https://api.supabase.com"
  },
  "provider_public_key": "VGhpcyBpcyBhIGJhc2U2NHVybCBlbmNvZGVkIEVkMjU1MTkgcHVibGljIGtleQ",
  "provider_signature": "c2lnbmF0dXJlX292ZXJfY2Fub25pY2FsX2pzb25fc2VyaWFsaXphdGlvbg"
}
```

**Step 2: Signature Verification**

The agent:
1. Removes `provider_signature` from the JSON.
2. Serializes to canonical JSON (sorted keys, no whitespace).
3. Verifies the Ed25519 signature using `provider_public_key`.
4. Verification succeeds -- the manifest is trusted.

**Step 3: Provisioning**

```http
POST /osp/v1/provision HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "project_name": "weekend-hack",
  "region": "us-east-1",
  "payment_method": "free",
  "nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-OSP-Version: 1.0
X-Request-Id: req_001

{
  "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "free",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_wknd:p4ss_w0rd@db-us-east-1.supabase.co:5432/postgres",
      "host": "db-us-east-1.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_wknd",
      "password": "p4ss_w0rd",
      "ssl_mode": "require"
    },
    "delivery_proof": {
      "type": "credential_test",
      "test_query": "SELECT 1",
      "verified_at": "2026-03-27T14:00:05Z"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 720,
    "issued_at": "2026-03-27T14:00:00Z"
  },
  "region": "us-east-1",
  "created_at": "2026-03-27T14:00:00Z",
  "dashboard_url": "https://app.supabase.com/project/weekend-hack"
}
```

**Step 4: Verification**

The agent connects to the database using the `connection_uri` and runs `SELECT 1` to confirm the credentials work.

**Step 5: Deprovisioning (later)**

```http
DELETE /osp/v1/deprovision/res_aaa11111-bb22-cc33-dd44-ee5555555555 HTTP/1.1
Host: api.supabase.com
X-OSP-Version: 1.0
Content-Type: application/json

{
  "reason": "Hack weekend is over",
  "nonce": "a1b2c3d4-e5f6-7890-abcd-000000000001"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
  "status": "deprovisioned",
  "deprovisioned_at": "2026-03-30T09:00:00Z",
  "data_retained_until": "2026-04-06T09:00:00Z",
  "final_usage_report": {
    "report_id": "rpt_final_wknd",
    "total_amount": "0.00",
    "currency": "USD"
  }
}
```

### B.2 Paid Async Provisioning with Encrypted Credentials

This example shows provisioning a paid tier with asynchronous provisioning and encrypted credential delivery.

**Step 1: Provisioning**

```http
POST /osp/v1/provision HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "project_name": "prod-db",
  "region": "eu-west-1",
  "configuration": {
    "postgres_version": "17",
    "enable_pooling": true
  },
  "payment_method": "stripe_spt",
  "payment_proof": {
    "spt_token": "spt_live_abc123def456",
    "amount": "25.00",
    "currency": "USD"
  },
  "agent_public_key": "MCowBQYDK2VwAyEAGb1gauf0fPGfFJMPPEZ0YD3pYo1Bv2zMRPJjIE6pKwo",
  "nonce": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "webhook_url": "https://my-agent.example.com/hooks/osp",
  "principal_id": "org_prod_inc",
  "metadata": {
    "environment": "production",
    "team": "platform"
  }
}
```

**Step 2: Async Response**

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_bbb22222-cc33-dd44-ee55-ff6666666666",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "status": "provisioning",
  "estimated_ready_seconds": 60,
  "poll_url": "https://api.supabase.com/osp/v1/status/res_bbb22222-cc33-dd44-ee55-ff6666666666",
  "webhook_supported": true,
  "region": "eu-west-1",
  "created_at": "2026-03-27T15:00:00Z"
}
```

**Step 3: Webhook Delivery**

60 seconds later, the provider sends a webhook:

```http
POST /hooks/osp HTTP/1.1
Host: my-agent.example.com
Content-Type: application/json
X-OSP-Signature: t=1711548060,v1=a3f2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3
X-OSP-Timestamp: 1711548060

{
  "event": "resource.provisioned",
  "resource_id": "res_bbb22222-cc33-dd44-ee55-ff6666666666",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "encrypted",
    "encrypted_credentials": {
      "algorithm": "x25519-xsalsa20-poly1305",
      "agent_public_key": "MCowBQYDK2VwAyEAGb1gauf0fPGfFJMPPEZ0YD3pYo1Bv2zMRPJjIE6pKwo",
      "provider_ephemeral_public_key": "ZXBoZW1lcmFsX2tleV9mb3JfdGhpc19zZXNzaW9u",
      "nonce": "dW5pcXVlXzI0X2J5dGVfbm9uY2VfaGVyZQ",
      "ciphertext": "ZW5jcnlwdGVkX2Nvbm5lY3Rpb25fdXJpX2FuZF9jcmVkZW50aWFsc19oZXJl"
    },
    "delivery_proof": {
      "type": "credential_test",
      "test_query": "SELECT 1",
      "verified_at": "2026-03-27T15:01:00Z"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 168,
    "issued_at": "2026-03-27T15:01:00Z"
  },
  "timestamp": "2026-03-27T15:01:00Z",
  "provider_signature": "d2ViaG9va19zaWduYXR1cmVfZWQyNTUxOQ"
}
```

**Step 4: Agent Decrypts**

The agent:
1. Verifies the webhook signature using `X-OSP-Signature`.
2. Converts its Ed25519 private key to X25519.
3. Computes X25519 DH with `provider_ephemeral_public_key`.
4. Decrypts `ciphertext` using XSalsa20-Poly1305 with the shared secret and `nonce`.
5. Parses the plaintext JSON to get the database credentials.

### B.3 Tier Upgrade Flow

Upgrading the free-tier database from B.1 to the Pro tier. The `payment_method` and `payment_proof` vary by payment rail; three examples are shown below.

**Example with Sardis:**

```http
POST /osp/v1/provision HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "payment_method": "sardis_wallet",
  "payment_proof": {
    "wallet_address": "sardis:0xabc...123",
    "payment_tx": "tx_0xdef...456",
    "escrow_id": "esc_789"
  },
  "nonce": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "tier_change": {
    "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
    "previous_tier_id": "free",
    "proration": "immediate"
  }
}
```

**Equivalent example with Stripe SPT:**

```json
{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "payment_method": "stripe_spt",
  "payment_proof": {
    "spt_token": "spt_1234567890abcdef",
    "amount": "25.00",
    "currency": "USD"
  },
  "nonce": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "tier_change": {
    "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
    "previous_tier_id": "free",
    "proration": "immediate"
  }
}
```

**Equivalent example with x402:**

```json
{
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "payment_method": "x402",
  "payment_proof": {
    "payment_header": "x402-receipt-abc123...",
    "receipt": "receipt_def456..."
  },
  "nonce": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "tier_change": {
    "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
    "previous_tier_id": "free",
    "proration": "immediate"
  }
}
```

**Response (same regardless of payment method):**

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
  "offering_id": "supabase/managed-postgres",
  "tier_id": "pro",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_wknd:p4ss_w0rd@db-us-east-1.supabase.co:5432/postgres",
      "host": "db-us-east-1.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_wknd",
      "password": "p4ss_w0rd",
      "ssl_mode": "require"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 168,
    "issued_at": "2026-03-28T10:00:00Z"
  },
  "region": "us-east-1",
  "created_at": "2026-03-27T14:00:00Z",
  "dashboard_url": "https://app.supabase.com/project/weekend-hack"
}
```

### B.4 Credential Rotation Flow

```http
POST /osp/v1/rotate/res_aaa11111-bb22-cc33-dd44-ee5555555555 HTTP/1.1
Host: api.supabase.com
Content-Type: application/json
X-OSP-Version: 1.0

{
  "nonce": "d4e5f6a7-b8c9-0123-def0-456789012345",
  "invalidate_previous_after_seconds": 300
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-OSP-Version: 1.0

{
  "resource_id": "res_aaa11111-bb22-cc33-dd44-ee5555555555",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "connection_uri": "postgresql://user_wknd:n3w_s3cur3_p4ss@db-us-east-1.supabase.co:5432/postgres",
      "host": "db-us-east-1.supabase.co",
      "port": 5432,
      "database": "postgres",
      "username": "user_wknd",
      "password": "n3w_s3cur3_p4ss",
      "ssl_mode": "require"
    },
    "rotation_supported": true,
    "rotation_interval_hours": 168,
    "issued_at": "2026-04-15T12:00:00Z"
  },
  "old_credentials_valid_until": "2026-04-15T12:05:00Z"
}
```

---

## Appendix C: Comparison with Stripe Projects

*This appendix has been moved to a standalone document to keep the protocol specification focused on normative content.*

*See: [docs/stripe-comparison.md](../docs/stripe-comparison.md) for the full Stripe Projects comparison.*

---

## Appendix D: Canonical JSON Serialization

For signature computation, OSP uses **canonical JSON serialization** as defined here:

1. All object keys are sorted lexicographically (Unicode code point order) at every nesting level.
2. No whitespace between tokens (no spaces after `:` or `,`, no newlines).
3. No trailing commas.
4. Strings use minimal escaping (only `"`, `\`, and control characters are escaped).
5. Numbers use no unnecessary leading zeros or trailing zeros (except as needed for the decimal representation).
6. `null`, `true`, and `false` are represented as their literal forms.
7. The serialization is UTF-8 encoded.

**Example:**

Input (with arbitrary formatting):
```json
{
  "zebra": 1,
  "alpha": {
    "beta": true,
    "alpha": null
  }
}
```

Canonical output:
```
{"alpha":{"alpha":null,"beta":true},"zebra":1}
```

This canonical form is used as the signing payload for:
- ServiceManifest signatures (`provider_signature`)
- UsageReport signatures (`provider_signature`)

---

## Appendix E: Test Vectors

Known-good test vectors for implementors to verify their Ed25519 signing and credential encryption.

### E.1 Ed25519 Manifest Signing

**Test key pair (DO NOT use in production — RFC 8032 Test Vector 1):**

```
Private key (seed, 32 bytes, hex): 9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60
Public key (32 bytes, hex):        d75a980182b10ab7d54bfed3c964073a0ee172f3daa3f4a18446b0b8d183f8e3
Public key (base64url):            11qYAYKxCrfVS_7TyWQHOg7hcvPao_ShiEawuNGD-OM
```

**Test manifest (canonical JSON, provider_signature removed):**

```
{"endpoints":{"base_url":"https://test.example.com"},"manifest_id":"test-001","manifest_version":1,"offerings":[{"category":"database","credentials_schema":{},"description":"Test","name":"Test DB","offering_id":"test/db","tiers":[{"name":"Free","price":{"amount":"0.00","currency":"USD","interval":"monthly"},"tier_id":"free"}]}],"osp_version":"1.0","provider":{"display_name":"Test Provider","homepage_url":"https://test.example.com","provider_id":"test.example.com"},"provider_public_key":"11qYAYKxCrfVS_7TyWQHOg7hcvPao_ShiEawuNGD-OM","published_at":"2026-01-01T00:00:00Z"}
```

Implementors: compute `Ed25519_Sign(private_key, canonical_json_bytes)` and verify your output matches your own re-verification with `Ed25519_Verify(public_key, canonical_json_bytes, signature)`.

### E.2 Nonce Validation

| Input | Valid | Reason |
|-------|-------|--------|
| `f47ac10b-58cc-4372-a567-0e02b2c3d479` | Yes | UUID v4 |
| `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6` | Yes | 32-char hex string |
| `KjHgFdSaPoIuYtReWqMnBvCxZlKjHgFd` | Yes | 32-char alphanumeric |
| `12345` | **No** | Too short (<32 characters) |
| `00000000-0000-0000-0000-000000000000` | **No** | Nil UUID — not random |
| `` (empty) | **No** | Empty string |

### E.3 Canonical JSON Serialization

**Input:**
```json
{
  "zebra": 1,
  "apple": {"banana": true, "aardvark": [3, 1, 2]},
  "mango": null,
  "price": {"amount": "25.00", "currency": "USD"}
}
```

**Expected canonical output:**
```
{"apple":{"aardvark":[3,1,2],"banana":true},"mango":null,"price":{"amount":"25.00","currency":"USD"},"zebra":1}
```

Key rules verified:
- Object keys sorted at all levels (`aardvark` before `banana`, `apple` before `mango`)
- Array element order PRESERVED (not sorted): `[3,1,2]` stays `[3,1,2]`
- No whitespace between tokens
- Null represented as `null` literal

### E.4 Credential Encryption Parameters

For `x25519-xsalsa20-poly1305` credential encryption:

| Parameter | Value |
|-----------|-------|
| Key agreement | X25519 (Curve25519 Diffie-Hellman) |
| AEAD cipher | XSalsa20-Poly1305 |
| Nonce size | 24 bytes |
| Key derivation | Ed25519 → X25519 conversion per RFC 8032 Section 5.2.5 |
| Ciphertext overhead | 16 bytes (Poly1305 tag) |
| Encoding | Base64url (no padding) for all binary fields |

**Encryption steps (for implementors):**

1. Convert agent's Ed25519 public key to X25519 public key.
2. Generate ephemeral X25519 key pair.
3. Compute shared secret: `X25519(ephemeral_private, agent_x25519_public)`.
4. Generate random 24-byte nonce.
5. Encrypt: `XSalsa20-Poly1305(shared_secret, nonce, plaintext_json_bytes)`.
6. Return: `ephemeral_public_key`, `nonce`, `ciphertext` — all base64url encoded.

**Decryption steps:**

1. Convert agent's Ed25519 private key to X25519 private key.
2. Compute shared secret: `X25519(agent_x25519_private, ephemeral_public)`.
3. Decrypt: `XSalsa20-Poly1305_Open(shared_secret, nonce, ciphertext)`.
4. Parse decrypted bytes as JSON.

---

## Appendix F: Bulk Operations (Informative)

OSP v1.0 does not define bulk endpoints. This appendix provides guidance for performing operations at scale.

### F.1 Parallel Request Limits

Agents MAY send multiple requests in parallel. Recommended concurrency limits:

| Operation | Max Parallel Requests per Provider |
|-----------|------------------------------------|
| Provisioning | 5 |
| Deprovisioning | 10 |
| Credential retrieval | 20 |
| Status polling | 20 |
| Usage queries | 10 |

Agents MUST respect `429 Too Many Requests` responses and `Retry-After` headers even when parallelizing.

### F.2 Planned Batch Endpoints (OSP v1.1)

The following batch endpoints are planned for OSP v1.1:

**`POST /osp/v1/provision-batch`** — Provision multiple resources from the same provider.

```json
// Example with Sardis:
{
  "requests": [
    {"offering_id": "supabase/managed-postgres", "tier_id": "pro", "project_name": "db-1", "nonce": "..."},
    {"offering_id": "supabase/auth", "tier_id": "free", "project_name": "auth-1", "nonce": "..."}
  ],
  "atomic": true,
  "payment_method": "sardis_wallet",
  "payment_proof": {"wallet_address": "...", "payment_tx": "...", "escrow_id": "..."}
}

// Example with Stripe SPT:
{
  "requests": [
    {"offering_id": "supabase/managed-postgres", "tier_id": "pro", "project_name": "db-1", "nonce": "..."},
    {"offering_id": "supabase/auth", "tier_id": "free", "project_name": "auth-1", "nonce": "..."}
  ],
  "atomic": true,
  "payment_method": "stripe_spt",
  "payment_proof": {"spt_token": "spt_...", "amount": "25.00", "currency": "USD"}
}

// Example with x402:
{
  "requests": [
    {"offering_id": "supabase/managed-postgres", "tier_id": "pro", "project_name": "db-1", "nonce": "..."},
    {"offering_id": "supabase/auth", "tier_id": "free", "project_name": "auth-1", "nonce": "..."}
  ],
  "atomic": true,
  "payment_method": "x402",
  "payment_proof": {"payment_header": "...", "receipt": "..."}
}
```

When `atomic` is `true`, either ALL resources are provisioned or NONE are (the provider rolls back on any failure). When `false`, each resource is independent (partial success allowed).

**`DELETE /osp/v1/deprovision-batch`** — Deprovision multiple resources.

```json
{
  "resource_ids": ["res_abc", "res_def", "res_ghi"],
  "atomic": false
}
```

**`GET /osp/v1/status-batch?ids=res_abc,res_def,res_ghi`** — Check status of multiple resources.

These endpoints will be defined in a SIP (Service Improvement Proposal) before inclusion in v1.1.

---

## Appendix G: Provider Integration Priority

*This appendix has been moved to a standalone document as provider API capabilities change frequently.*

*See: [docs/provider-integration-guide.md](../docs/provider-integration-guide.md) for the current provider ranking and integration guide.*

---

*End of specification.*
