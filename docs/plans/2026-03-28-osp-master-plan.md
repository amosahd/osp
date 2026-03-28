# OSP Master Plan — 3-Month Roadmap to Production-Ready

**Date:** 2026-03-28
**Author:** Efe Baran Durmaz
**Status:** Draft — Awaiting Review

---

## Vision

OSP (Open Service Protocol) is the open standard for AI agents to discover, provision, and manage developer services. It is to service provisioning what MCP is to tool access — the protocol that makes agent-infrastructure interaction standardized, open, and universal.

**Positioning:** OSP is independent, governed by the open-service-protocol org. Sardis is the founding maintainer and builds the premium implementation (escrow, countersigned billing, ZKP privacy, internal ledger, spending policies, multi-rail payment).

**Revenue:** OSP is free and open (Apache 2.0). Sardis charges for the payment/trust layer that sits on top.

---

## Phase 0: Foundation (Week 1-2)

### 0.1 Spec Finalization
- [ ] Final review of osp-v1.0.md — fix any remaining inconsistencies
- [ ] Cross-validate spec ↔ JSON schemas ↔ Python types ↔ TypeScript types
- [ ] Ensure all 14 provider manifest examples validate against schemas
- [ ] Add "LLM Skill" section to spec — structured `/.well-known/osp-skills.md` format
- [ ] Generate spec as HTML (for website) and PDF (for sharing)

### 0.2 Repository Setup
- [ ] Create GitHub org: `open-service-protocol`
- [ ] Create repos: `osp` (spec + schemas), `osp-core` (Rust), `osp-sdk-ts`, `osp-sdk-python`, `osp-sdk-go`, `osp-sdk-rust`
- [ ] Domain: acquire osp.sh
- [ ] Set up GitHub Actions for schema validation CI
- [ ] Write GOVERNANCE.md — founding maintainer model
- [ ] Create GitHub Discussions for SIP process

### 0.3 LLM Skills System
- [ ] Define `/.well-known/osp-skills.md` format — structured markdown for agents
- [ ] Write skills for all 10 example providers (Supabase, Neon, Vercel, Clerk, Upstash, Resend, Cloudflare, PostHog, Turso, Railway)
- [ ] Each skill includes: quick start, common operations, credential usage, code snippets, common mistakes, framework-specific guides
- [ ] Skills are part of the manifest — provider publishes them alongside `osp.json`

### 0.4 Website (osp.sh)
- [ ] Landing page: problem → solution → quick example → comparison table → providers
- [ ] Spec viewer (rendered markdown with search)
- [ ] Provider directory (all 10 manifests browsable)
- [ ] Skill browser (all 10 provider skills viewable)
- [ ] "Get Started" flow for providers and agents

---

## Phase 1: Rust Core Implementation (Week 3-6)

### 1.1 Project Structure
```
osp-core/
├── crates/
│   ├── osp-crypto/          # Ed25519 signing, x25519 encryption, canonical JSON
│   ├── osp-manifest/        # Parse, validate, verify manifests + schemas
│   ├── osp-vault/           # Encrypted credential store + osp:// URI resolver
│   ├── osp-registry/        # Registry server (axum) — manifest indexing, search, health monitoring
│   ├── osp-conformance/     # Provider/agent conformance test runner
│   ├── osp-cli/             # `osp` CLI (clap) — init, provision, env, status
│   └── osp-provider/        # Provider adapter framework + built-in adapters
├── osp-wasm/                # WASM build for browser manifest verification
├── Cargo.toml
└── README.md
```

### 1.2 osp-crypto (Week 3)
- [ ] Ed25519 key generation, signing, verification (ring or ed25519-dalek)
- [ ] x25519 key exchange + XSalsa20-Poly1305 credential encryption
- [ ] Canonical JSON serialization (deterministic key sorting)
- [ ] Base64url encoding/decoding
- [ ] Test vectors from spec Appendix E
- [ ] WASM-compatible (no system-specific deps)

