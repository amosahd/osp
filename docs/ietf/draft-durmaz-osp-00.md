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

This document specifies the Open Service Protocol (OSP), a standard for automated discovery, provisioning, and lifecycle management of developer services by AI agents and automated processes. OSP defines a RESTful interface using JSON over HTTPS, with Ed25519-based manifest signing and x25519-XSalsa20-Poly1305 credential encryption. The protocol is payment-rail agnostic and supports both synchronous and asynchronous provisioning flows.

## Status of This Memo

This Internet-Draft is submitted in full conformance with the provisions of BCP 78 and BCP 79.

Internet-Drafts are working documents of the Internet Engineering Task Force (IETF). Note that other groups may also distribute working documents as Internet-Drafts.

## Copyright Notice

Copyright (c) 2026 IETF Trust and the persons identified as the document authors. All rights reserved.

## Table of Contents

1. Introduction
2. Terminology
3. Protocol Overview
4. Discovery Mechanism
5. Service Manifest Format
6. Provisioning Flow
7. Credential Encryption
8. Lifecycle Management
9. Security Considerations
10. IANA Considerations
11. References

## 1. Introduction

### 1.1. Problem Statement

AI agents and automated processes increasingly need to provision infrastructure services (databases, hosting, authentication, analytics) on behalf of developers and organizations. Current approaches require either browser-based signup flows that agents cannot navigate, or proprietary platform-specific APIs that create vendor lock-in.

This document defines the Open Service Protocol (OSP), which provides a standard, vendor-neutral mechanism for service discovery, provisioning, and lifecycle management.

### 1.2. Design Goals

The protocol is designed with the following goals:

- **Openness**: No gatekeeping, approval queues, or proprietary extensions required for basic operation.
- **Payment-rail agnosticism**: The protocol does not define or privilege any payment mechanism.
- **Machine-first**: Designed for agent-to-provider interaction without human intervention.
- **Security**: All credentials encrypted in transit, all manifests signed.
- **Extensibility**: Custom payment methods, provider-specific extensions, and custom credential fields supported via extension points.

### 1.3. Notational Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174].

## 2. Terminology

- **Agent**: An automated process (AI agent, CI/CD pipeline, or script) that discovers and provisions services via OSP.
- **Provider**: A service that implements OSP endpoints and publishes a Service Manifest.
- **Service Manifest**: A JSON document describing a provider's available services, published at a well-known URI.
- **Offering**: A specific service available from a provider (e.g., "managed PostgreSQL").
- **Tier**: A pricing/capability level within an offering (e.g., "free", "pro").
- **Resource**: A provisioned instance of an offering.
- **Credential Bundle**: An encrypted package containing access credentials for a provisioned resource.

## 3. Protocol Overview

OSP operates over HTTPS using JSON request and response bodies. The protocol has four phases:

1. **Discovery**: Agent fetches the provider's Service Manifest from `/.well-known/osp.json` and verifies its Ed25519 signature.
2. **Provisioning**: Agent sends a `ProvisionRequest` to the provider's provision endpoint, receiving a `ProvisionResponse` with encrypted credentials.
3. **Lifecycle Management**: Agent manages the resource via standard endpoints for status, rotation, usage, and deprovisioning.
4. **Billing**: Handled out-of-band via the provider's chosen payment method. OSP does not define billing flows.

## 4. Discovery Mechanism

### 4.1. Well-Known URI

Providers MUST publish their Service Manifest at:

```
https://{provider-domain}/.well-known/osp.json
```

This follows the Well-Known URIs registry [RFC8615].

### 4.2. Manifest Retrieval

Agents SHOULD fetch the manifest using an HTTP GET request with the `Accept: application/json` header. Providers MUST respond with a `Content-Type: application/json` header.

Providers SHOULD include appropriate caching headers (ETag, Cache-Control) to minimize unnecessary refetching.

### 4.3. Registry Discovery

In addition to direct discovery via well-known URIs, providers MAY register with an OSP Registry. The registry API is defined in Section 8 of the full specification [OSP-SPEC].

## 5. Service Manifest Format

The Service Manifest is a JSON object with the following top-level fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| manifest_id | string | REQUIRED | Unique identifier matching `^mf_[a-z0-9_]+$` |
| manifest_version | integer | REQUIRED | Monotonically increasing version |
| previous_version | integer/null | OPTIONAL | Previous version for chain verification |
| provider_id | string | REQUIRED | Provider domain or identifier |
| display_name | string | REQUIRED | Human-readable provider name |
| provider_public_key | string | RECOMMENDED | Ed25519 public key (base64url, no padding) |
| offerings | array | REQUIRED | Array of ServiceOffering objects |
| accepted_payment_methods | array | OPTIONAL | Accepted payment methods |
| endpoints | object | REQUIRED | API endpoint paths |
| provider_signature | string | REQUIRED | Ed25519 signature of canonical manifest |

### 5.1. Manifest Signing

The provider_signature field contains an Ed25519 signature computed as follows:

