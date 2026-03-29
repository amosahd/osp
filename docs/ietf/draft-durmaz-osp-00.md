# Internet-Draft: Open Service Protocol (OSP)

```
Internet-Draft                                              E. Durmaz
Intended status: Standards Track                               Sardis
Expires: September 29, 2026                            March 29, 2026

        Open Service Protocol (OSP) for Machine-to-Machine
                     Service Provisioning
                      draft-durmaz-osp-00
```

## Abstract

This document specifies the Open Service Protocol (OSP), a standard
for automated discovery, provisioning, and lifecycle management of
developer services by AI agents and automated processes.  OSP defines
a RESTful interface using JSON [RFC8259] over HTTPS, with Ed25519
[RFC8032] manifest signing and x25519-XSalsa20-Poly1305 [RFC7748]
credential encryption.  The protocol is payment-rail agnostic,
supporting any billing system without privileging a specific payment
mechanism.  OSP supports both synchronous and asynchronous
provisioning flows, credential rotation with zero-downtime grace
periods, and webhook-based event notification.

## Status of This Memo

This Internet-Draft is submitted in full conformance with the
provisions of BCP 78 and BCP 79.

Internet-Drafts are working documents of the Internet Engineering
Task Force (IETF).  Note that other groups may also distribute
working documents as Internet-Drafts.  The list of current
Internet-Drafts is at https://datatracker.ietf.org/drafts/current/.

Internet-Drafts are draft documents valid for a maximum of six months
and may be updated, replaced, or obsoleted by other documents at any
time.  It is inappropriate to use Internet-Drafts as reference
material or to cite them other than as "work in progress."

This Internet-Draft will expire on September 29, 2026.

## Copyright Notice

Copyright (c) 2026 IETF Trust and the persons identified as the
document authors.  All rights reserved.