### 1.3 osp-manifest (Week 3)
- [ ] ServiceManifest, ServiceOffering, ServiceTier, ProvisionRequest, ProvisionResponse structs
- [ ] JSON Schema validation (jsonschema crate)
- [ ] Manifest fetch from /.well-known/osp.json
- [ ] Manifest signature verification
- [ ] Manifest versioning and caching
- [ ] RegionObject support (string or structured)

### 1.4 osp-vault (Week 3-4)
- [ ] Encrypted credential storage (AES-256-GCM)
- [ ] osp:// URI resolution (resolve references to real values)
- [ ] System keychain integration (macOS Keychain, Linux Secret Service)
- [ ] .env file generation (dotenv, json, yaml, toml, shell formats)
- [ ] Monorepo scope support (per-package env generation)
- [ ] Framework detection (Next.js → NEXT_PUBLIC_, Vite → VITE_, etc.)

### 1.5 osp-cli (Week 4-5)
- [ ] `osp init` — interactive project setup wizard
- [ ] `osp discover` — search providers by category
- [ ] `osp provision <provider/service>` — provision with escrow
- [ ] `osp deprovision <resource_id>` — tear down
- [ ] `osp env` — generate .env from all provisioned services
- [ ] `osp env pull` — sync from vault to .env
- [ ] `osp env push <target>` — sync to Vercel/Railway/GitHub Actions
- [ ] `osp env diff` — show changes since last sync
- [ ] `osp status` — health check all services
- [ ] `osp rotate <resource_id>` — credential rotation
- [ ] `osp upgrade <resource_id>` — tier change
- [ ] `osp estimate <provider/service>` — cost preview
- [ ] `osp join` — team onboarding (pull env from team vault)
- [ ] `osp setup` — clone-to-running flow (parse osp.yaml, provision, generate env)
- [ ] `osp apply` — declarative IaC (plan/apply/drift)
- [ ] `osp skills <provider>` — show provider LLM skill
- [ ] `osp import` — import existing credentials
- [ ] JSON output mode (`--json`) for agent consumption
- [ ] Non-interactive mode (`--auto-confirm`) for CI/CD

### 1.6 osp-provider (Week 4-5)
- [ ] ProviderPort trait (Rust equivalent of the interface)
- [ ] Built-in adapters: Supabase, Neon, Upstash, Resend (Tier 1 providers)
- [ ] Adapter framework for community contributions
- [ ] Health check polling
- [ ] Async provisioning with webhook/polling support
- [ ] Credential encryption before delivery

### 1.7 osp-registry (Week 5-6)
- [ ] axum-based REST server
- [ ] Manifest submission + validation + signature verification
- [ ] Search API (by category, tags, payment method, trust tier)
- [ ] Cursor-based pagination
- [ ] Provider health monitoring (periodic /.well-known/osp.json + /osp/v1/health checks)
- [ ] Reputation scoring (provision success rate, uptime, dispute rate)
- [ ] Template/preset registry
- [ ] Skill index (all provider LLM skills searchable)
- [ ] SQLite storage (lightweight, single-file deployment)

### 1.8 osp-conformance (Week 5-6)
- [ ] Provider conformance test suite (8 mandatory endpoints)
- [ ] Agent conformance test suite (manifest verification, nonce, encryption)
- [ ] Conformance levels: Core, +Webhooks, +Events, +Escrow, Full
- [ ] `osp conformance run --target https://provider.com` CLI command
- [ ] JSON report output
- [ ] Badges (SVG) for GitHub README

### 1.9 osp-wasm (Week 6)
- [ ] Manifest verification in browser (wasm-bindgen)
- [ ] Canonical JSON + Ed25519 verify
- [ ] npm package: `@osp/wasm`
- [ ] Used by website for client-side manifest validation

---

## Phase 2: SDK Development (Week 5-8, parallel with Phase 1)