1. Remove the `provider_signature` field from the manifest object.
2. Serialize the remaining object using Canonical JSON (Appendix A).
3. Sign the resulting byte string using the provider's Ed25519 private key.
4. Encode the signature as base64url without padding.

## 6. Provisioning Flow

### 6.1. Synchronous Provisioning

```
Agent                                Provider
  |                                      |
  |  POST /osp/v1/provision              |
  |  { offering_id, tier_id,             |
  |    agent_public_key, nonce }         |
  |------------------------------------->|
  |                                      |
  |  200 OK                              |
  |  { resource_id, status,              |
  |    credentials_bundle }              |
  |<-------------------------------------|
```

### 6.2. Asynchronous Provisioning

For resources that take longer to provision:

```
Agent                                Provider
  |                                      |
  |  POST /osp/v1/provision              |
  |------------------------------------->|
  |  202 Accepted                        |
  |  { resource_id, status: "pending" }  |
  |<-------------------------------------|
  |                                      |
  |  GET /osp/v1/status/{resource_id}    |
  |------------------------------------->|  (poll)
  |  { status: "provisioning" }          |
  |<-------------------------------------|
  |                                      |
  |  Webhook: provision.completed        |
  |<-------------------------------------|  (or poll returns "active")
```

## 7. Credential Encryption

Credentials MUST be encrypted using the agent's Ed25519 public key (converted to x25519) with XSalsa20-Poly1305 authenticated encryption.

### 7.1. Encryption Procedure

1. Convert the agent's Ed25519 public key to an x25519 public key.
2. Generate an ephemeral x25519 keypair.
3. Compute the shared secret: `ECDH(ephemeral_private, agent_x25519_public)`.
4. Generate a random 24-byte nonce.
5. Encrypt the credential JSON using XSalsa20-Poly1305 with the shared secret and nonce.
6. Return `{ ephemeral_public_key, nonce, ciphertext }` (all base64url encoded).

### 7.2. Decryption Procedure

1. Convert the agent's Ed25519 private key to an x25519 private key.
2. Compute the shared secret: `ECDH(agent_x25519_private, ephemeral_public)`.
3. Decrypt using XSalsa20-Poly1305 with the shared secret and nonce.

## 8. Lifecycle Management

### 8.1. Required Endpoints

Providers implementing OSP MUST support the following endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | /osp/v1/provision | Provision a new resource |
| DELETE | /osp/v1/deprovision/{resource_id} | Deprovision a resource |
| GET | /osp/v1/status/{resource_id} | Get resource status |
| GET | /osp/v1/health | Provider health check |

### 8.2. Optional Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /osp/v1/rotate/{resource_id} | Rotate credentials |
| GET | /osp/v1/credentials/{resource_id} | Retrieve credentials |
| GET | /osp/v1/usage/{resource_id} | Usage report |
| POST | /osp/v1/estimate | Cost estimation |

## 9. Security Considerations

### 9.1. Transport Security

All OSP communication MUST use HTTPS (TLS 1.2 or later). Providers MUST NOT accept plain HTTP connections for any OSP endpoint.

### 9.2. Replay Protection

Provision requests MUST include a unique nonce. Providers MUST reject requests with previously seen nonces within a reasonable time window (RECOMMENDED: 5 minutes).

### 9.3. Key Management

Providers SHOULD rotate their Ed25519 signing keys periodically. The `manifest_version` field provides a mechanism for agents to detect key rotation.

### 9.4. Credential Exposure

Agents MUST NOT log or display decrypted credentials in context windows accessible to end users. The protocol supports "vault-only" credential delivery modes where credentials are stored encrypted and never exposed to the agent.

## 10. IANA Considerations

### 10.1. Well-Known URI Registration

This document requests registration of the following well-known URI:

- **URI suffix**: osp.json
- **Change controller**: IETF
- **Specification document(s)**: This document
- **Related information**: None

### 10.2. Media Type Registration

This document does not define any new media types. All data is exchanged using `application/json` [RFC8259].

## 11. References

### 11.1. Normative References

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017.
- [RFC8259] Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, December 2017.
- [RFC8615] Nottingham, M., "Well-Known Uniform Resource Identifiers (URIs)", RFC 8615, May 2019.

### 11.2. Informative References

- [OSP-SPEC] Durmaz, E., "Open Service Protocol Specification v1.1", March 2026.
- [EdDSA] Josefsson, S. and I. Liusvaara, "Edwards-Curve Digital Signature Algorithm (EdDSA)", RFC 8032, January 2017.
- [X25519] Langley, A., Hamburg, M., and S. Turner, "Elliptic Curves for Security", RFC 7748, January 2016.

## Appendix A. Canonical JSON Serialization

For signature computation, JSON objects MUST be serialized in canonical form:

1. Object keys MUST be sorted lexicographically (by Unicode code point) at all nesting levels.
2. No whitespace between tokens.
3. Strings MUST use minimal escaping (only required characters escaped).
4. Numbers MUST be serialized in their shortest form.

## Author's Address

Efe Baran Durmaz
Sardis
Email: efe@sardis.sh
