# OSP Pitch Deck — Slide Content

## Slide 1: Title
**Open Service Protocol**
The open standard for AI agents to provision developer services.

## Slide 2: The Shift
- AI agents are becoming autonomous economic actors
- They don't just write code — they architect, deploy, and manage infrastructure
- But they can't sign up for services (browsers, CAPTCHAs, email verification)
- $100B+ of developer services is inaccessible to agents

## Slide 3: The Incumbent Response
**Stripe Projects** (launched March 26, 2026)
- Invite-only provider onboarding
- Stripe-only payment rail
- Proprietary protocol
- Good product. Wrong architecture.

"What if Stripe built HTTP?" — The protocol layer should be open.

## Slide 4: OSP
**One open standard. Any provider. Any agent. Any payment rail.**

Provider publishes `/.well-known/osp.json` → Agent discovers, provisions, receives encrypted credentials → Done.

No gatekeeping. No vendor lock-in. Apache 2.0.

## Slide 5: How It Works (Diagram)
```
Agent → Discovery (/.well-known/osp.json)
     → Provision (POST /osp/v1/provision)
     → Credentials (Ed25519 encrypted)
     → Lifecycle (rotate, upgrade, deprovision)
```
3 commands: discover → provision → env generate

## Slide 6: What's Built
| Component | Status |
|-----------|--------|
| Protocol spec (9,600 lines) | Complete |
| Rust core (8 crates) | Complete, 46 tests |
| TypeScript SDK + MCP tools | Complete, 139 tests |
| Python SDK + FastAPI/Django | Complete, 170 tests |
| Go SDK | Complete, 142 tests |
| 10 provider skills | Complete |
| Sardis payment integration | Complete |
| Website scaffold | Complete |
| CI/CD | Complete |

**497 tests. All passing. All open source.**

## Slide 7: v1.1 — Beyond Basics
What Stripe Projects doesn't do:
1. **A2A delegation** — Agent-to-agent provisioning
2. **Short-lived tokens** — Not static API keys
3. **Budget guardrails** — Agents can spend money. Control it.
4. **Cost-in-PR** — See infra cost before you merge
5. **Dependency graph** — Know what breaks before you deprovision
6. **OpenTelemetry** — Trace every agent action

## Slide 8: Sardis × OSP
- OSP = open protocol (like HTTP)
- Sardis = payment infrastructure (like Stripe)
- OSP is payment-rail agnostic — Sardis is one rail among many
- But Sardis is the founding maintainer and reference implementation
- **OSP adoption = Sardis adoption**

## Slide 9: Go-to-Market
1. **Spec + SDKs** → Open source credibility ✓
2. **Provider outreach** → Neon, Upstash, Turso, Resend first
3. **IETF Internet-Draft** → `draft-durmaz-osp-00` for legitimacy
4. **MCP integration** → Native tools for Claude/GPT agents
5. **Show HN + Twitter** → Developer community awareness
6. **First provider live** → Proof of concept

## Slide 10: Why This Team
- First testers of Stripe Projects — identified the gaps firsthand
- Built the protocol, 4 SDKs, and Rust core
- Sardis: already building agent payment infrastructure
- Deep understanding of both the agent ecosystem and developer tooling

## Slide 11: The Ask
- **Providers:** Implement OSP (4 endpoints + a JSON file)
- **Agent frameworks:** Bundle OSP SDKs
- **Investors:** The protocol layer for the agent economy
- **Community:** Review the spec, contribute, build

## Slide 12: Close
**The agent economy needs open infrastructure.**

GitHub: github.com/EfeDurmaz16/osp
Web: osp.sh

Apache 2.0. No gatekeeping. Let's build it.