### 2.1 TypeScript SDK (`@osp/client`)
- [ ] Upgrade existing reference impl to production-grade
- [ ] OSPClient class with full lifecycle
- [ ] Manifest discovery + verification
- [ ] Credential decryption
- [ ] osp:// URI resolver (for process.env patching)
- [ ] Framework integrations (Next.js, Vite, Nuxt, SvelteKit)
- [ ] MCP tool wrappers (for Claude/Cursor integration)
- [ ] npm package publish
- [ ] 100+ tests

### 2.2 Python SDK (`osp-client`)
- [ ] Upgrade existing reference impl to production-grade
- [ ] OSPClient async class
- [ ] OSPProvider base class (FastAPI)
- [ ] Pydantic models for all protocol objects
- [ ] osp:// URI resolver (for os.environ patching)
- [ ] Framework integrations (Django, FastAPI, Flask)
- [ ] PyPI package publish
- [ ] 100+ tests

### 2.3 Go SDK (`osp-go`)
- [ ] New implementation from scratch
- [ ] Client + provider interfaces
- [ ] Ed25519 crypto (stdlib)
- [ ] osp:// resolver
- [ ] Terraform provider wrapper (optional)
- [ ] Go module publish
- [ ] 80+ tests

### 2.4 Rust SDK (`osp-rs`)
- [ ] Thin wrapper around osp-core crates
- [ ] Client + provider traits
- [ ] Async runtime (tokio)
- [ ] crates.io publish
- [ ] 80+ tests

---

## Phase 3: Provider Integrations (Week 6-10)

### 3.1 Tier 1 Providers (built-in adapters, Week 6-7)
- [ ] **Neon** — project creation, connection strings, branch management
- [ ] **Upstash** — Redis database creation, REST token delivery
- [ ] **Turso** — database creation, auth token generation
- [ ] **Resend** — API key creation, domain management

### 3.2 Tier 2 Providers (adapter + OAuth, Week 8-9)
- [ ] **Supabase** — Management API + OAuth project claim
- [ ] **Vercel** — project creation + env var sync + deployment
- [ ] **Railway** — GraphQL API + OAuth
- [ ] **PostHog** — project creation + API key

### 3.3 Tier 3 Providers (adapter + manual steps, Week 9-10)
- [ ] **Cloudflare** — Workers + R2 + D1 via API token
- [ ] **Clerk** — user management (app creation still manual)
- [ ] **PlanetScale** — database + branch + connection strings

### 3.4 LLM Skills for All Providers
- [ ] Write comprehensive `osp-skills.md` for each of 10+ providers
- [ ] Include: quick start, credential usage, framework-specific code, common patterns, gotchas
- [ ] Skills published at `osp.sh/skills/{provider}` and via registry API
- [ ] MCP context generation: `osp skills --project my-app` merges all provider skills

---

## Phase 4: Sardis Integration (Week 8-12)

### 4.1 Sardis as OSP Payment Rail
- [ ] OSP `payment_method: "sardis_wallet"` implementation
- [ ] Sardis SpendingMandate → OSP ProvisionRequest mapping
- [ ] Escrow hold creation on paid provisioning
- [ ] Countersigned UsageReport → Sardis ChargeIntent mapping
- [ ] Internal ledger settlement for OSP-provisioned services

### 4.2 Sardis MCP Server Extension
- [ ] Add OSP tools to existing sardis-mcp-server (the 9 tools from earlier today)
- [ ] `sardis_discover_services` → OSP discovery
- [ ] `sardis_provision_service` → OSP provision + Sardis escrow
- [ ] `sardis_list_provisioned` → OSP project status
- [ ] Agent experience: Claude/Cursor can provision infrastructure through Sardis

