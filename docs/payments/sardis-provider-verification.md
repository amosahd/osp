# Sardis Provider Verification Example

This example shows how an OSP provider can verify a `sardis_wallet`
`payment_proof` before creating a paid resource.

## What To Verify

Providers should reject the request unless all of these bindings match the
commercial context they are about to provision:

- `provider_id`
- `offering_id`
- `tier_id`
- `amount`
- `currency`
- `nonce`
- optional `region`
- proof expiry via `expires_at`

The Sardis envelope also carries `signature_material`, which gives providers
and wallets a deterministic payload to sign or countersign without inventing
their own canonicalization rules.

## TypeScript Example

```ts
import {
  verifySardisPaymentProofBinding,
  type SardisPaymentProof,
} from "@sardis/osp-integration/payment";

function verifyPaidProvisionRequest(input: {
  providerId: string;
  offeringId: string;
  tierId: string;
  amount: string;
  currency: string;
  nonce: string;
  region?: string;
  paymentProof: SardisPaymentProof;
}) {
  if (new Date(input.paymentProof.expires_at) < new Date()) {
    throw new Error("Sardis proof expired");
  }

  const verification = verifySardisPaymentProofBinding(input.paymentProof, {
    provider_id: input.providerId,
    offering_id: input.offeringId,
    tier_id: input.tierId,
    amount: input.amount,
    currency: input.currency,
    nonce: input.nonce,
    region: input.region,
  });

  if (!verification.ok) {
    throw new Error(verification.error?.message ?? "Invalid Sardis proof");
  }
}
```

## Provider Response Pattern

On mismatch, respond with a structured payment error rather than silently
falling back to a different billing path:

```json
{
  "error": {
    "code": "payment_required",
    "message": "Sardis proof binding mismatch for tier 'pro'.",
    "details": {
      "accepted_payment_methods": ["sardis_wallet"]
    },
    "retryable": true
  }
}
```

This keeps the request replay-safe across providers, tiers, and pricing
contexts.
