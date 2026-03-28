# Next Session Prompt

Copy-paste this to start the next session:

---

~/st-proj-mk

Bu OSP (Open Service Protocol) projesi — AI agent'ların developer servislerini (database, hosting, auth, analytics) discover, provision ve manage etmesi için açık standart. Stripe Projects'in açık alternatifi.

## Mevcut Durum

- **Spec:** `osp/spec/osp-v1.0.md` — 6,264 satır, 14 section, 25+ endpoint, 87 test (55 Python + 32 TS)
- **Repo:** 8 commit, `osp/` directory altında her şey
- **Kararlar:** İsim OSP, domain osp.sh, Rust core implementation, 4 SDK (TS/Python/Go/Rust), Sardis founding maintainer, 3 ay timeline
- **Plan:** `osp/docs/plans/2026-03-28-osp-master-plan-v2.md` — 5 phase, 43 atomic commit, 15 araştırma-bazlı yeni feature

## Sardis İlişkisi

OSP bağımsız protocol, Sardis founding maintainer. Sardis = rail-agnostic agentic payment platform (Stripe → Stripe Projects ilişkisi gibi Sardis → OSP). Sardis Protocol spec: `~/sardis/spec/Sardis_Complete_Protocol_v1.1.pdf` (53 sayfa). Key insight: "Reusable credential is the wrong primitive" — her iki protocol'ün ortak tezi.

## Yapılması Gereken (Phase 0)

Master planı oku: `osp/docs/plans/2026-03-28-osp-master-plan-v2.md`

Sırasıyla:
1. **Spec'e 15 yeni feature ekle** (A2A delegation, NHI lifecycle/short-lived tokens, FinOps cost-as-code, dependency graph, scorecards, agent observability, MCP .well-known alignment, progressive deployment, SBOM, TypeScript IaC config, ephemeral envs, onboarding, unified billing, provider status, provider onboarding SDK)
2. **Cross-validate** spec ↔ schemas ↔ Python types ↔ TS types
3. **10 provider için LLM skills yaz** (Supabase, Neon, Vercel, Clerk, Upstash, Resend, Cloudflare, PostHog, Turso, Railway)
4. **Rust core implementation başlat** (`osp-core/` workspace: osp-crypto, osp-manifest, osp-vault, osp-cli, osp-provider, osp-registry, osp-conformance)

## Kurallar

- Memory'deki `feedback_agent_teams_mandatory.md`'yi oku — paralel görevlerde DAIMA Agent Teams kullan
- Spec kapsamlı kalacak, bölünmeyecek
- Sardis referansları dengeli ama gizlenmeyecek
- Her şey atomic commit'lerle

Başla — önce planı oku, sonra agent team launch et Phase 0 için.
