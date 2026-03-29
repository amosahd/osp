# OSP Protocol Improvement Master Plan

**Date:** 2026-03-29
**Status:** Executing

## Research Summary

### Stripe Projects Pain Points (17 found)
- Curated provider lock-in (invite-only)
- Stripe as mandatory billing intermediary
- Micropayments impossible ($0.30 fixed fee)
- Feature bloat / complexity
- AI agents can't use human-designed interfaces
- No standardized service discovery
- Credential management nightmare
- 88% of AI agent pilots never reach production (integration complexity)
- No agent-to-agent payment path
- Protocol fragmentation (ACP, UCP, AP2, A2A, MCP, x402)
- Missing identity layer for AI agents (KYA gap)
- $19T infrastructure gap
- ClickOps still the default
- Enterprise Stripe experience deterioration
- Framework fragmentation / high switching costs
- Skills market governance gap
- Stripe MPP still centralized

### Cloud Provisioning Pain Points (14 categories)
- 30% of eng time on infra tasks, 4-7 day fulfillment
- IaC (Terraform/Pulumi) complexity, state corruption, HCL learning curve
- Multi-cloud management (87% run multi-cloud, 70% say it's top challenge)
- Onboarding takes 10 days, 7.4 tools average, 6-15 hrs/week context switching
- 29M secrets leaked on GitHub 2025, only 10% use secret managers
- 52% say FinOps disconnect causes waste, 27% cloud spend wasted
- Manual credential rotation in 22% of breaches
- Database provisioning: 54% cite integration complexity
- Serverless cold starts, vendor-locked deployment
- Service mesh complexity (Istio rollbacks)

### Spec Audit (35 issues)
- 3 CRITICAL: Agent identity not in SDKs, idempotency_key missing from schema, nonce collision risk
- 4 HIGH: Sandbox not in SDKs, cost-summary not in SDKs, identity error code missing, manifest identity not schematized
- 15 MEDIUM: Various spec underspecifications
- 5 LOW: Minor gaps
- 8 DESIGN-GAP: Principal verification, async webhook fallback, encryption requirements, rate limit budget, A2A delegation validation

---

## Execution Plan (Priority Order)

### WAVE 1: CRITICAL Schema & Spec Fixes
1. Add `idempotency_key` to provision-request.schema.json
2. Add `identity` object to service-manifest.schema.json
3. Add `identity_verification_failed` error code to spec
4. Add `provider_key_id` to manifest schema
5. Define health endpoint response schema
6. Add cost-summary pagination (cursor-based)
7. Clarify sandbox + deprovision grace period interaction
8. Define credential rotation 401 response body
9. Clarify version negotiation rules (X-OSP-Version-Min)

### WAVE 2: SDK Updates (All 4 SDKs)
10. TypeScript SDK: Add agent_identity, sandbox mode, cost-summary, idempotency_key
11. Python SDK: Add agent_identity, sandbox mode, cost-summary, idempotency_key
12. TypeScript SDK: Add manifest cache TTL (1 hour)
13. Python SDK: Add async client variant
14. Update all SDK types for new schema fields

### WAVE 3: Conformance Tests
15. Tests for sandbox mode (provision, TTL, rate limits)
16. Tests for agent identity (all 3 methods)
17. Tests for cost-summary endpoint
18. Tests for idempotency_key behavior
19. Crypto test vectors (Ed25519 signing, X25519 encryption, HMAC-SHA256)
20. Nonce replay window tests

### WAVE 4: New Protocol Features (from pain point research)
21. Rate limiting standardization: Define X-OSP-RateLimit-* headers in spec
22. Provider SDK/Framework: Express.js middleware + FastAPI middleware
23. Error taxonomy: Comprehensive error code table with HTTP status mappings
24. Multi-region provisioning: Add `region` preference to ProvisionRequest
25. Webhook retry policy: Exponential backoff spec + dead letter queue
26. Protocol versioning: Feature-level capability discovery in manifest
27. Resource migration: Flesh out Section 6.16 with data export format
28. Health check depth: Shallow vs deep health, dependency health reporting

### WAVE 5: Example & Documentation Updates
29. Update all 10 example manifests: sandbox, identity, provider_key_id
30. Add example: agent identity flow (all 3 methods)
31. Add example: cost-summary response
32. Add example: webhook retry with exponential backoff
33. Update for-providers.md with new features
34. Update for-agents.md with new features
35. Update getting-started.md

### WAVE 6: Ecosystem Strengthening
36. RFC process document (CONTRIBUTING-RFC.md)
37. Provider onboarding checklist (interactive)
38. Agent onboarding checklist
39. Security threat model document
40. Performance benchmarking guide

---

## What User Must Do (Cannot Be Automated)
- Provider outreach (email templates ready)
- npm/PyPI/crates.io package publishing (needs auth)
- IETF formal submission
- Domain registration (osp.dev or osp.sh)
- Community governance structure decisions
- Stripe Projects competitive positioning (marketing)
