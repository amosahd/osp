# Provider Onboarding Path

## One-Hour Quickstart

### Step 1: Create your manifest (10 min)

```json
{
  "manifest_id": "your-provider-id",
  "provider_id": "prv_yourcompany",
  "display_name": "Your Company",
  "offerings": [{
    "offering_id": "your-service",
    "name": "Your Service",
    "category": "database",
    "tiers": [
      {"tier_id": "free", "name": "Free", "price": {"amount": "0.00", "currency": "USD"}},
      {"tier_id": "pro", "name": "Pro", "price": {"amount": "29.00", "currency": "USD", "interval": "P1M"}}
    ],
    "credentials_schema": {"api_key": {"type": "string"}}
  }],
  "accepted_payment_methods": ["free", "sardis_wallet"],
  "endpoints": {"provision": "/osp/v1/provision"}
}
```

### Step 2: Sign your manifest (10 min)

Generate Ed25519 keypair, sign canonical JSON, publish at `/.well-known/osp.json`.

### Step 3: Implement provision endpoint (30 min)

```typescript
app.post('/osp/v1/provision', async (req, res) => {
  const { offering_id, tier_id, payment_method, payment_proof } = req.body;

  if (payment_method !== 'free') {
    const verification = verifySardisProof(payment_proof, {
      offering_id, tier_id, amount: '29.00', currency: 'USD'
    });
    if (!verification.valid) {
      return res.status(402).json({ error: { code: 'payment_declined' } });
    }
  }

  const resource = await createResource(offering_id, tier_id);
  res.json({ resource_id: resource.id, status: 'active', credentials: resource.creds });
});
```

### Step 4: Register with OSP registry (10 min)

Submit your manifest URL to the registry for discovery.

## Paid-Core Certification Path

To achieve **paid-core** certification:

1. Implement free and paid provisioning endpoints
2. Verify Sardis payment proofs before resource allocation
3. Return structured errors for payment failures
4. Support idempotent provision requests
5. Pass the paid-core conformance test suite

## Sample Manifests

See `examples/provider-manifests/` for:
- Free-only provider
- Paid provider with Sardis wallet
- Escrow-required provider
- Multi-offering provider
