# OSP Repository — Atomic Commit Plan

**Date:** 2026-03-28
**Goal:** Take all untracked files in the OSP repo and commit them in logical, atomic commits with clear history.

---

## Commit Sequence

### Commit 1: `init: repository scaffolding`
Foundation files that define the project.
```
.gitignore
LICENSE
README.md
CLAUDE.md
CONTRIBUTING.md
```

### Commit 2: `spec: OSP v1.0 core protocol specification`
The main protocol spec — the single most important file.
```
spec/osp-v1.0.md
```

### Commit 3: `schema: JSON Schema definitions for all protocol objects`
Machine-readable schemas for validation.
```
schemas/service-manifest.schema.json
schemas/provision-request.schema.json
schemas/provision-response.schema.json
schemas/credential-bundle.schema.json
schemas/usage-report.schema.json
schemas/webhook-event.schema.json
```

### Commit 4: `examples: provider manifest examples (10 providers)`
Realistic manifest examples for every launch provider.
```
schemas/examples/supabase-manifest.json
schemas/examples/neon-manifest.json
schemas/examples/vercel-manifest.json
schemas/examples/clerk-manifest.json
schemas/examples/upstash-manifest.json
schemas/examples/resend-manifest.json
schemas/examples/cloudflare-manifest.json
schemas/examples/posthog-manifest.json
schemas/examples/turso-manifest.json
schemas/examples/railway-manifest.json
schemas/examples/provision-request-free.json
schemas/examples/provision-request-paid.json
schemas/examples/provision-response-sync.json
schemas/examples/provision-response-async.json
```

### Commit 5: `docs: getting started, provider guide, agent guide`
Documentation for implementors.
```
docs/getting-started.md
docs/for-providers.md
docs/for-agents.md
docs/stripe-comparison.md
docs/provider-integration-guide.md
```

### Commit 6: `ref(python): OSP client + provider SDK with 55 tests`
Python reference implementation.
```
reference-implementation/python/pyproject.toml
reference-implementation/python/src/osp/__init__.py
reference-implementation/python/src/osp/types.py
reference-implementation/python/src/osp/client.py
reference-implementation/python/src/osp/provider.py
reference-implementation/python/src/osp/manifest.py
reference-implementation/python/tests/__init__.py
reference-implementation/python/tests/conftest.py
reference-implementation/python/tests/test_types.py
reference-implementation/python/tests/test_client.py
reference-implementation/python/tests/test_provider.py
reference-implementation/python/examples/example_provider.py
```

### Commit 7: `ref(typescript): OSP client SDK with 32 tests`
TypeScript reference implementation.
```
reference-implementation/typescript/package.json
reference-implementation/typescript/package-lock.json
reference-implementation/typescript/tsconfig.json
reference-implementation/typescript/src/index.ts
reference-implementation/typescript/src/types.ts
reference-implementation/typescript/src/client.ts
reference-implementation/typescript/src/manifest.ts
reference-implementation/typescript/src/crypto.ts
reference-implementation/typescript/tests/client.test.ts
```
