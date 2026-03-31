# GitHub Action Support

## Actions

### better-osp/setup

```yaml
- uses: better-osp/setup@v1
  with:
    version: latest
    sardis-token: ${{ secrets.SARDIS_TOKEN }}
```

### better-osp/provision

```yaml
- uses: better-osp/provision@v1
  with:
    services: |
      neon/db-postgres:free
      clerk/auth:free
    environment: preview
    project: pr-${{ github.event.number }}
```

### better-osp/teardown

```yaml
- uses: better-osp/teardown@v1
  with:
    environment: preview
    project: pr-${{ github.event.number }}
```

## Full PR Preview Workflow

```yaml
name: Preview Environment
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: better-osp/setup@v1
        with:
          sardis-token: ${{ secrets.SARDIS_TOKEN }}
      - uses: better-osp/provision@v1
        id: provision
        with:
          services: |
            neon/db-postgres:free
            clerk/auth:free
          environment: preview
          project: pr-${{ github.event.number }}
      - run: better env generate --format nextjs
      - run: npm run build
      - run: npm test

  cleanup:
    runs-on: ubuntu-latest
    if: github.event.action == 'closed'
    steps:
      - uses: better-osp/setup@v1
      - uses: better-osp/teardown@v1
        with:
          environment: preview
          project: pr-${{ github.event.number }}
```

## Registry-Unified Search

```
better search postgres
# Searches both npm packages AND OSP providers

# Results:
# 📦 pg (npm) — PostgreSQL client
# 📦 prisma (npm) — ORM
# 🔌 neon/db-postgres (OSP) — Managed Postgres
# 🔌 supabase/postgres (OSP) — Supabase Postgres

better search --type osp postgres    # OSP only
better search --type npm postgres    # npm only
```
