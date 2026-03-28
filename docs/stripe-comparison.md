# Appendix C: Comparison with Stripe Projects

> Extracted from the [OSP v1.0 specification](../spec/osp-v1.0.md) to keep the protocol specification focused on normative content.

The following is an informative (non-normative) comparison of OSP v1.0 with Stripe Projects as publicly described at launch (2026-03-26).

| Dimension | OSP v1.0 | Stripe Projects |
|-----------|----------|-----------------|
| **License** | Apache 2.0, fully open | Proprietary, closed |
| **Access** | Anyone can implement; no approval needed | Invite-only beta; requires Stripe approval |
| **Payment rails** | Agnostic: Sardis, Stripe, x402, MPP, invoice, free, custom | Stripe only (Shared Payment Tokens) |
| **Provider onboarding** | Self-registration via well-known manifest | Must be accepted into Stripe's provider program |
| **Discovery** | Decentralized (well-known URLs) + optional registries | Centralized through Stripe's catalog |
| **Credential delivery** | Ed25519-encrypted or plaintext over TLS | Stripe-managed secret delivery |
| **Agent identity** | Pluggable (TAP, certificates, none) | Stripe-issued agent tokens |
| **Billing** | Provider-submitted usage reports, any payment processor | Stripe-mediated billing, Stripe takes fee |
| **Dispute resolution** | Delegated (Sardis, external) | Stripe-mediated |
| **Protocol evolution** | SIP process, community governance | Stripe product decisions |
| **Vendor lock-in** | None by design | Providers and agents locked to Stripe ecosystem |
| **Offline/self-hosted** | Yes (manifests are static JSON) | No (requires Stripe connectivity) |

**Key philosophical difference:** Stripe Projects is a product built by Stripe to serve Stripe's ecosystem. OSP is a protocol designed to be owned by no one and usable by everyone. A provider can simultaneously support OSP and Stripe Projects; they are not mutually exclusive.
