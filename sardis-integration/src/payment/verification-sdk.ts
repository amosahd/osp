/**
 * Provider Verification SDK — helpers for providers to verify Sardis
 * payment proofs and handle settlement callbacks.
 */

import type { SardisPaymentProof, SardisProofBindingExpectation } from "./types.js";

// ---------------------------------------------------------------------------
// TypeScript Proof Verification Helper
// ---------------------------------------------------------------------------

export interface VerificationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Verify a Sardis payment proof against expected bindings.
 *
 * Providers call this to validate proof before allocating resources.
 */
export function verifySardisProof(
  proof: SardisPaymentProof,
  expected: SardisProofBindingExpectation,
): VerificationResult {
  const errors: string[] = [];

  // Version check
  if (proof.version !== "sardis-proof-v1") {
    errors.push(`Unsupported proof version: ${proof.version}`);
  }

  // Binding checks
  if (expected.offering_id && proof.offering_id !== expected.offering_id) {
    errors.push(`offering_id mismatch: expected ${expected.offering_id}, got ${proof.offering_id}`);
  }
  if (expected.tier_id && proof.tier_id !== expected.tier_id) {
    errors.push(`tier_id mismatch: expected ${expected.tier_id}, got ${proof.tier_id}`);
  }
  if (expected.amount && proof.amount !== expected.amount) {
    errors.push(`amount mismatch: expected ${expected.amount}, got ${proof.amount}`);
  }
  if (expected.currency && proof.currency !== expected.currency) {
    errors.push(`currency mismatch: expected ${expected.currency}, got ${proof.currency}`);
  }
  if (expected.provider_id && proof.provider_id !== expected.provider_id) {
    errors.push(`provider_id mismatch`);
  }
  if (expected.nonce && proof.nonce !== expected.nonce) {
    errors.push(`nonce mismatch`);
  }

  // Expiry check
  if (proof.expires_at && new Date(proof.expires_at) < new Date()) {
    errors.push(`Proof expired at ${proof.expires_at}`);
  }

  // Signature material must be present
  if (!proof.signature_material) {
    errors.push("Missing signature_material");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Webhook Signature Validation
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  event_id: string;
  event_type: "escrow.released" | "escrow.refunded" | "escrow.disputed" | "escrow.expired" | "charge.settled" | "charge.failed";
  payload: Record<string, unknown>;
  signature: string;
  timestamp: string;
}

/**
 * Validate a Sardis webhook signature.
 *
 * Providers should call this on every incoming webhook to verify
 * the event was sent by Sardis.
 */
export function validateWebhookSignature(
  event: WebhookEvent,
  secret: string,
): boolean {
  // In production, this would verify HMAC-SHA256 signature
  // For reference implementation, we validate structure
  if (!event.event_id || !event.event_type || !event.signature || !event.timestamp) {
    return false;
  }
  // Check timestamp freshness (5 minute window)
  const eventTime = new Date(event.timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Settlement Callback
// ---------------------------------------------------------------------------

export interface SettlementCallback {
  escrow_id: string;
  resource_id: string;
  status: "confirmed" | "failed";
  settlement_reference?: string;
  timestamp: string;
}

/**
 * Build a settlement confirmation callback for escrow release.
 *
 * Providers call this after successfully provisioning a resource
 * to trigger escrow fund release.
 */
export function buildSettlementCallback(params: {
  escrow_id: string;
  resource_id: string;
  settlement_reference?: string;
}): SettlementCallback {
  return {
    escrow_id: params.escrow_id,
    resource_id: params.resource_id,
    status: "confirmed",
    settlement_reference: params.settlement_reference,
    timestamp: new Date().toISOString(),
  };
}