This document is subject to BCP 78 and the IETF Trust's Legal
Provisions Relating to IETF Documents
(https://trustee.ietf.org/license-info) in effect on the date of
publication of this document.  Please review these documents
carefully, as they describe your rights and restrictions with respect
to this document.

## Table of Contents

1. Introduction
2. Terminology
3. Protocol Overview
4. Discovery Mechanism
5. Service Manifest Format
6. Provisioning Flow
7. Credential Encryption
8. Lifecycle Management
9. Billing Integration
10. Security Considerations
11. IANA Considerations
12. References
Appendix A. Canonical JSON Serialization
Appendix B. Test Vectors
Appendix C. Conformance Requirements

## 1. Introduction

### 1.1. Problem Statement

AI agents and automated processes increasingly need to provision
infrastructure services -- databases, hosting, authentication,
analytics, storage, and more -- on behalf of developers and
organizations.  Current approaches suffer from three fundamental
problems:

1. Manual signup flows require browser interaction, CAPTCHA solving,
   and email verification, none of which automated agents handle
   reliably.

2. Proprietary platform-specific CLIs lock agents into a single
   vendor's ecosystem, payment rail, and approval process, creating
   vendor lock-in.

3. Ad-hoc API wrapping requires per-provider integration work, with
   no standard for discovery, credential delivery, or billing.

There is no open standard that allows an agent to discover what
services are available, select one, pay for it through any payment
method, receive credentials securely, and manage the lifecycle of
that resource.  OSP fills this gap.

### 1.2. Design Goals

The protocol is designed with the following goals:

- Openness: No gatekeeping, approval queues, or proprietary
  extensions required for basic operation.  Apache 2.0 licensed.

- Payment-rail agnosticism: The protocol does not define or
  privilege any payment mechanism.  OSP declares which payment
  methods are accepted and carries payment proofs, but the actual
  payment logic belongs to external systems.

- Provider self-registration: Any provider publishes a manifest at
  a well-known URL.  No central authority decides who can
  participate.

- Machine-first: Designed for agent-to-provider interaction without
  human intervention.  Every interaction is a structured API call.

- Security: All credentials encrypted in transit, all manifests
  signed with Ed25519, replay protection via nonces.

- Extensibility: Custom payment methods, provider-specific
  extensions, and custom credential fields supported via extension
  points.

### 1.3. Non-Goals

OSP intentionally does not define:

- A payment protocol.  OSP carries payment proofs but the actual
  payment logic belongs to external systems.

- Dispute resolution.  OSP provides a lightweight dispute initiation
  endpoint that produces a signed receipt, but actual resolution is
  handled by layers above OSP.

- Agent identity.  OSP references trust tiers but does not define
  how agents prove their identity.

- Service-specific APIs.  OSP provisions a database and delivers
  credentials; it does not define how to run SQL queries.

### 1.4. Notational Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all
capitals, as shown here.

All JSON examples use relaxed formatting for readability.  Conformant
implementations MUST produce valid JSON per [RFC8259].

All timestamps are RFC 3339 [RFC3339] strings in UTC.

All cryptographic keys and binary values use base64url encoding
without padding, per [RFC4648] Section 5.

### 1.5. Version Negotiation

Every OSP request and response includes the "X-OSP-Version" header
declaring the protocol version.

1. Agents MUST include "X-OSP-Version: 1.0" in every request.

2. Providers MUST include "X-OSP-Version" in every response,
   declaring the version used to process the request.

3. If the provider supports the agent's requested version, it MUST
   process the request using that version's semantics.

4. If the provider does not support the agent's version, it MUST
   return HTTP 406 Not Acceptable with a body listing supported
   versions:

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

5. Minor versions (1.0 to 1.1) are backward compatible.  A 1.1
   provider MUST accept 1.0 requests.

6. Major versions (1.x to 2.0) MAY be incompatible.  Providers
   SHOULD support the previous major version for at least 12 months
   after a new major version is released.

## 2. Terminology

Agent:
:  An automated process (AI agent, CI/CD pipeline, or script) that
   discovers and provisions services via OSP.

Provider:
:  A SaaS company or infrastructure operator that implements OSP
   endpoints and publishes a Service Manifest.

Principal:
:  The human user or organization that authorizes the agent to act.
   The principal is ultimately responsible for billing and resource
   ownership.

ServiceManifest:
:  A signed JSON document published by a provider at a well-known
   URI, describing its available services, pricing, and endpoints.

Offering:
:  A specific service within a manifest (e.g., "Managed
   PostgreSQL", "Edge Functions", "Auth Service").

Tier:
:  A pricing and capability level within an offering (e.g., "Free",
   "Pro", "Enterprise").

Resource:
:  A provisioned instance of a service.  Each resource has a unique
   "resource_id" and associated credentials.

CredentialBundle:
:  A JSON object containing (optionally encrypted) credentials for
   accessing a provisioned resource.

UsageReport:
:  A provider-submitted document detailing resource consumption for
   a billing period, signed by the provider.

Nonce:
:  A unique, non-repeating string included in requests to prevent
   replay attacks.  MUST be a UUID v4 or a cryptographically random
   string of at least 32 characters.

Payment Proof:
:  An opaque token or object that proves payment has been made or
   authorized through the declared payment method.

Trust Tier:
:  A level of agent identity verification, mapped to external
   systems.  Values: "none", "basic", "verified", "enterprise".

## 3. Protocol Overview

OSP operates over HTTPS using JSON request and response bodies.  The
protocol defines four phases:

### 3.1. Roles

Two roles participate in the protocol:

- Provider: Publishes a ServiceManifest, implements the OSP REST
  API, provisions resources, and delivers credentials.

- Agent: Discovers providers, verifies manifests, sends provision
  requests, receives credentials, and manages resource lifecycle.

### 3.2. Protocol Flow

The following diagram illustrates the complete protocol flow:

```
Agent                                Provider
  |                                      |
  |  (1) GET /.well-known/osp.json       |
  |------------------------------------->|
  |  (2) ServiceManifest (signed)        |
  |<-------------------------------------|
  |                                      |
  |  (3) Verify Ed25519 signature        |
  |  (4) Select offering + tier          |
  |                                      |
  |  (5) POST /osp/v1/provision          |
  |      { offering_id, tier_id,         |
  |        agent_public_key, nonce,      |
  |        payment_method,               |
  |        payment_proof }               |
  |------------------------------------->|
  |                                      |
  |  (6) Validate request, verify        |
  |      payment, create resource        |
  |                                      |
  |  (7) 201 Created                     |
  |      { resource_id, status,          |
  |        credentials_bundle }          |
  |<-------------------------------------|
  |                                      |
  |  ... Resource lifecycle ...          |
  |                                      |
  |  (8) GET /osp/v1/status/{id}         |
  |------------------------------------->|
  |  (9) { status, health, usage }       |
  |<-------------------------------------|
  |                                      |
  |  (10) POST /osp/v1/rotate/{id}       |
  |------------------------------------->|
  |  (11) { new credentials_bundle }     |
  |<-------------------------------------|
  |                                      |
  |  (12) DELETE /osp/v1/deprovision/{id}|
  |------------------------------------->|
  |  (13) { status: "deprovisioned" }    |
  |<-------------------------------------|
```

### 3.3. Phase Summary

1. Discovery: Agent fetches the provider's ServiceManifest from
   "/.well-known/osp.json" and verifies its Ed25519 signature.

2. Provisioning: Agent sends a ProvisionRequest to the provider's
   provision endpoint, receiving a ProvisionResponse with
   (optionally encrypted) credentials.

3. Lifecycle Management: Agent manages the resource via standard
   endpoints for status, credential rotation, usage monitoring,
   and deprovisioning.

4. Billing: Handled out-of-band via the provider's chosen payment
   method.  OSP does not define billing flows.

## 4. Discovery Mechanism

### 4.1. Well-Known URI

Providers MUST publish their ServiceManifest at:

```
https://{provider-domain}/.well-known/osp.json
```

This follows the Well-Known URIs registry [RFC8615].

Requirements:

1. The endpoint MUST respond with "Content-Type: application/json".

2. The endpoint MUST use HTTPS (TLS 1.2 or later; TLS 1.3
   RECOMMENDED).

3. The endpoint MUST respond within 10 seconds.

4. The endpoint SHOULD set "Cache-Control" headers with a "max-age"
   of at least 300 seconds (5 minutes) and no more than 86400
   seconds (24 hours).

5. The endpoint MUST support GET requests and SHOULD support HEAD
   requests.

6. The response MUST include an "ETag" header for efficient caching.

Example request:

```http
GET /.well-known/osp.json HTTP/1.1
Host: provider.example.com
Accept: application/json
```

Example response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600
ETag: "v3-abc123"

{...ServiceManifest...}
```

### 4.2. Manifest Verification

Agents MUST verify the "provider_signature" before trusting any
manifest.  Verification proceeds as follows:

1. Extract the signature and public key.  Read
   "provider_signature" and "provider_public_key" from the
   manifest.

2. Construct the signing payload.  Create a copy of the manifest
   JSON, remove the "provider_signature" field, and serialize to
   canonical JSON (see Appendix A).

3. Verify the Ed25519 signature.  Using the "provider_public_key",
   verify that "provider_signature" is a valid Ed25519 [RFC8032]
   signature over the canonical JSON bytes.

If verification fails, the agent MUST reject the manifest and
MUST NOT provision any services from it.

Public key binding: To establish that the "provider_public_key"
actually belongs to the provider (and not an attacker serving a
modified manifest), agents SHOULD use at least one of:

- TLS origin verification: The manifest was fetched over HTTPS
  from the provider's domain.  This binds the key to whoever
  controls the domain's TLS certificate.

- DNS TXT record: The provider publishes a DNS TXT record at
  "_osp.{domain}" containing the base64url-encoded public key.

- Registry attestation: A trusted registry has independently
  verified the key binding.

### 4.3. Manifest Versioning

Manifests are immutable once published for a given
"manifest_version".  Any change to the manifest MUST increment
"manifest_version".

Previous manifest versions SHOULD be accessible at:

```
https://{provider-domain}/.well-known/osp.v{N}.json
```

where {N} is the version number.

The canonical "/.well-known/osp.json" MUST always serve the latest
version.

Providers SHOULD maintain at least the 3 most recent versions to
allow agents to handle transitions gracefully.

### 4.4. Registry Discovery

In addition to direct discovery via well-known URIs, providers MAY
register with an OSP Registry.  A registry is a service that indexes
multiple providers' manifests to enable cross-provider search.

Registry interaction is not required for OSP conformance.  Agents
MAY discover providers through registries, direct URL, out-of-band
knowledge, or any other mechanism.

A conformant registry SHOULD implement the following search
endpoint:

```
GET /osp/registry/v1/search
```

Query parameters:

| Parameter      | Type    | Description                              |
|----------------|---------|------------------------------------------|
| category       | string  | Filter by offering category              |
| tags           | string  | Comma-separated tags to match            |
| payment_method | string  | Filter by accepted payment method        |
| trust_tier     | string  | Filter by maximum trust tier required    |
| q              | string  | Free-text search                         |
| limit          | integer | Max results (default: 20, max: 100)      |
| starting_after | string  | Cursor for pagination (provider_id)      |

Provider Self-Registration: Providers register by submitting their
manifest URL:

```http
POST /osp/registry/v1/register HTTP/1.1
Content-Type: application/json

{
  "manifest_url": "https://provider.example.com/.well-known/osp.json"
}
```

The registry MUST:
1. Fetch the manifest from the submitted URL.
2. Verify the "provider_signature".
3. Confirm domain ownership via TLS origin or DNS TXT record.
4. Index the manifest for search.

The registry MUST NOT:
1. Require approval or manual review for registration.
2. Charge providers for basic listing.
3. Modify or proxy the provider's manifest.

### 4.5. Offering Deprecation

Providers MAY deprecate offerings or tiers.  ServiceOffering and
ServiceTier objects support the following optional deprecation
fields:

| Field               | Type    | Description                          |
|---------------------|---------|--------------------------------------|
| deprecated          | boolean | Whether deprecated (default: false)  |
| deprecated_at       | string  | RFC 3339 timestamp of announcement   |
| sunset_at           | string  | RFC 3339 timestamp of discontinuation|
| successor_id        | string  | Replacement offering_id or tier_id   |
| migration_guide_url | string  | URL to migration documentation       |

Deprecation rules:

1. Providers MUST give at least 90 days notice between
   "deprecated_at" and "sunset_at".

2. Existing provisioned resources MUST continue to function until
   "sunset_at".

3. New provisioning requests for deprecated offerings SHOULD return
   a warning header: "X-OSP-Deprecated: sunset={sunset_at};
   successor={successor_id}".

4. After "sunset_at", provisioning requests MUST return 410 Gone.

## 5. Service Manifest Format

The ServiceManifest is a JSON object published by providers at the
well-known URI.  This section defines its structure.

### 5.1. Top-Level Fields

| Field                    | Type            | Req  | Description                        |
|--------------------------|-----------------|------|------------------------------------|
| osp_version              | string          | R    | Protocol version. "1.0"            |
| manifest_id              | string          | R    | UUID v4 identifier                 |
| manifest_version         | integer         | R    | Monotonically increasing version   |
| published_at             | string          | R    | RFC 3339 publication timestamp     |
| provider                 | object          | R    | Provider identity (see 5.2)        |
| offerings                | array           | R    | ServiceOffering objects (see 5.3)  |
| accepted_payment_methods | array\<string\> | R    | Accepted payment methods           |
| trust_tier_required      | string          | O    | Minimum trust tier (default: none) |
| endpoints                | object          | R    | API endpoint paths (see 5.4)       |
| extensions               | object          | O    | Provider-specific metadata         |
| provider_public_key      | string          | R    | Ed25519 public key (base64url)     |
| provider_signature       | string          | R    | Ed25519 signature (base64url)      |

(R = REQUIRED, O = OPTIONAL)

### 5.2. Provider Object

| Field        | Type   | Req | Description                           |
|--------------|--------|-----|---------------------------------------|
| provider_id  | string | R   | UUID v4 or reverse-domain identifier  |
| display_name | string | R   | Human-readable name (max 128 chars)   |
| description  | string | O   | Brief description (max 512 chars)     |
| homepage_url | string | R   | Provider homepage (MUST be HTTPS)     |
| support_url  | string | O   | Support or documentation URL          |
| logo_url     | string | O   | Square logo (PNG/SVG, min 128x128)    |

### 5.3. ServiceOffering Object

| Field                      | Type            | Req | Description                       |
|----------------------------|-----------------|-----|-----------------------------------|
| offering_id                | string          | R   | Format: {provider}/{service}      |
| name                       | string          | R   | Human-readable name (max 128)     |
| description                | string          | R   | Service description (max 1024)    |
| category                   | string          | R   | One of: database, hosting, auth,  |
|                            |                 |     | storage, analytics, messaging,    |
|                            |                 |     | search, compute, cdn, monitoring, |
|                            |                 |     | ml, email, dns, other             |
| tags                       | array\<string\> | O   | Freeform tags (max 20)            |
| tiers                      | array           | R   | ServiceTier objects (see 5.3.1)   |
| regions                    | array           | O   | Available deployment regions      |
| credentials_schema         | object          | R   | JSON Schema for credentials       |
| configuration_schema       | object          | O   | JSON Schema for config params     |
| estimated_provision_seconds| integer         | O   | Estimated time (0 = synchronous)  |
| documentation_url          | string          | O   | Offering-specific docs URL        |

#### 5.3.1. ServiceTier Object

| Field                    | Type            | Req | Description                       |
|--------------------------|-----------------|-----|-----------------------------------|
| tier_id                  | string          | R   | Slug identifier ([a-z0-9-]+)      |
| name                     | string          | R   | Human-readable name (max 64)      |
| description              | string          | O   | Tier description (max 512)        |
| price                    | object          | R   | Price Object (see 5.3.2)          |
| limits                   | object          | O   | Resource limits (key-value pairs) |
| features                 | array\<string\> | O   | Included features list            |
| accepted_payment_methods | array\<string\> | O   | Tier-specific payment methods     |
| auto_deprovision         | boolean         | O   | Auto-deprovision on expiry        |

#### 5.3.2. Price Object

| Field              | Type    | Req | Description                         |
|--------------------|---------|-----|-------------------------------------|
| amount             | string  | R   | Decimal price (e.g., "25.00")       |
| currency           | string  | R   | ISO 4217 code or "USDC"             |
| interval           | string  | R   | one_time, hourly, daily, monthly,   |
|                    |         |     | or yearly                           |
| metered            | boolean | O   | Usage-based pricing (default: false)|
| metered_dimensions | array   | O   | Usage dimensions if metered         |

### 5.4. Endpoints Object

| Field           | Type   | Req | Description                           |
|-----------------|--------|-----|---------------------------------------|
| base_url        | string | R   | Base URL for OSP API (MUST be HTTPS)  |
| webhook_url     | string | O   | Webhook registration URL              |
| status_page_url | string | O   | Public status page URL                |

### 5.5. Manifest Signing

The "provider_signature" field contains an Ed25519 [RFC8032]
signature computed as follows:

1. Remove the "provider_signature" field from the manifest object.

2. Serialize the remaining object using Canonical JSON
   (Appendix A).

3. Sign the resulting byte string using the provider's Ed25519
   private key.

4. Encode the 64-byte signature as base64url without padding.

Example manifest:

```json
{
  "osp_version": "1.0",
  "manifest_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "manifest_version": 3,
  "published_at": "2026-03-27T10:00:00Z",
  "provider": {
    "provider_id": "com.example",
    "display_name": "Example Provider",
    "homepage_url": "https://example.com"
  },
  "offerings": [
    {
      "offering_id": "example/postgres",
      "name": "Managed PostgreSQL",
      "description": "Fully managed PostgreSQL database.",
      "category": "database",
      "tiers": [
        {
          "tier_id": "free",
          "name": "Free",
          "price": {
            "amount": "0.00",
            "currency": "USD",
            "interval": "monthly"
          }
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
  "accepted_payment_methods": ["free"],
  "endpoints": {
    "base_url": "https://api.example.com"
  },
  "provider_public_key": "<base64url-encoded-ed25519-public-key>",
  "provider_signature": "<base64url-encoded-ed25519-signature>"
}
```

## 6. Provisioning Flow

### 6.1. ProvisionRequest

The object an agent sends to provision a service.

| Field             | Type   | Req | Description                          |
|-------------------|--------|-----|--------------------------------------|
| offering_id       | string | R   | Offering from the manifest           |
| tier_id           | string | R   | Tier from the selected offering      |
| project_name      | string | O   | Human-readable name ([a-z0-9-]+)     |
| region            | string | O   | Desired deployment region            |
| configuration     | object | O   | Params per configuration_schema      |
| payment_method    | string | R   | From accepted_payment_methods        |
| payment_proof     | object | O   | Proof of payment (required if paid)  |
| agent_public_key  | string | O   | Ed25519 public key for encryption    |
| nonce             | string | R   | UUID v4 or 32+ random chars          |
| idempotency_key   | string | O   | Deduplication key (24h window)       |
| webhook_url       | string | O   | HTTPS URL for status webhooks        |
| principal_id      | string | O   | Identifier for authorizing principal |
| agent_attestation | string | O   | TAP or equivalent attestation token  |
| metadata          | object | O   | Key-value metadata (max 20 keys)     |

### 6.2. ProvisionResponse

The object a provider returns after processing a provision request.

| Field                   | Type   | Req | Description                       |
|-------------------------|--------|-----|-----------------------------------|
| resource_id             | string | R   | Unique resource identifier        |
| offering_id             | string | R   | Provisioned offering              |
| tier_id                 | string | R   | Provisioned tier                  |
| status                  | string | R   | provisioned, provisioning, failed |
| credentials_bundle      | object | C   | Credentials (when provisioned)    |
| estimated_ready_seconds | int    | C   | Seconds until ready (when async)  |
| poll_url                | string | C   | Status polling URL (when async)   |
| webhook_supported       | bool   | O   | Provider sends webhook events     |
| region                  | string | O   | Actual deployment region          |
| created_at              | string | R   | RFC 3339 creation timestamp       |
| expires_at              | string | O   | RFC 3339 expiration timestamp     |
| dashboard_url           | string | O   | Web dashboard URL                 |
| error                   | object | C   | Error details (when failed)       |

(C = Conditionally required based on status)

#### 6.2.1. Error Object

| Field               | Type    | Req | Description                      |
|---------------------|---------|-----|----------------------------------|
| code                | string  | R   | Machine-readable error code      |
| message             | string  | R   | Human-readable error message     |
| details             | object  | O   | Additional error context         |
| retryable           | boolean | R   | Whether agent SHOULD retry       |
| retry_after_seconds | integer | O   | Suggested wait time              |

Defined error codes:

| Code                    | Description                             |
|-------------------------|-----------------------------------------|
| invalid_offering        | The offering_id does not exist           |
| invalid_tier            | The tier_id does not exist               |
| invalid_region          | The region is not available              |
| invalid_configuration   | Configuration does not match schema      |
| payment_required        | Payment proof missing or invalid         |
| payment_declined        | Payment method was declined              |
| insufficient_funds      | Insufficient funds                       |
| trust_tier_insufficient | Agent trust tier too low                 |
| quota_exceeded          | Principal exceeded their quota           |
| nonce_reused            | Nonce has already been used              |
| rate_limited            | Too many requests                        |
| provider_error          | Internal provider error                  |
| capacity_exhausted      | No available capacity                    |

### 6.3. Synchronous Provisioning

The standard flow when resources can be created immediately:

```
Agent                                Provider
  |                                      |
  |  POST /osp/v1/provision              |
  |  { offering_id, tier_id,             |
  |    agent_public_key, nonce,          |
  |    payment_method }                  |
  |------------------------------------->|
  |                                      |
  |  201 Created                         |
  |  { resource_id, status:              |
  |    "provisioned",                    |
  |    credentials_bundle }              |
  |<-------------------------------------|
```

Step-by-step:

1. The agent fetches the ServiceManifest from
   "/.well-known/osp.json".

2. The agent verifies the "provider_signature" (Section 4.2).

3. The agent selects an offering and tier.

4. The agent sends a ProvisionRequest to the provider's provision
   endpoint.

5. The provider validates the request, verifies payment (if
   applicable), and creates the resource.

6. The provider returns a ProvisionResponse with status
   "provisioned" and a CredentialBundle.

HTTP status codes for POST /osp/v1/provision:

| Status | Meaning                                        |
|--------|------------------------------------------------|
| 201    | Resource provisioned synchronously             |
| 202    | Resource being provisioned asynchronously      |
| 400    | Invalid request                                |
| 402    | Payment proof missing, invalid, or declined    |
| 403    | Trust tier insufficient                        |
| 409    | Nonce reused or idempotency key conflict       |
| 429    | Rate limited (includes Retry-After header)     |
| 500    | Internal server error                          |
| 503    | Provider temporarily unavailable               |

### 6.4. Asynchronous Provisioning

For resources that take significant time to provision:

```
Agent                                Provider
  |                                      |
  |  POST /osp/v1/provision              |
  |------------------------------------->|
  |  202 Accepted                        |
  |  { resource_id,                      |
  |    status: "provisioning",           |
  |    estimated_ready_seconds: 120,     |
  |    poll_url: "..." }                 |
  |<-------------------------------------|
  |                                      |
  |  GET /osp/v1/status/{resource_id}    |
  |------------------------------------->|  (poll)
  |  { status: "provisioning",           |
  |    progress: 0.6 }                   |
  |<-------------------------------------|
  |                                      |
  |  GET /osp/v1/status/{resource_id}    |
  |------------------------------------->|  (poll)
  |  { status: "provisioned",            |
  |    credentials_bundle: {...} }       |
  |<-------------------------------------|
```

Polling rules:

- Agents SHOULD wait at least "estimated_ready_seconds * 0.5"
  before the first poll.

- Agents MUST NOT poll more frequently than once every 5 seconds.

- Agents SHOULD use exponential backoff if the resource is not yet
  ready.

- Agents MUST stop polling after 1 hour and treat the provisioning
  as failed.

Webhook alternative: If the agent provided a "webhook_url" in the
ProvisionRequest and the provider supports webhooks
("webhook_supported: true"), the provider SHOULD send a POST to the
webhook URL when provisioning completes:

```json
{
  "event": "resource.provisioned",
  "resource_id": "res_abc123",
  "status": "provisioned",
  "credentials_bundle": { "..." : "..." },
  "timestamp": "2026-03-27T12:03:00Z",
  "provider_signature": "..."
}
```

### 6.5. Free Tier Flow

When the selected tier has a price of "0.00":

1. The agent sets "payment_method" to "free".

2. The agent MAY omit "payment_proof".

3. The provider MUST NOT require payment proof.

4. For Sybil resistance, providers SHOULD require
   "agent_attestation" with a minimum trust tier of "basic" or
   higher, OR require a verifiable "principal_id".

5. Providers SHOULD set "expires_at" on free-tier resources
   (RECOMMENDED: 7-30 days).

### 6.6. Idempotency

When an agent includes an "idempotency_key" in the
ProvisionRequest:

1. The provider MUST store the response associated with this key
   for at least 24 hours.

2. If the provider receives another request with the same
   "idempotency_key", it MUST return the stored response without
   creating a new resource.

3. The idempotency key is scoped to the provider.

4. If the original request is still being processed, the provider
   SHOULD return the in-progress ProvisionResponse.

Distinction from nonces: A nonce prevents replay attacks and MUST
be unique per attempt.  An idempotency key ensures retry safety
and MUST be the same across retry attempts.  Both MAY be present
in a request.

## 7. Credential Encryption

### 7.1. CredentialBundle Format

| Field                  | Type   | Req | Description                       |
|------------------------|--------|-----|-----------------------------------|
| format                 | string | R   | "plaintext" or "encrypted"        |
| credentials            | object | C   | Plaintext credentials             |
| encrypted_credentials  | object | C   | Encrypted credentials             |
| delivery_proof         | object | O   | Proof that credentials are valid  |
| rotation_supported     | bool   | R   | Whether rotation is supported     |
| rotation_interval_hours| int    | O   | Recommended rotation interval     |
| issued_at              | string | R   | RFC 3339 issuance timestamp       |
| expires_at             | string | O   | RFC 3339 expiration timestamp     |
| scope                  | string | O   | admin, read_write, read_only,     |
|                        |        |     | or custom (default: admin)        |

### 7.2. Encrypted Credentials Object

| Field                          | Type   | Req | Description                |
|--------------------------------|--------|-----|----------------------------|
| algorithm                      | string | R   | MUST be                    |
|                                |        |     | "x25519-xsalsa20-poly1305"|
| agent_public_key               | string | R   | Agent's Ed25519 key        |
| provider_ephemeral_public_key  | string | R   | Ephemeral X25519 key       |
| nonce                          | string | R   | 24-byte nonce (base64url)  |
| ciphertext                     | string | R   | Encrypted credentials      |

### 7.3. Encryption Procedure

When an agent provides "agent_public_key" in the ProvisionRequest,
the provider MUST encrypt sensitive credentials using the following
procedure:

1. Key Conversion: Convert the agent's Ed25519 public key to an
   X25519 public key using the birational map defined in [RFC8032]
   Section 5.1.5.

2. Ephemeral Key Generation: Generate a fresh ephemeral X25519
   keypair.  The provider MUST generate a new ephemeral keypair
   for each encryption operation.

3. Shared Secret Computation: Compute the shared secret using
   X25519 [RFC7748] Diffie-Hellman:

   shared_secret = X25519(ephemeral_private, agent_x25519_public)

4. Nonce Generation: Generate a random 24-byte nonce.

5. Encryption: Encrypt the JSON-serialized credentials using
   XSalsa20-Poly1305 authenticated encryption with the shared
   secret and nonce.

6. Bundling: Return the encrypted credentials in the
   CredentialBundle with "format: encrypted", including
   "provider_ephemeral_public_key", "nonce", and "ciphertext"
   (all base64url-encoded without padding).

### 7.4. Decryption Procedure

The agent decrypts by:

1. Converting its Ed25519 private key to an X25519 private key.

2. Computing the shared secret:
   shared_secret = X25519(agent_x25519_private,
                          provider_ephemeral_public_key)

3. Decrypting the ciphertext using XSalsa20-Poly1305 with the
   shared secret and nonce.

4. Parsing the decrypted bytes as JSON.

### 7.5. Security Properties

- Only the agent holding the Ed25519 private key can decrypt.

- The provider MUST NOT retain the ephemeral private key after
  encryption.

- The provider SHOULD NOT store plaintext credentials after
  delivering the encrypted bundle.

- Each credential delivery uses a fresh ephemeral key, providing
  forward secrecy for each delivery operation.

### 7.6. Plaintext Credentials

When the agent does not provide "agent_public_key":

1. The provider MAY return plaintext credentials with
   "format: plaintext".

2. The response MUST still use HTTPS (transport encryption).

3. Agents are RECOMMENDED to always provide a public key for
   defense-in-depth.

## 8. Lifecycle Management

### 8.1. Required Endpoints

Providers implementing OSP MUST support the following endpoints.
All endpoints are relative to the "endpoints.base_url" from the
ServiceManifest.

All endpoints:
- MUST use HTTPS (TLS 1.3 RECOMMENDED, TLS 1.2 minimum).
- MUST accept and return "Content-Type: application/json".
- MUST include the "X-OSP-Version: 1.0" response header.
- SHOULD include "X-Request-Id" response header for debugging.

| Method | Path                              | Description          |
|--------|-----------------------------------|----------------------|
| POST   | /osp/v1/provision                 | Provision a resource |
| DELETE | /osp/v1/deprovision/{resource_id} | Deprovision          |
| GET    | /osp/v1/credentials/{resource_id} | Retrieve credentials |
| POST   | /osp/v1/rotate/{resource_id}      | Rotate credentials   |
| GET    | /osp/v1/status/{resource_id}      | Get resource status  |
| GET    | /osp/v1/usage/{resource_id}       | Get usage report     |
| GET    | /osp/v1/health                    | Provider health      |
| POST   | /osp/v1/dispute/{resource_id}     | File a dispute       |

### 8.2. Deprovisioning

DELETE /osp/v1/deprovision/{resource_id}

Request body (optional):

| Field              | Type    | Req | Description                     |
|--------------------|---------|-----|---------------------------------|
| reason             | string  | O   | Reason for deprovisioning       |
| skip_grace_period  | boolean | O   | Delete data immediately         |
| nonce              | string  | R   | Unique request identifier       |

Deprovisioning behavior:

1. The provider MUST revoke all credentials associated with the
   resource.

2. The provider SHOULD retain data for a grace period
   (RECOMMENDED: 7 days) before permanent deletion.

3. The provider MUST stop billing for the resource effective
   immediately.

4. The response MUST include "deprovisioned_at" and
   "data_retained_until" timestamps.

Response status codes:

| Status | Meaning                          |
|--------|----------------------------------|
| 200    | Resource deprovisioned           |
| 404    | Resource ID does not exist       |
| 409    | Resource already deprovisioned   |

### 8.3. Credential Retrieval

GET /osp/v1/credentials/{resource_id}

Used when the agent needs to re-fetch credentials (e.g., after
restart or for a different agent instance).

The agent MAY include an "X-OSP-Agent-Public-Key" header with its
Ed25519 public key.  If provided, the provider MUST encrypt the
credentials.

Providers MUST authenticate credential retrieval requests using
one of:

1. "Authorization: Bearer {agent_attestation}" (RECOMMENDED)
2. "Authorization: Bearer {resource_token}"
3. Mutual TLS

Providers MUST NOT serve credentials without authentication.  If
no recognized authentication is provided, the provider MUST return
401 Unauthorized.

### 8.4. Credential Rotation

POST /osp/v1/rotate/{resource_id}

Request:

| Field                              | Type    | Req | Description           |
|------------------------------------|---------|-----|-----------------------|
| agent_public_key                   | string  | O   | Key for encryption    |
| nonce                              | string  | R   | Unique identifier     |
| invalidate_previous_after_seconds  | integer | O   | Grace period          |
|                                    |         |     | (default: 300, max: 3600)|

Grace period rules:

1. The grace period MUST be at least 5 minutes (RECOMMENDED: 15
   minutes).

2. The provider MUST include "old_credentials_valid_until" in the
   response.

3. During the grace period, BOTH old and new credentials MUST work.

4. After the grace period, old credentials MUST be rejected.  The
   provider SHOULD return HTTP 401 with the header
   "X-OSP-Credentials-Rotated: true".

5. The provider MUST NOT invalidate old credentials before
   "old_credentials_valid_until".

### 8.5. Status

GET /osp/v1/status/{resource_id}

StatusResponse fields:

| Field                   | Type   | Req | Description                    |
|-------------------------|--------|-----|--------------------------------|
| resource_id             | string | R   | Resource identifier            |
| offering_id             | string | R   | Offering identifier            |
| tier_id                 | string | R   | Current tier                   |
| status                  | string | R   | provisioning, provisioned,     |
|                         |        |     | degraded, deprovisioning,      |
|                         |        |     | deprovisioned, failed          |
| health                  | string | O   | healthy, degraded, unhealthy,  |
|                         |        |     | unknown                        |
| progress                | number | O   | 0.0 to 1.0 (when provisioning)|
| region                  | string | O   | Deployment region              |
| created_at              | string | R   | RFC 3339 timestamp             |
| current_usage           | object | O   | Current usage metrics          |
| dashboard_url           | string | O   | Web dashboard URL              |

### 8.6. Usage

GET /osp/v1/usage/{resource_id}

Returns a UsageReport for the requested billing period.

Query parameter:

| Parameter | Type   | Description                                   |
|-----------|--------|-----------------------------------------------|
| period    | string | Billing period (YYYY-MM, default: current)    |

UsageReport fields:

| Field              | Type            | Req | Description                |
|--------------------|-----------------|-----|----------------------------|
| report_id          | string          | R   | UUID v4 report identifier  |
| resource_id        | string          | R   | Resource identifier        |
| period_start       | string          | R   | RFC 3339 period start      |
| period_end         | string          | R   | RFC 3339 period end        |
| line_items         | array           | R   | Itemized usage charges     |
| base_amount        | string          | R   | Base tier price            |
| metered_amount     | string          | R   | Metered charges            |
| total_amount       | string          | R   | Total amount due           |
| currency           | string          | R   | ISO 4217 currency code     |
| provider_signature | string          | R   | Ed25519 signature          |
| generated_at       | string          | R   | RFC 3339 generation time   |

### 8.7. Health

GET /osp/v1/health

Provider health check endpoint.  Used by registries and agents to
verify the provider's OSP API is operational.

HealthResponse fields:

| Field       | Type   | Req | Description                          |
|-------------|--------|-----|--------------------------------------|
| status      | string | R   | healthy, degraded, or unhealthy      |
| osp_version | string | R   | Protocol version supported           |
| provider_id | string | R   | Provider identifier                  |
| timestamp   | string | R   | RFC 3339 timestamp                   |
| endpoints   | object | O   | Per-endpoint status                  |

### 8.8. Dispute

POST /osp/v1/dispute/{resource_id}

Signals a dispute for a provisioned resource.  This endpoint does
NOT resolve disputes -- it creates a signed "osp_dispute_receipt"
that the agent carries to the settlement rail for resolution.

Dispute reason codes:

| Code                    | Description                             |
|-------------------------|-----------------------------------------|
| service_not_delivered   | Resource provisioned but inaccessible   |
| credentials_invalid     | Credentials do not work                 |
| wrong_tier              | Incorrect tier or limits                |
| billing_mismatch        | Usage report does not match observation |
| unauthorized_charge     | Payment used beyond authorized scope    |
| quality_degraded        | Service below stated SLA                |

The response includes an "osp_dispute_receipt" -- a signed JWT
containing: dispute_id, resource_id, reason_code, filed_at,
provider_id, and the provider's Ed25519 signature.

### 8.9. Webhook Management

POST /osp/v1/webhooks/{resource_id}: Register or update a webhook.

DELETE /osp/v1/webhooks/{resource_id}: Remove a webhook.

Webhook event types:

| Event                        | Trigger                           |
|------------------------------|-----------------------------------|
| resource.provisioned         | Async provisioning completed      |
| resource.status_changed      | Status changed                    |
| resource.approaching_limit   | Near tier limits (>80%)           |
| credentials.rotated          | Auto-rotation by provider         |
| credentials.expiring         | Credentials approaching expiry    |
| usage.report_ready           | New usage report available        |
| usage.threshold_reached      | Usage crossed billing threshold   |
| billing.payment_failed       | Recurring payment failed          |

Providers MUST support at minimum: "resource.provisioned" and
"resource.status_changed".

## 9. Billing Integration

OSP is payment-rail agnostic.  The protocol declares which payment
methods are accepted and carries payment proofs, but the actual
payment logic belongs to external systems.

### 9.1. Standard Payment Methods

The following payment method identifiers are defined:

| Identifier   | Description                                      |
|--------------|--------------------------------------------------|
| free         | No payment required                              |
| stripe_spt   | Stripe Shared Payment Token                      |
| sardis_wallet| Sardis Protocol wallet                           |
| x402         | HTTP 402-based micropayments                     |
| mpp          | Machine Payments Protocol                        |
| invoice      | Traditional invoicing                            |

### 9.2. Custom Payment Methods

Providers can declare custom payment methods using reverse-domain
notation:

```json
"accepted_payment_methods": [
  "free",
  "stripe_spt",
  "com.acme.custom_billing"
]
```

Custom payment methods MUST be documented in the manifest's
"extensions" object, including a "payment_proof_schema" defining
the required proof structure.

### 9.3. Usage-Based Billing

For metered tiers, providers generate signed UsageReports
(Section 8.6) that detail consumption.  Usage reports are signed
with the provider's Ed25519 key, enabling agents to verify charges
are authentic.

## 10. Security Considerations

### 10.1. Transport Security

1. All OSP endpoints MUST use TLS.

2. TLS 1.3 is RECOMMENDED.  TLS 1.2 is the minimum acceptable
   version.

3. TLS 1.0 and 1.1 MUST NOT be supported.

4. Providers SHOULD support HSTS (Strict-Transport-Security header)
   with a "max-age" of at least 31536000 (1 year).

5. Mutual TLS (mTLS) is RECOMMENDED for production deployments
   where both parties can manage certificates.

### 10.2. Manifest Integrity

All ServiceManifests MUST be signed with the provider's Ed25519
private key [RFC8032].

Signing process:

1. Construct the manifest JSON with all fields except
   "provider_signature".

2. Serialize to canonical JSON: keys sorted lexicographically at
   all nesting levels, no whitespace, UTF-8 encoding (Appendix A).

3. Sign the resulting byte string with Ed25519.

4. Base64url-encode the 64-byte signature without padding.

If the agent cannot verify the signature, it MUST reject the
manifest.

### 10.3. Credential Encryption

When the agent provides "agent_public_key":

1. The provider MUST encrypt all sensitive credential fields.

2. The provider MUST use "x25519-xsalsa20-poly1305" (NaCl
   crypto_box).

3. The provider MUST generate a fresh ephemeral keypair for each
   encryption operation.

4. The provider MUST NOT store the ephemeral private key after
   encryption.

5. The provider SHOULD NOT store plaintext credentials after
   delivering the encrypted bundle.

When the agent does not provide "agent_public_key":

1. The provider MAY return plaintext credentials.

2. The response MUST still use HTTPS.

3. Agents are RECOMMENDED to always provide a public key.

### 10.4. Replay Protection

1. Every ProvisionRequest, rotation request, and deprovision
   request MUST include a unique "nonce".

2. The nonce MUST be a UUID v4 or a cryptographically random
   string of at least 32 characters.

3. Providers MUST reject any request with a nonce that has been
   seen within the previous 24 hours.

4. Providers MUST return error code "nonce_reused" (HTTP 409)
   when a duplicate nonce is detected.

5. Providers SHOULD use a bloom filter or similar probabilistic
   data structure for efficient nonce tracking, with a false
   positive rate no greater than 1 in 10^9.

### 10.5. Webhook Authentication

When a provider sends webhook notifications:

1. The provider MUST include an "X-OSP-Signature" header.

2. The signature is computed as:
   HMAC-SHA256(webhook_secret, timestamp + "." + request_body)

3. The "X-OSP-Signature" header value format:
   "t={unix_timestamp},v1={hex_encoded_hmac}"

4. Agents MUST reject webhooks where the timestamp is more than
   300 seconds (5 minutes) old.

5. Agents MUST use constant-time comparison when verifying the
   HMAC.

Retry policy: Providers MUST implement retries for failed webhook
deliveries using exponential backoff:

| Attempt | Delay After Previous |
|---------|---------------------|
| 1       | Immediate           |
| 2       | 1 minute            |
| 3       | 15 minutes          |
| 4       | 1 hour              |
| 5       | 4 hours             |
| 6       | 24 hours            |

After 6 failed attempts, the provider MUST stop retrying and mark
the webhook subscription as failed.

### 10.6. Rate Limiting

Providers MUST implement rate limiting on all OSP endpoints.

1. Rate limit responses MUST use HTTP 429 Too Many Requests.

2. Rate limit responses MUST include the "Retry-After" header.

3. Providers SHOULD include rate limit headers per
   draft-ietf-httpapi-ratelimit-headers:
   - RateLimit-Limit
   - RateLimit-Remaining
   - RateLimit-Reset

Recommended minimum rate limits:

| Endpoint                  | Minimum Rate Limit                    |
|---------------------------|---------------------------------------|
| POST /provision           | 10 requests/min per principal         |
| DELETE /deprovision/{id}  | 10 requests/min per principal         |
| GET /credentials/{id}     | 30 requests/min per resource          |
| POST /rotate/{id}         | 5 requests/hour per resource          |
| GET /status/{id}          | 60 requests/min per resource          |
| GET /usage/{id}           | 30 requests/min per resource          |
| GET /health               | 60 requests/min per IP                |

### 10.7. Provider Key Rotation

Providers MUST be able to rotate their Ed25519 signing keys without
breaking existing integrations.

1. Key Identification: Each provider key MUST have a unique Key ID
   ("kid").  The "kid" MUST be included in the manifest as
   "provider_key_id".

2. JWKS Endpoint: Providers SHOULD publish their active and
   recently-retired public keys at "/.well-known/osp-keys.json"
   using the JWK format:

```json
{
  "keys": [
    {
      "kid": "key-2026-03",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "<base64url-encoded-public-key>",
      "use": "sig",
      "status": "active"
    }
  ]
}
```

3. Rotation procedure:
   a. Generate new Ed25519 keypair with new "kid".
   b. Publish new manifest signed with the new key.
   c. Add new key to JWKS endpoint with status "active".
   d. Old key transitions to status "retired" but remains in JWKS
      for 90 days.

4. Emergency rotation: If a key is compromised, the provider
   immediately publishes a new manifest, removes the compromised
   key from JWKS (sets status "revoked"), and agents encountering
   a revoked key MUST reject the manifest.

### 10.8. Agent Identity Revocation

If an agent's private key is compromised:

1. Providers that accept "agent_attestation" tokens SHOULD
   periodically verify the attestation has not been revoked.

2. Providers SHOULD check revocation status on each credential
   retrieval and provision request.

3. When a revoked attestation is detected, the provider MUST
   return 403 Forbidden, suspend credential delivery, and NOT
   deprovision the resource.

4. Agents SHOULD use short-lived attestations (RECOMMENDED: 1-hour
   expiry with refresh) to bound the blast radius of key
   compromise.

### 10.9. Request Tracing

All OSP requests and responses SHOULD include the
"X-OSP-Trace-Id" header for distributed tracing.

1. If the agent includes "X-OSP-Trace-Id", the provider MUST echo
   it in the response.

2. If the agent does not include the header, the provider SHOULD
   generate one.

3. The trace ID MUST be propagated to webhook deliveries.

4. Format: UUID v4 or any string up to 128 characters.

### 10.10. Threat Model

OSP addresses the following threat vectors:

| ID  | Threat                  | Mitigation                          |
|-----|-------------------------|-------------------------------------|
| T1  | Manifest Spoofing       | Ed25519 signatures + DNS TXT key    |
|     |                         | binding + JWKS verification         |
| T2  | Credential Interception | TLS 1.3 + Ed25519 credential        |
|     |                         | encryption (double layer)           |
| T3  | Replay Attack           | Unique nonces + 24h nonce window +  |
|     |                         | idempotency keys                    |
| T4  | Free Tier Abuse (Sybil) | Trust tier requirements + per-      |
|     |                         | principal rate limits + attestation  |
| T5  | Credential Stuffing     | Authentication on credential        |
|     |                         | retrieval + rate limiting            |
| T6  | Provider Impersonation  | Manifest signatures + registry      |
|     |                         | attestation + TLS origin binding     |
| T7  | Usage Report Inflation  | Agent-side usage verification +     |
|     |                         | dispute endpoint + signed reports    |
| T8  | Webhook Hijacking       | HMAC-SHA256 signatures + HTTPS-only |
|     |                         | webhooks + secret rotation           |
| T9  | Key Compromise (Agent)  | Short-lived attestations +          |
|     |                         | principal-initiated revocation       |
| T10 | Key Compromise          | JWKS with key status + emergency    |
|     | (Provider)              | rotation + revoked key rejection     |
| T11 | Stale Manifest Attack   | Manifest versioning + freshness     |
|     |                         | check on published_at                |
| T12 | Resource Squatting      | Free tier expiration + auto-        |
|     |                         | deprovision + idle timeouts          |

## 11. IANA Considerations

### 11.1. Well-Known URI Registration

This document requests registration of the following well-known
URI [RFC8615]:

- URI suffix: osp.json
- Change controller: IETF
- Specification document(s): This document
- Related information: None

### 11.2. Well-Known URI Registration (Key Set)

This document requests registration of the following well-known
URI [RFC8615]:

- URI suffix: osp-keys.json
- Change controller: IETF
- Specification document(s): This document, Section 10.7
- Related information: JSON Web Key Set for OSP provider key
  rotation

### 11.3. DNS TXT Record

This document defines a DNS TXT record at "_osp.{domain}" for
provider public key verification (Section 4.2).  No IANA
registration is required for underscore-prefixed DNS labels, but
implementors SHOULD be aware of [RFC8552] regarding underscored
DNS names.

### 11.4. HTTP Header Fields

This document defines the following HTTP header fields:

| Header Field            | Status   | Reference         |
|-------------------------|----------|-------------------|
| X-OSP-Version           | standard | Section 1.5       |
| X-OSP-Signature         | standard | Section 10.5      |
| X-OSP-Timestamp         | standard | Section 10.5      |
| X-OSP-Trace-Id          | standard | Section 10.9      |
| X-OSP-Deprecated        | standard | Section 4.5       |
| X-OSP-Agent-Public-Key  | standard | Section 8.3       |
| X-OSP-Credentials-Rotated | standard | Section 8.4     |
| X-OSP-Delivery-Attempt  | standard | Section 10.5      |

Note: Per current IETF conventions, the "X-" prefix is deprecated
for new header fields.  Future versions of this specification MAY
define unprefixed equivalents (e.g., "OSP-Version").  For the
purposes of this specification, the "X-OSP-" prefix is retained
to avoid collision with existing header fields during the
protocol's adoption phase.

### 11.5. Media Type

This document does not define any new media types.  All data is
exchanged using "application/json" [RFC8259].

## 12. References

### 12.1. Normative References

[RFC2119]
:  Bradner, S., "Key words for use in RFCs to Indicate Requirement
   Levels", BCP 14, RFC 2119, DOI 10.17487/RFC2119, March 1997,
   <https://www.rfc-editor.org/info/rfc2119>.

[RFC3339]
:  Klyne, G. and C. Newman, "Date and Time on the Internet:
   Timestamps", RFC 3339, DOI 10.17487/RFC3339, July 2002,
   <https://www.rfc-editor.org/info/rfc3339>.

[RFC4648]
:  Josefsson, S., "The Base16, Base32, and Base64 Data Encodings",
   RFC 4648, DOI 10.17487/RFC4648, October 2006,
   <https://www.rfc-editor.org/info/rfc4648>.

[RFC7748]
:  Langley, A., Hamburg, M., and S. Turner, "Elliptic Curves for
   Security", RFC 7748, DOI 10.17487/RFC7748, January 2016,
   <https://www.rfc-editor.org/info/rfc7748>.

[RFC8032]
:  Josefsson, S. and I. Liusvaara, "Edwards-Curve Digital
   Signature Algorithm (EdDSA)", RFC 8032, DOI 10.17487/RFC8032,
   January 2017, <https://www.rfc-editor.org/info/rfc8032>.

[RFC8174]
:  Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119
   Key Words", BCP 14, RFC 8174, DOI 10.17487/RFC8174, May 2017,
   <https://www.rfc-editor.org/info/rfc8174>.

[RFC8259]
:  Bray, T., Ed., "The JavaScript Object Notation (JSON) Data
   Interchange Format", STD 90, RFC 8259, DOI 10.17487/RFC8259,
   December 2017, <https://www.rfc-editor.org/info/rfc8259>.

[RFC8615]
:  Nottingham, M., "Well-Known Uniform Resource Identifiers
   (URIs)", RFC 8615, DOI 10.17487/RFC8615, May 2019,
   <https://www.rfc-editor.org/info/rfc8615>.

### 12.2. Informative References

[RFC8552]
:  Crocker, D., "Scoped Interpretation of DNS Resource Records
   through 'Underscored' Naming of Attribute Leaves", BCP 222,
   RFC 8552, DOI 10.17487/RFC8552, March 2019,
   <https://www.rfc-editor.org/info/rfc8552>.

[OSP-SPEC]
:  Durmaz, E., "Open Service Protocol Specification v1.0",
   March 2026, <https://github.com/osp-protocol/osp>.

[NaCl]
:  Bernstein, D.J., Lange, T., and P. Schwabe, "The security
   impact of a new cryptographic library", 2012,
   <https://nacl.cr.yp.to/>.

## Appendix A. Canonical JSON Serialization

For signature computation, JSON objects MUST be serialized in
canonical form:

1. All object keys MUST be sorted lexicographically (by Unicode
   code point) at every nesting level.

2. No whitespace between tokens (no spaces after ":" or ",", no
   newlines).

3. No trailing commas.

4. Strings MUST use minimal escaping (only required characters:
   quotation mark, reverse solidus, and control characters).

5. Numbers MUST be serialized in their shortest form (no
   unnecessary leading or trailing zeros).

6. "null", "true", and "false" are represented as their literal
   JSON forms.

7. Array element order MUST be preserved (arrays are NOT sorted).

8. The serialization MUST be UTF-8 encoded.

Example:

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

This canonical form is used as the signing payload for
ServiceManifest signatures and UsageReport signatures.

## Appendix B. Test Vectors

### B.1. Ed25519 Manifest Signing

Test key pair (DO NOT use in production, from [RFC8032]):

```
Private key (seed, 32 bytes, hex):
  9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60

Public key (32 bytes, hex):
  d75a980182b10ab7d54bfed3c964073a0ee172f3daa3f4a18446b0b8d183f8e3

Public key (base64url):
  11qYAYKxCrfVS_7TyWQHOg7hcvPao_ShiEawuNGD-OM
```

Test manifest (canonical JSON, provider_signature removed):

```
{"endpoints":{"base_url":"https://test.example.com"},
"manifest_id":"test-001","manifest_version":1,
"offerings":[{"category":"database","credentials_schema":{},
"description":"Test","name":"Test DB","offering_id":"test/db",
"tiers":[{"name":"Free","price":{"amount":"0.00",
"currency":"USD","interval":"monthly"},"tier_id":"free"}]}],
"osp_version":"1.0","provider":{"display_name":"Test Provider",
"homepage_url":"https://test.example.com",
"provider_id":"test.example.com"},
"provider_public_key":
"11qYAYKxCrfVS_7TyWQHOg7hcvPao_ShiEawuNGD-OM",
"published_at":"2026-01-01T00:00:00Z"}
```

(Note: The canonical JSON above is shown with line breaks for
readability.  The actual signing input has no whitespace.)

### B.2. Nonce Validation

| Input                                    | Valid | Reason          |
|------------------------------------------|-------|-----------------|
| f47ac10b-58cc-4372-a567-0e02b2c3d479    | Yes   | UUID v4         |
| a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6       | Yes   | 32-char hex     |
| KjHgFdSaPoIuYtReWqMnBvCxZlKjHgFd       | Yes   | 32-char alnum   |
| 12345                                    | No    | Too short       |
| 00000000-0000-0000-0000-000000000000     | No    | Nil UUID        |
| (empty string)                           | No    | Empty           |

### B.3. Credential Encryption Parameters

| Parameter        | Value                                       |
|------------------|---------------------------------------------|
| Key agreement    | X25519 (Curve25519 Diffie-Hellman) [RFC7748] |
| AEAD cipher      | XSalsa20-Poly1305 [NaCl]                    |
| Nonce size       | 24 bytes                                    |
| Key derivation   | Ed25519 to X25519 per [RFC8032] Sec. 5.2.5  |
| Ciphertext overhead | 16 bytes (Poly1305 tag)                  |
| Encoding         | Base64url, no padding [RFC4648]              |

## Appendix C. Conformance Requirements

### C.1. Provider Conformance

A provider is OSP v1.0 conformant if it satisfies ALL of:

1. Publishes a valid ServiceManifest at "/.well-known/osp.json".

2. Signs the manifest with Ed25519 and includes a valid
   "provider_signature" and "provider_public_key".

3. Implements all eight required endpoints (Section 8.1).

4. Encrypts credentials with "x25519-xsalsa20-poly1305" when the
   agent provides "agent_public_key".

5. Rejects duplicate nonces within a 24-hour window.

6. Uses TLS 1.2 or higher on all endpoints.

7. Returns well-formed error responses with recognized error codes.

8. Includes "X-OSP-Version: 1.0" in all responses.

### C.2. Agent Conformance

An agent is OSP v1.0 conformant if it satisfies ALL of:

1. Verifies the "provider_signature" of every ServiceManifest.

2. Includes a unique nonce in every ProvisionRequest, rotation
   request, and deprovision request.

3. Provides "agent_public_key" and can decrypt
   "x25519-xsalsa20-poly1305" encrypted credential bundles.

4. Handles both synchronous and asynchronous provision responses.

5. Respects minimum 5-second polling interval and 1-hour timeout
   for asynchronous provisioning.

6. Handles all defined error codes and respects "Retry-After"
   headers.

7. Includes "X-OSP-Version: 1.0" in all requests.

### C.3. Conformance Levels

| Level              | Requirements                                |
|--------------------|---------------------------------------------|
| OSP Core           | All 8 mandatory endpoints + C.1/C.2         |
| OSP Core+Webhooks  | Core + webhook management + HMAC delivery   |
| OSP Core+Events    | Core + audit event stream (90-day retention)|
| OSP Full           | Core + Webhooks + Events + JWKS rotation +  |
|                    | geographic compliance                        |

## Author's Address

Efe Baran Durmaz
Sardis
Email: efe@sardis.sh
URI: https://sardis.sh
