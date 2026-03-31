# OSP Paid Core Profile

OSP Paid Core is a constrained conformance profile for providers and agents that want to support paid provisioning safely without taking on the full surface area of webhooks, audit streams, or escrow integrations on day one.

## What Paid Core Includes

- OSP Core manifest and provisioning semantics
- Paid tier declaration via `accepted_payment_methods`
- `payment_method` and `payment_proof` handling on provision requests
- Nested machine-actionable error responses
- Async provisioning with `poll_url` or `status_url`
- Idempotent retries for in-flight paid provisioning

## What Paid Core Does Not Require

- Webhook delivery
- Audit event streaming
- Escrow-backed settlement
- Geographic compliance extensions
- JWKS rotation and advanced trust extras from OSP Full

## Provider Requirements

A provider advertising OSP Paid Core MUST:

- satisfy all OSP Core requirements
- declare accepted payment methods for each paid offering or tier
- reject missing or invalid payment proof with structured error responses
- support async paid provisioning without creating duplicate resources on retry
- honor `idempotency_key` for paid provisioning requests

## Agent Requirements

An agent advertising OSP Paid Core MUST:

- satisfy all OSP Core agent requirements
- choose a valid `payment_method` from the provider manifest
- attach the required `payment_proof` for non-free tiers
- handle retryable payment failures and approval gates as structured errors
- retry interrupted paid requests with the same `idempotency_key` and a fresh `nonce`

## Suggested Conformance Surface

The current conformance badge maps Paid Core to the following test families:

- `TestManifestSchema`
- `TestProvisionRequestSchema`
- `TestEndpointPaths`
- `TestPaymentMethods`
- `TestCanonicalJSON`
- `TestNonceGeneration`
- `TestManifestSignatureVerification`
- `TestCredentialBundleFormat`
- `TestErrorHandling`
- `TestIdempotencyKeyFormat`
- `TestIdempotentProvisionRetry`

Providers that need escrow guarantees should advance to `OSP Core + Escrow`. Providers that need hosted-webhook and event-stream interoperability should advance to `OSP Full`.
