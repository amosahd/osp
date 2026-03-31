# Paid Provisioning with Mandate and Escrow

## Flow

1. `better provision neon/db-postgres --tier pro --payment sardis_wallet`
2. CLI creates Sardis mandate (scoped to provider + offering + tier)
3. If escrow required: create escrow hold
4. Attach payment proof to OSP provision request
5. On success: store credentials + payment metadata in vault
6. On failure: auto-refund escrow if applicable

## Multi-Environment Scoping

Vault entries are namespaced by environment:

```
better env switch staging
better provision neon/db-postgres --tier pro
# → stored under "staging" namespace

better env switch production
better provision neon/db-postgres --tier enterprise
# → stored under "production" namespace

better env list
# dev | staging | production

better env clone staging production
# Clone staging config to production
```

## Preview Environment Workflow

```
better preview create --ttl 2h
# → provisions ephemeral services for all project dependencies
# → generates preview .env
# → outputs preview URL

better preview status
# → shows TTL remaining, resource statuses

better preview teardown
# → deprovisions all ephemeral services
```

### TTL Teardown

- Default TTL: 2 hours
- Automatic teardown via scheduled job
- Grace period warning at 15 minutes remaining
- Manual extension with `better preview extend --ttl 2h`
