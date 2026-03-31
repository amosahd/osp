# Demo Scripts

## Demo 1: Free Provisioning (2 min)

```bash
# Show discovery
better discover postgres

# Provision free tier
better provision neon/db-postgres --tier free --project demo-app

# Show credentials in vault
better services list

# Generate .env
better env generate --format nextjs
cat .env.local
```

**Key message**: "From discovery to working credentials in 30 seconds."

## Demo 2: Paid Provisioning with Approval + Escrow (3 min)

```bash
# Estimate cost
better provision neon/db-postgres --tier pro --project demo-pro --dry-run

# Provision with Sardis payment
better provision neon/db-postgres --tier pro --project demo-pro --payment sardis_wallet
# → Shows cost, asks for confirmation
# → Creates mandate, attaches proof
# → Provisions with escrow

# Show payment metadata
better services status res_abc123 --json | jq '.payment, .escrow'
```

**Key message**: "Paid provisioning with spend controls and escrow — not uncontrolled agent spending."

## Demo 3: Preview Environment (3 min)

```bash
# Create PR preview with real infrastructure
better preview create --services "neon/db-postgres:free,clerk/auth:free" --ttl 2h

# Show what was provisioned
better preview status

# Generate env for the preview
better env generate

# Teardown
better preview teardown
```

**Key message**: "Real infrastructure for every PR, automatic cleanup."
