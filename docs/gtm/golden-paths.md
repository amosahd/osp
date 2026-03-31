# Golden Paths

## MCP Provisioning Path

```
Agent discovers provider via osp_discover
  → Agent estimates cost via osp_estimate
    → Agent provisions via osp_provision (with Sardis proof)
      → Agent receives credentials
        → Agent uses service
```

Complete working example: `examples/mcp-flows/paid-provisioning.md`

## CLI Provisioning Path

```
$ better discover postgres
$ better provision neon/db-postgres --tier pro --payment sardis_wallet
$ better env generate --format nextjs
$ better services status res_abc123
$ better rotate res_abc123
$ better deprovision res_abc123
```

## CI Preview Infrastructure Path

```yaml
# .github/workflows/preview.yml
- uses: better-osp/setup@v1
- uses: better-osp/provision@v1
  with:
    services: neon/db-postgres:free, clerk/auth:free
    environment: preview
- run: better env generate
- run: npm test
# Auto-teardown on PR close
```
