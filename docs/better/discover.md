# better discover — Command Spec

## Synopsis

```
better discover [query] [--category <cat>] [--keyword <kw>] [--json] [--payment <method>]
```

## Description

Search for OSP service providers by name, category, or keyword. Returns
provider information including offerings, pricing, and payment methods.

## Output Shape (JSON mode)

```json
{
  "results": [
    {
      "provider_id": "prv_neon",
      "display_name": "Neon",
      "domain": "neon.tech",
      "categories": ["database"],
      "offerings": [
        {
          "offering_id": "db-postgres",
          "tiers": ["free", "pro", "enterprise"],
          "payment_methods": ["free", "sardis_wallet", "stripe_spt"]
        }
      ],
      "trust_score": 0.95,
      "verification_status": "verified",
      "conformance_level": "paid-core"
    }
  ],
  "total": 1,
  "query": "postgres"
}
```

## Human-Readable Output

```
  Neon (neon.tech) ✓ verified
  └─ db-postgres: free | pro ($29/mo) | enterprise ($199/mo)
     Payment: free, sardis_wallet, stripe_spt
     Trust: 0.95 | Conformance: paid-core
```

## OSP API Calls

1. `GET /osp/v1/registry/search?q={query}&category={cat}`
2. For each result, optionally fetch `/.well-known/osp.json` for full manifest

## Flags

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `--category` | Filter by service category |
| `--keyword` | Filter by keyword in offering name/description |
| `--payment` | Filter by supported payment method |
| `--limit` | Max results (default: 20) |
