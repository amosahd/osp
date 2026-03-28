<div align="center">
  <h1>Open Service Protocol (OSP)</h1>
  <p><strong>An open standard for AI agents to discover, provision, and manage developer services.</strong></p>
  <p>
    <a href="https://osp.dev">Website</a> ·
    <a href="spec/osp-v1.0.md">Specification</a> ·
    <a href="schemas/">JSON Schemas</a> ·
    <a href="docs/getting-started.md">Getting Started</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/version-1.0--draft-blue" alt="Version">
    <img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="License">
    <img src="https://img.shields.io/badge/status-draft-yellow" alt="Status">
  </p>
</div>

---

## The Problem

AI agents are becoming autonomous economic actors — provisioning databases, hosting, auth services, and analytics. But today:

- **Stripe Projects** requires invite-only onboarding and locks providers to Stripe's payment rail
- **Manual signup** means agents break flow to open browsers and click buttons
- **Ad-hoc API wrapping** means every integration is custom, fragile, and non-standard

There is no open standard for how agents discover, provision, and manage developer services.

## The Solution

OSP defines a simple, open protocol:

1. **Providers** publish a `ServiceManifest` at `/.well-known/osp.json`
2. **Agents** discover available services and tiers
3. **Agents** provision resources and receive encrypted credentials
4. **Billing** flows through any payment rail (Sardis, Stripe, x402, MPP, or free)
5. **Credentials** are rotated, upgraded, and deprovisioned via standard endpoints

No gatekeeping. No proprietary protocol. No payment-rail lock-in.

## Quick Example

**Provider publishes** `/.well-known/osp.json`:
```json
{
  "provider_id": "supabase.com",
  "offerings": [{
    "offering_id": "supabase/postgres",
    "name": "Managed PostgreSQL",
    "tiers": [
      { "tier_id": "free", "name": "Free", "price": { "amount": "0", "currency": "USD" } },
      { "tier_id": "pro", "name": "Pro", "price": { "amount": "25", "currency": "USD", "interval": "P1M" } }
    ]
  }]
}
```

**Agent provisions**:
```bash
POST https://api.supabase.com/osp/v1/provision
{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "project_name": "my-agent-app",
  "agent_public_key": "base64url_ed25519_public_key"
}
```

**Provider returns credentials**:
```json
{
  "resource_id": "proj_abc123",
  "status": "provisioned",
  "credentials_bundle": {
    "credentials": {
      "SUPABASE_URL": "https://xyz.supabase.co",
      "SUPABASE_ANON_KEY": "eyJ..."
    }
  }
}
```

## Why OSP?

| | Stripe Projects | OSP |
|---|---|---|
| Provider onboarding | Invite-only | Self-registration |
| Protocol | Proprietary | Open (Apache 2.0) |
| Payment rail | Stripe only | Any (pluggable) |
| Discovery | CLI catalog | `/.well-known/osp.json` |
| Credential security | Proprietary vault | Ed25519 encrypted bundles |

## Repository Structure

```
osp/
├── spec/                          # Protocol specification
│   └── osp-v1.0.md              # Core spec document
├── schemas/                       # JSON Schema definitions
│   ├── service-manifest.schema.json
│   ├── provision-request.schema.json
│   ├── provision-response.schema.json
│   ├── credential-bundle.schema.json
│   ├── usage-report.schema.json
│   └── examples/                  # Example manifests and requests
├── reference-implementation/      # Reference code
│   ├── typescript/               # TypeScript SDK
│   └── python/                   # Python SDK
├── conformance-tests/            # Provider/agent test suite
├── docs/                         # Documentation
│   ├── getting-started.md
│   ├── for-providers.md
│   └── for-agents.md
└── examples/                     # End-to-end examples
```

## Getting Started

- **For Providers**: [How to make your service OSP-compatible](docs/for-providers.md)
- **For Agent Developers**: [How to discover and provision services](docs/for-agents.md)
- **Specification**: [Full protocol spec](spec/osp-v1.0.md)

## Contributing

OSP is developed in the open. We welcome contributions:

- **Protocol changes**: Submit a SIP (Service Improvement Proposal) as a GitHub Discussion
- **New schemas**: Submit a PR to `schemas/`
- **Reference implementations**: Submit a PR to `reference-implementation/`
- **Conformance tests**: Submit a PR to `conformance-tests/`

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## Founding Maintainers

- [Sardis](https://sardis.sh) — Payment OS for the Agent Economy

## License

Apache 2.0 — see [LICENSE](LICENSE)
