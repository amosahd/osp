# OSP Master Plan v2 — Subtasks & Atomic Commits

**Date:** 2026-03-28
**Author:** Efe Baran Durmaz
**Status:** Draft — Awaiting Review
**Scope:** Everything — spec, Rust core, 4 SDKs, Sardis integration, provider adapters, launch

---

## Vision

OSP (Open Service Protocol) is the open standard for AI agents to discover, provision, and manage developer services. It is to service provisioning what MCP is to tool access.

**Key insight from research:** The biggest missing features in the ecosystem (and what Stripe Projects doesn't do) are:
1. A2A agent delegation for provisioning
2. Non-human identity lifecycle (short-lived tokens, not static API keys)
3. FinOps cost-as-code (budget guardrails, cost-in-PR)
4. Service dependency graph + impact analysis
5. Golden paths + scorecards (IDP features for solo devs)
6. Agent observability (OpenTelemetry traces for every OSP operation)
7. MCP .well-known alignment (bridge MCP discovery → OSP provisioning)

These will be integrated into the spec and implementation.

---

## Phase 0: Foundation (Week 1-2)

---

### P0-1: Spec v1.1 — Research-Backed Additions

Add the 7 highest-priority features from research to the spec.

#### P0-1a: A2A Protocol Support
**Files:** `spec/osp-v1.0.md` (new Section 15)
**Subtasks:**
1. Write Section 15.1: Agent Cards in OSP manifests
2. Write Section 15.2: Delegated provisioning (agent A asks agent B to provision)
3. Write Section 15.3: Task lifecycle integration with A2A states
4. Update TOC
**Commit:** `spec: add A2A agent delegation support (Section 15)`

#### P0-1b: Non-Human Identity Lifecycle
**Files:** `spec/osp-v1.0.md` (extend Section 8 + new Section 12.6)
**Subtasks:**
1. Write Section 12.6: Short-lived token issuance (replace static API keys with auto-expiring tokens)
2. Write Section 12.7: NHI inventory and orphan detection
3. Write Section 12.8: Identity federation (OIDC/SPIFFE for agent→provider auth)
4. Update credential delivery modes to prefer short-lived tokens
**Commit:** `spec: add non-human identity lifecycle management`

#### P0-1c: FinOps / Cost-as-Code
**Files:** `spec/osp-v1.0.md` (extend Section 14.6 + new subsections)
**Subtasks:**
1. Write Section 14.6.1: Budget guardrails (per-project/team spend limits with enforcement)
2. Write Section 14.6.2: Cost-in-PR (show cost impact of osp.yaml changes before apply)
3. Write Section 14.6.3: Cost anomaly detection
4. Write Section 14.6.4: Environment TTLs with burn rate tracking
**Commit:** `spec: add FinOps cost-as-code features`

#### P0-1d: Service Dependency Graph
**Files:** `spec/osp-v1.0.md` (new Section 11.9)
**Subtasks:**
1. Write Section 11.9: Dependency graph generation from project state
2. Write Section 11.9.1: Impact analysis (before deprovision/rotate, show what breaks)
3. Write Section 11.9.2: Health propagation (DB unhealthy → all dependents warned)
4. Write Section 11.9.3: Auto-generated architecture documentation
**Commit:** `spec: add service dependency graph and impact analysis`

#### P0-1e: Golden Paths + Scorecards
**Files:** `spec/osp-v1.0.md` (extend Section 11.5 + new Section 11.10)
**Subtasks:**
1. Write Section 11.10: Service maturity scorecards (monitoring? backups? rotation? HTTPS?)
2. Write Section 11.10.1: Compliance checklists (SOC2, HIPAA, GDPR auto-check)
3. Write Section 11.10.2: Guided remediation (`osp fix` commands)
4. Extend Section 11.5 templates into "golden paths" with security defaults
**Commit:** `spec: add golden paths, scorecards, and compliance checklists`

#### P0-1f: Agent Observability
**Files:** `spec/osp-v1.0.md` (new Section 15.4)
**Subtasks:**
1. Write Section 15.4: OpenTelemetry-compatible tracing for OSP operations
2. Write Section 15.5: Agent action audit log (structured, queryable)
3. Write Section 15.6: Human-in-the-loop gates (destructive ops require approval)
4. Write Section 15.7: Cost-per-agent-action tracking
**Commit:** `spec: add agent observability and tracing`

#### P0-1g: MCP .well-known Alignment
**Files:** `spec/osp-v1.0.md` (extend Section 4.1 + Section 14.4)
**Subtasks:**
1. Extend Section 4.1: Add `mcp` field to `/.well-known/osp.json` for MCP capability advertisement
2. Write Section 4.1.1: Combined discovery (OSP + MCP in one request)
3. Update Section 14.4: MCP Streamable HTTP transport support
**Commit:** `spec: align with MCP .well-known discovery and Streamable HTTP`

#### P0-1h: Additional Research-Backed Features
**Files:** `spec/osp-v1.0.md` (various sections)
**Subtasks:**
1. Section 6.17: Progressive deployment / canary provisioning
2. Section 11.11: SBOM generation and supply chain attestation
3. Section 14.8: Provider status aggregation
4. Section 13.7: `osp.config.ts` TypeScript-based configuration (Pulumi model)
5. Section 13.8: Ephemeral environment lifecycle (PR-triggered, TTL, shareable URLs)
6. Section 13.9: `osp onboard` developer onboarding command
7. Section 14.9: Unified billing marketplace
8. Section 15.8: Provider onboarding SDK (become OSP-compatible in hours)
**Commit:** `spec: add progressive deployment, SBOM, provider status, TS config, ephemeral envs, onboarding, unified billing, provider SDK`

---

### P0-2: Cross-Validation

#### P0-2a: Spec ↔ Schema Consistency
**Files:** All `schemas/*.schema.json`
**Subtasks:**
1. Read every field in spec Section 3, compare with every field in schema files
2. Fix any mismatches (field names, types, required/optional)
3. Add new fields from v1.1 additions to schemas
4. Validate all 14 example manifests against updated schemas
**Commit:** `schema: cross-validate with spec v1.1, fix mismatches`

#### P0-2b: Spec ↔ SDK Type Consistency
**Files:** `reference-implementation/python/src/osp/types.py`, `reference-implementation/typescript/src/types.ts`
**Subtasks:**
1. Compare Python Pydantic models with spec Section 3 fields
2. Compare TypeScript types with spec Section 3 fields
3. Add missing fields from v1.1 to both SDKs
4. Run tests to confirm nothing breaks
**Commit:** `ref: sync SDK types with spec v1.1`

---

### P0-3: LLM Skills System

#### P0-3a: Skill Format Specification
**Files:** `spec/osp-v1.0.md` (extend Section 11.8)
**Subtasks:**
1. Define `/.well-known/osp-skills.md` structured format
2. Define skill sections: Quick Start, Credentials, Common Operations, Framework Guides, Gotchas
3. Define machine-readable frontmatter (provider, category, required_credentials, frameworks)
**Commit:** `spec: define structured LLM skill format`

#### P0-3b: Write Provider Skills
**Files:** `skills/supabase.md`, `skills/neon.md`, `skills/vercel.md`, `skills/clerk.md`, `skills/upstash.md`, `skills/resend.md`, `skills/cloudflare.md`, `skills/posthog.md`, `skills/turso.md`, `skills/railway.md`
**Subtasks:**
1. Write Supabase skill (Postgres, Auth, Storage — with Next.js, Python, Go examples)
2. Write Neon skill (serverless Postgres — with Prisma, Drizzle examples)
3. Write Vercel skill (hosting — with Next.js, deployment, env vars)
4. Write Clerk skill (auth — with Next.js, React, middleware)
5. Write Upstash skill (Redis — with REST, SDK, rate limiting)
6. Write Resend skill (email — with React Email, templates)
7. Write Cloudflare skill (Workers, R2, D1 — with Wrangler)
8. Write PostHog skill (analytics — with Next.js, React, capture events)
9. Write Turso skill (LibSQL — with Drizzle, embedded replicas)
10. Write Railway skill (hosting + Postgres — with Docker, Nixpacks)
**Commit:** `skills: add LLM integration skills for 10 providers`

---

### P0-4: Repository & Infrastructure

#### P0-4a: GitHub Organization
**Subtasks:**
1. Create `open-service-protocol` GitHub org
2. Transfer current repo as `osp` (spec + schemas + skills + reference impls)
3. Create empty repos: `osp-core`, `osp-sdk-ts`, `osp-sdk-python`, `osp-sdk-go`, `osp-sdk-rust`
4. Set up branch protection, issue templates, PR templates
**Commit:** (GitHub operations, no code commit)

#### P0-4b: Domain & Website Scaffold
**Subtasks:**
1. Acquire osp.sh domain
2. Create `website/` directory with Next.js or Astro project
3. Landing page: hero, problem, solution, comparison, providers, get started
4. Spec viewer page (rendered markdown)
5. Provider directory page
6. Skill browser page
7. Deploy to Vercel or Cloudflare Pages
**Commit:** `site: initial osp.sh website scaffold`

#### P0-4c: CI/CD
**Subtasks:**
1. GitHub Action: validate all JSON schemas on PR
2. GitHub Action: run Python tests on PR
3. GitHub Action: run TypeScript tests on PR
4. GitHub Action: build Rust on PR (when osp-core exists)
5. GitHub Action: deploy website on push to main
**Commit:** `ci: add schema validation, test runners, website deploy`

---

## Phase 1: Rust Core (Week 3-6)

---

### P1-1: osp-crypto

#### P1-1a: Ed25519 Signing
**Files:** `osp-core/crates/osp-crypto/src/signing.rs`
**Subtasks:**
1. Key generation (random seed → keypair)
2. Sign message (private key + bytes → signature)
3. Verify signature (public key + bytes + signature → bool)
4. Base64url encode/decode
5. Test with spec Appendix E vectors
**Commit:** `crypto: Ed25519 sign/verify with test vectors`

#### P1-1b: x25519 Credential Encryption
**Files:** `osp-core/crates/osp-crypto/src/encryption.rs`
**Subtasks:**
1. Ed25519 → x25519 key conversion
2. Ephemeral key generation
3. Shared secret computation
4. XSalsa20-Poly1305 encrypt
5. XSalsa20-Poly1305 decrypt
6. Tests with known vectors
**Commit:** `crypto: x25519-xsalsa20-poly1305 credential encryption`

#### P1-1c: Canonical JSON
**Files:** `osp-core/crates/osp-crypto/src/canonical.rs`
**Subtasks:**
1. Deterministic key sorting at all nesting levels
2. Compact serialization (no whitespace)
3. Test with spec Appendix E vectors
**Commit:** `crypto: canonical JSON serialization`

#### P1-1d: WASM Build
**Files:** `osp-core/osp-wasm/`
**Subtasks:**
1. wasm-bindgen exports for verify_signature, canonical_json
2. npm package build
3. Test in browser environment
**Commit:** `wasm: browser-compatible manifest verification`

---

### P1-2: osp-manifest

#### P1-2a: Type Definitions
**Files:** `osp-core/crates/osp-manifest/src/types.rs`
**Subtasks:**
1. ServiceManifest struct with serde
2. ServiceOffering, ServiceTier, Price
3. ProvisionRequest, ProvisionResponse
4. CredentialBundle, UsageReport
5. All enums (PaymentMethod, TrustTier, Category, etc.)
**Commit:** `manifest: protocol object type definitions`

#### P1-2b: Manifest Fetch & Verify
**Files:** `osp-core/crates/osp-manifest/src/fetch.rs`, `src/verify.rs`
**Subtasks:**
1. HTTP fetch from /.well-known/osp.json (reqwest)
2. JSON parsing into typed structs
3. Signature verification using osp-crypto
4. Manifest caching (in-memory + disk)
5. Version comparison and freshness check
**Commit:** `manifest: fetch, parse, verify, cache`

#### P1-2c: Schema Validation
**Files:** `osp-core/crates/osp-manifest/src/validate.rs`
**Subtasks:**
1. Load JSON Schema files
2. Validate manifest against schema
3. Validate ProvisionRequest against schema
4. Error reporting with field-level detail
**Commit:** `manifest: JSON Schema validation`

---

### P1-3: osp-vault

#### P1-3a: Encrypted Storage
**Files:** `osp-core/crates/osp-vault/src/store.rs`
**Subtasks:**
1. AES-256-GCM encryption for credential storage
2. File-based vault (.osp/vault.json)
3. System keychain integration for vault key (keyring crate)
4. CRUD operations (add, get, list, delete credentials)
**Commit:** `vault: encrypted credential storage with keychain`

#### P1-3b: osp:// URI Resolver
**Files:** `osp-core/crates/osp-vault/src/resolver.rs`
**Subtasks:**
1. Parse osp:// URIs (provider/offering/credential_key)
2. Resolve to real values from vault
3. Environment variable injection (patch std::env)
4. .env file generation with osp:// references
**Commit:** `vault: osp:// URI resolver`

#### P1-3c: Env Generation
**Files:** `osp-core/crates/osp-vault/src/env.rs`
**Subtasks:**
1. dotenv format output
2. JSON, YAML, TOML, shell formats
3. Framework detection (Next.js, Vite, etc.)
4. NEXT_PUBLIC_ / VITE_ prefix auto-generation
5. Monorepo scope support
6. Comments with service source
**Commit:** `vault: multi-format env generation with framework detection`

---

### P1-4: osp-cli

#### P1-4a: Project & Discovery Commands
**Files:** `osp-core/crates/osp-cli/src/commands/`
**Subtasks:**
1. `osp init` — interactive wizard (dialoguer crate)
2. `osp discover` — search providers, display table
3. `osp status` — aggregate health check
4. `osp skills <provider>` — display provider LLM skill
**Commit:** `cli: init, discover, status, skills commands`

#### P1-4b: Provisioning Commands
**Subtasks:**
1. `osp provision <provider/service>` — with escrow support
2. `osp deprovision <resource_id>` — with confirmation
3. `osp upgrade <resource_id>` — tier change
4. `osp rotate <resource_id>` — credential rotation
5. `osp estimate <provider/service>` — cost preview
**Commit:** `cli: provision, deprovision, upgrade, rotate, estimate commands`

#### P1-4c: Environment Commands
**Subtasks:**
1. `osp env` — generate .env from project
2. `osp env pull` — sync from vault to .env
3. `osp env push <target>` — sync to Vercel/Railway/GitHub
4. `osp env diff` — show changes since last sync
5. `osp env validate` — check all vars present and valid
**Commit:** `cli: env, env pull, env push, env diff, env validate commands`

#### P1-4d: IaC Commands
**Subtasks:**
1. `osp setup` — clone-to-running flow
2. `osp apply` — plan/apply from osp.yaml
3. `osp apply --plan-only` — dry run
4. `osp drift` — detect config drift
**Commit:** `cli: setup, apply, drift IaC commands`

#### P1-4e: Team & Import Commands
**Subtasks:**
1. `osp join` — team onboarding
2. `osp import` — credential import from manual setup
3. `osp share` — resource sharing
4. `osp onboard` — full developer onboarding flow
**Commit:** `cli: join, import, share, onboard commands`

---

### P1-5: osp-provider (Adapter Framework)

#### P1-5a: Provider Trait + Framework
**Files:** `osp-core/crates/osp-provider/src/`
**Subtasks:**
1. ProviderPort trait definition
2. Adapter registry (HashMap<String, Box<dyn ProviderPort>>)
3. Health check polling loop
4. Async provisioning with webhook/poll handling
**Commit:** `provider: adapter trait and framework`

#### P1-5b: Tier 1 Adapters
**Subtasks:**
1. Neon adapter (REST API → ProviderPort)
2. Upstash adapter (REST API → ProviderPort)
3. Turso adapter (REST API → ProviderPort)
4. Resend adapter (REST API → ProviderPort)
**Commit:** `provider: Neon, Upstash, Turso, Resend adapters`

#### P1-5c: Tier 2 Adapters
**Subtasks:**
1. Supabase adapter (Management API + OAuth)
2. Vercel adapter (REST API + OAuth)
3. Railway adapter (GraphQL API + OAuth)
4. PostHog adapter (REST API)
**Commit:** `provider: Supabase, Vercel, Railway, PostHog adapters`

---

### P1-6: osp-registry

#### P1-6a: Core Server
**Files:** `osp-core/crates/osp-registry/src/`
**Subtasks:**
1. axum HTTP server setup
2. SQLite storage (rusqlite)
3. Manifest submission endpoint (POST)
4. Manifest search endpoint (GET with filters)
5. Health monitoring (periodic provider checks)
**Commit:** `registry: core server with SQLite and manifest CRUD`

#### P1-6b: Advanced Features
**Subtasks:**
1. Cursor-based pagination
2. Provider reputation scoring
3. Template/preset registry
4. Skill index (searchable LLM skills)
5. Provider status aggregation
**Commit:** `registry: pagination, reputation, templates, skills, status`

---

### P1-7: osp-conformance

#### P1-7a: Test Suite
**Subtasks:**
1. Provider conformance tests (8 mandatory endpoints)
2. Agent conformance tests (manifest verify, nonce, encryption)
3. Conformance levels (Core, +Webhooks, +Events, +Escrow, Full)
4. JSON report output
5. SVG badge generation
6. `osp conformance run` CLI command
**Commit:** `conformance: provider and agent test suite with badges`

---

## Phase 2: SDK Development (Week 5-8, parallel)

---

### P2-1: TypeScript SDK

#### P2-1a: Core Upgrade
**Subtasks:**
1. Upgrade OSPClient to production-grade (error handling, retries, timeouts)
2. Add all v1.1 protocol objects
3. osp:// URI resolver for Node.js
4. Framework integrations (Next.js plugin, Vite plugin)
**Commit:** `sdk(ts): production-grade client with framework plugins`

#### P2-1b: MCP Tools
**Subtasks:**
1. `osp_discover` MCP tool
2. `osp_provision` MCP tool
3. `osp_env` MCP tool
4. `osp_status` MCP tool
5. `osp_skills` MCP tool
6. npm package: `@osp/mcp-server`
**Commit:** `sdk(ts): MCP server with 5 OSP tools`

#### P2-1c: Tests & Publish
**Subtasks:**
1. 100+ unit tests
2. Integration tests against mock provider
3. npm publish: `@osp/client`, `@osp/mcp-server`
**Commit:** `sdk(ts): 100+ tests, npm publish`

---

### P2-2: Python SDK

#### P2-2a: Core Upgrade
**Subtasks:**
1. Upgrade OSPClient to production-grade
2. Upgrade OSPProvider base class
3. Add all v1.1 protocol objects to Pydantic models
4. osp:// URI resolver for Python
5. Framework integrations (Django, FastAPI)
**Commit:** `sdk(python): production-grade client + provider with framework integrations`

#### P2-2b: Tests & Publish
**Subtasks:**
1. 100+ unit tests
2. Integration tests
3. PyPI publish: `osp-client`
**Commit:** `sdk(python): 100+ tests, PyPI publish`

---

### P2-3: Go SDK

#### P2-3a: Implementation
**Subtasks:**
1. Client interface + implementation
2. Provider interface + implementation
3. Ed25519 crypto (stdlib)
4. osp:// resolver
5. All protocol object structs
**Commit:** `sdk(go): client + provider with crypto`

#### P2-3b: Tests & Publish
**Subtasks:**
1. 80+ tests
2. Go module publish
**Commit:** `sdk(go): 80+ tests, module publish`

---

### P2-4: Rust SDK

#### P2-4a: Implementation
**Subtasks:**
1. Thin wrapper around osp-core crates
2. Client + Provider traits
3. Async runtime (tokio)
**Commit:** `sdk(rust): client + provider wrapping osp-core`

#### P2-4b: Tests & Publish
**Subtasks:**
1. 80+ tests
2. crates.io publish
**Commit:** `sdk(rust): 80+ tests, crates.io publish`

---

## Phase 3: Provider Integrations (Week 6-10)

(Detailed in P1-5b and P1-5c above — adapters built in Rust, exposed through SDKs)

---

## Phase 4: Sardis Integration (Week 8-12)

---

### P4-1: OSP as Sardis Payment Rail
**Subtasks:**
1. `payment_method: "sardis_wallet"` flow in Rust
2. SpendingMandate → ProvisionRequest mapping
3. EscrowHold creation on paid provisioning
4. UsageReport → ChargeIntent mapping
5. Internal ledger settlement
**Commit:** `sardis: OSP payment rail integration`

### P4-2: Sardis MCP Extension
**Subtasks:**
1. 9 OSP tools in sardis-mcp-server (from earlier work)
2. Bridge: sardis_provision_service → OSP provision + Sardis escrow
**Commit:** `sardis: MCP tools with OSP + escrow`

### P4-3: Sardis CLI Extension
**Subtasks:**
1. `sardis projects` commands (from earlier work)
2. Bridge: sardis projects add → OSP provision + Sardis payment
**Commit:** `sardis: CLI projects commands with OSP bridge`

---

## Phase 5: Launch (Week 10-12)

---

### P5-1: Pre-Launch
**Subtasks:**
1. Security audit of osp-crypto
2. External spec review (2-3 experts)
3. Provider partnership confirmations (2+ providers)
4. Demo video (30-second full stack provision)
5. Blog post: "Why We Built OSP"
6. Pitch deck update with OSP slide
7. One-pager update

### P5-2: Launch Day
**Subtasks:**
1. GitHub repos public
2. osp.sh live
3. Show HN post
4. Twitter/X thread with Karpathy quote
5. Reddit posts
6. Provider partnership announcements
7. YC update email

### P5-3: Post-Launch
**Subtasks:**
1. IETF Internet-Draft: draft-durmaz-osp-00
2. W3C AI Agent Protocol CG presentation
3. MCP community outreach
4. AP2/x402 community outreach
5. Developer tutorials
6. First external PR review

---

## Commit Summary

| Phase | Commits | Estimated |
|-------|---------|-----------|
| P0: Foundation | ~15 commits | Week 1-2 |
| P1: Rust Core | ~15 commits | Week 3-6 |
| P2: SDKs | ~8 commits | Week 5-8 |
| P3: Providers | (included in P1) | Week 6-10 |
| P4: Sardis | ~3 commits | Week 8-12 |
| P5: Launch | ~2 commits | Week 10-12 |
| **Total** | **~43 atomic commits** | **12 weeks** |

---

## New Features from Research (Added to Spec)

| # | Feature | Section | Priority |
|---|---------|---------|----------|
| 1 | A2A agent delegation | 15.1-15.3 | P0 |
| 2 | Non-human identity lifecycle | 12.6-12.8 | P0 |
| 3 | FinOps cost-as-code | 14.6.1-14.6.4 | P0 |
| 4 | Service dependency graph | 11.9 | P0 |
| 5 | Golden paths + scorecards | 11.10 | P1 |
| 6 | Agent observability | 15.4-15.7 | P0 |
| 7 | MCP .well-known alignment | 4.1.1 | P0 |
| 8 | Progressive deployment | 6.17 | P2 |
| 9 | SBOM generation | 11.11 | P2 |
| 10 | Provider status aggregation | 14.8 | P2 |
| 11 | TypeScript IaC config | 13.7 | P2 |
| 12 | Ephemeral environment lifecycle | 13.8 | P1 |
| 13 | Developer onboarding command | 13.9 | P1 |
| 14 | Unified billing marketplace | 14.9 | P2 |
| 15 | Provider onboarding SDK | 15.8 | P1 |