### 4.3 Sardis CLI Extension
- [ ] `sardis projects` commands (from earlier today's work)
- [ ] Bridge: `sardis projects add` → OSP provision + Sardis payment
- [ ] Env sync: `sardis projects env` → OSP env + Sardis vault

### 4.4 Sardis Dashboard
- [ ] OSP project management UI
- [ ] Service catalog browser
- [ ] Credential management (view, rotate, share)
- [ ] Cost dashboard across all provisioned services
- [ ] Team onboarding flow

---

## Phase 5: Launch (Week 10-12)

### 5.1 Pre-Launch (Week 10)
- [ ] Security audit of osp-crypto (Ed25519, x25519, vault encryption)
- [ ] External spec review (2-3 protocol experts)
- [ ] Provider partnership confirmations (at least 2 providers committed)
- [ ] Demo video: agent provisions full stack in 30 seconds
- [ ] Blog post: "Why We Built OSP — The Open Alternative to Stripe Projects"
- [ ] One-pager update with OSP narrative
- [ ] Pitch deck update with OSP demo slide

### 5.2 Launch Day (Week 11)
- [ ] GitHub repos public
- [ ] osp.sh live
- [ ] Show HN post: "OSP — Open protocol for agents to provision developer services"
- [ ] Twitter/X thread with Karpathy quote + demo GIF
- [ ] Reddit posts (r/programming, r/webdev, r/devops, r/rust)
- [ ] Provider partnership announcements (e.g., "Neon supports OSP")
- [ ] YC update email with OSP narrative

### 5.3 Post-Launch (Week 11-12)
- [ ] IETF Internet-Draft submission: draft-durmaz-osp-00
- [ ] W3C AI Agent Protocol Community Group presentation
- [ ] MCP community outreach (propose OSP as MCP extension for provisioning)
- [ ] AP2/x402 community outreach (propose OSP as provisioning layer)
- [ ] Developer outreach: tutorials, integration guides, example projects
- [ ] Community contribution guidelines + first external PRs
- [ ] Respond to feedback, iterate on spec

### 5.4 Sardis Fundraise Alignment
- [ ] Update Sardis pitch: "We built the open standard AND the premium implementation"
- [ ] Update investor one-pager with OSP traction
- [ ] Update litepaper with OSP as protocol extension
- [ ] YC application refresh: "Sardis = Payment OS + OSP standard"

---

## Month 3+ : Growth

### Community
- [ ] First SIP (Service Improvement Proposal) from external contributor
- [ ] 5+ community-contributed provider adapters
- [ ] 1000+ GitHub stars
- [ ] 10+ providers with native OSP support

### Protocol Evolution
- [ ] OSP v1.1 — batch endpoints, provider-to-provider delegation
- [ ] OSP Registry v2 — decentralized (providers can run their own registry)
- [ ] Conformance certification program
- [ ] IETF Working Group formation (if traction supports it)

### Sardis Growth
- [ ] First paying customers (via OSP-provisioned services with Sardis escrow)
- [ ] $50K+ MRR from managed volume
- [ ] Series A readiness

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stripe makes Projects open | High — removes "open vs closed" narrative | OSP already exists and is more comprehensive. Compete on features (escrow, skills, IaC). |
| No providers adopt OSP | Critical — protocol without adoption is dead | Start with adapter model (we wrap their APIs). Graduation to native when volume justifies. |
| Solo founder burnout | High — 3-month sprint is aggressive | Prioritize ruthlessly. Ship MVP first, polish later. Claude Code does 80% of coding. |
| Spec is too complex for v1.0 | Medium — providers may hesitate | Conformance levels solve this. Core = 8 endpoints. Full = everything. |
| Security vulnerability in osp-crypto | Critical — destroys credibility | Use audited crates (ring). Get external review before launch. |
| Domain unavailable | Low — alternative names exist | osp.sh, osp.dev, openserviceprotocol.org — try in order |

---

## Success Metrics

| Metric | Week 4 | Week 8 | Week 12 |
|--------|--------|--------|---------|
| Spec published | ✓ | ✓ | ✓ |
| Rust CLI working | ✓ | ✓ | ✓ |
| Providers integrated | 1 | 4 | 10+ |
| SDK packages published | 0 | 2 (TS+Python) | 4 (all) |
| GitHub stars | 50 | 200 | 1000+ |
| External contributors | 0 | 1 | 5+ |
| Sardis integration live | No | Partial | Full |
| First real provision | ✓ | ✓ | ✓ |
