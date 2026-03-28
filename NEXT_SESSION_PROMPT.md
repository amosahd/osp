# Next Session Prompt

Copy-paste this to start the next session:

---

~/osp

Bu OSP (Open Service Protocol) projesi — AI agent'ların developer servislerini (database, hosting, auth, analytics) discover, provision ve manage etmesi için açık standart. Stripe Projects'in açık alternatifi.

## Mevcut Durum (Güncel)

- **Repo:** `~/osp/` — GitHub'da: https://github.com/EfeDurmaz16/osp
- **Spec:** `spec/osp-v1.0.md` — ~9,660 satır, v1.1 draft, 15 yeni feature eklendi
- **Schemas:** `schemas/` — 6 JSON Schema + 14 provider manifest örneği (v1.1 fields ile güncellendi)
- **Rust Core:** `osp-core/` — 8 crate Cargo workspace (crypto, manifest, vault, cli, provider, registry, conformance, sdk) — 46 test, hepsi geçiyor
- **TypeScript SDK:** `reference-implementation/typescript/` — v0.2.0, MCP server (5 tool), resolver, Next.js/Vite plugins — 139 test
- **Python SDK:** `reference-implementation/python/` — v0.2.0, async client, FastAPI/Django integrations — 170 test
- **Go SDK:** `osp-sdk-go/` — Full client + provider + crypto — 142 test
- **Sardis Integration:** `sardis-integration/` — Payment rail, MCP extension (9 tool), CLI bridge — 79 test
- **Skills:** `skills/` — 10 provider LLM skill (Supabase, Neon, Vercel, Clerk, Upstash, Resend, Cloudflare, PostHog, Turso, Railway)
- **Website:** `website/` — Next.js + Tailwind scaffold (landing, spec viewer, provider directory, skill browser)
- **CI/CD:** `.github/workflows/` — Schema validation, Python/TS/Rust test runners, deploy
- **Conformance Tests:** `conformance-tests/python/` — Provider + agent conformance suites
- **Examples:** `examples/` — nextjs-supabase-clerk, python-neon-resend
- **Launch Materials:** `docs/launch/` — Show HN, Twitter thread, provider outreach emails, pitch deck outline
- **IETF Draft:** `docs/ietf/draft-durmaz-osp-00.md` — Internet-Draft skeleton
- **Toplam:** 58+ atomic commit, 497+ test (tümü geçiyor)

## Sardis İlişkisi

OSP bağımsız protocol, Sardis founding maintainer. Sardis = rail-agnostic agentic payment platform. OSP adoption = Sardis adoption.

## Yapılması Gereken (Launch)

1. **Provider outreach** — Neon, Upstash, Turso, Resend'e mail at (`docs/launch/provider-outreach-email.md`)
2. **osp.sh domain** al
3. **Website deploy** — Vercel'e deploy et
4. **Demo video** çek (script: `docs/demo-script.md`)
5. **Show HN** post at (`docs/launch/show-hn.md`)
6. **Twitter thread** at (`docs/launch/twitter-thread.md`)
7. **IETF Internet-Draft** submit et
8. **Security audit** başlat (`docs/security-audit-checklist.md`)
9. `open-service-protocol` GitHub org kur, repoyu transfer et (opsiyonel)

## Kurallar

- Agent Teams kullan paralel görevlerde (CLAUDE.md'de zorunlu)
- Her şey atomic commit'lerle
- Spec kapsamlı kalacak, bölünmeyecek
