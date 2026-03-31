/**
 * Paid provisioning helpers for the TypeScript OSP SDK.
 *
 * Provides estimate-first flows, payment proof attachment, and async
 * paid provisioning retry handling.
 */

import type {
  EstimateRequest,
  EstimateResponse,
  PaymentMethod,
  ProvisionRequest,
  ProvisionResponse,
} from "./types.js";

// ---------------------------------------------------------------------------
// Payment Proof
// ---------------------------------------------------------------------------

/** Structured payment proof envelope for Sardis or other rails. */
export interface PaymentProofEnvelope {
  version: string;
  mandate_id: string;
  amount: string;
  currency: string;
  provider_id: string;
  offering_id: string;
  tier_id: string;
  signature: string;
  expires_at: string;
  escrow_id?: string;
  nonce?: string;
}

/** Serialize a proof envelope to the string format expected by ProvisionRequest. */
export function serializePaymentProof(proof: PaymentProofEnvelope): string {
  return JSON.stringify(proof);
}

/** Parse a payment proof string back into a typed envelope. */
export function parsePaymentProof(raw: string): PaymentProofEnvelope {
  const parsed = JSON.parse(raw);
  if (!parsed.version || !parsed.mandate_id || !parsed.signature) {
    throw new Error("Invalid payment proof: missing required fields");
  }
  return parsed as PaymentProofEnvelope;
}

/** Check whether a proof envelope has expired. */
export function isProofExpired(proof: PaymentProofEnvelope): boolean {
  return new Date(proof.expires_at) < new Date();
}

// ---------------------------------------------------------------------------
// Estimate-First Flow
// ---------------------------------------------------------------------------

/** Result of an estimate-first check, enriched with payment decision metadata. */
export interface EstimateDecision {
  estimate: EstimateResponse;
  requiresPayment: boolean;
  requiresEscrow: boolean;
  requiresApproval: boolean;
  suggestedPaymentMethod: PaymentMethod | null;
}

/**
 * Evaluate an estimate response and produce a payment decision.
 *
 * This is the recommended entry point before calling provision() on paid tiers.
 */
export function evaluateEstimate(estimate: EstimateResponse): EstimateDecision {
  const cost = estimate.cost;
  const isFree =
    !cost ||
    cost.amount === "0" ||
    cost.amount === "0.00" ||
    cost.amount === "0.000";

  const methods = estimate.accepted_payment_methods ?? [];
  const escrowRequired = estimate.escrow_required === true;

  // Pick the first non-free method if payment is required
  const suggestedPaymentMethod: PaymentMethod | null = isFree
    ? "free"
    : (methods.find((m: string) => m !== "free") as PaymentMethod) ?? null;

  return {
    estimate,
    requiresPayment: !isFree,
    requiresEscrow: escrowRequired,
    requiresApproval: false, // Approval is determined at provision time
    suggestedPaymentMethod,
  };
}

/**
 * Build a provision request from an estimate decision and payment proof.
 *
 * For free tiers, no proof is needed. For paid tiers, the proof envelope
 * is serialized and attached.
 */
export function buildPaidProvisionRequest(
  decision: EstimateDecision,
  opts: {
    projectName: string;
    nonce: string;
    idempotencyKey: string;
    proof?: PaymentProofEnvelope;
    region?: string;
    config?: Record<string, unknown>;
  },
): ProvisionRequest {
  const request: ProvisionRequest = {
    offering_id: decision.estimate.offering_id,
    tier_id: decision.estimate.tier_id,
    project_name: opts.projectName,
    nonce: opts.nonce,
    idempotency_key: opts.idempotencyKey,
    region: opts.region,
    config: opts.config,
  };

  if (decision.requiresPayment) {
    if (!opts.proof) {
      throw new Error(
        "Payment proof is required for paid tiers. " +
          `Suggested method: ${decision.suggestedPaymentMethod}`,
      );
    }
    if (isProofExpired(opts.proof)) {
      throw new Error("Payment proof has expired — generate a fresh proof");
    }
    request.payment_method =
      decision.suggestedPaymentMethod ?? ("sardis_wallet" as PaymentMethod);
    request.payment_proof = serializePaymentProof(opts.proof);
  } else {
    request.payment_method = "free";
  }

  return request;
}

// ---------------------------------------------------------------------------
// Async Paid Provisioning Retry
// ---------------------------------------------------------------------------

/** Options for async paid provisioning polling. */
export interface AsyncPaidProvisionOptions {
  /** Maximum number of poll attempts (default: 30). */
  maxPolls?: number;
  /** Interval between polls in ms (default: 2000). */
  pollIntervalMs?: number;
  /** Callback invoked on each poll with the current status. */
  onPoll?: (attempt: number, status: string) => void;
}

/**
 * Poll for async paid provisioning completion.
 *
 * When a provider returns 202 Accepted for a paid provision, the agent
 * must poll the status endpoint until the resource becomes active or
 * the operation fails.
 *
 * @param pollFn - Function that fetches the current resource status
 * @param opts - Polling configuration
 * @returns The final provision response when status is "active" or terminal
 */
export async function pollPaidProvision(
  pollFn: () => Promise<ProvisionResponse>,
  opts: AsyncPaidProvisionOptions = {},
): Promise<ProvisionResponse> {
  const maxPolls = opts.maxPolls ?? 30;
  const interval = opts.pollIntervalMs ?? 2000;

  for (let attempt = 1; attempt <= maxPolls; attempt++) {
    const response = await pollFn();

    opts.onPoll?.(attempt, response.status);

    if (response.status === "active") {
      return response;
    }

    if (
      response.status === "failed" ||
      response.status === "deprovisioned" ||
      response.error
    ) {
      throw new PaidProvisionError(
        `Paid provisioning failed: ${response.error?.message ?? response.status}`,
        response,
      );
    }

    if (response.status === "approval_required") {
      throw new ApprovalRequiredError(
        "Provision requires human approval before proceeding",
        response,
      );
    }

    // Still provisioning — wait and retry
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new PaidProvisionError(
    `Paid provisioning timed out after ${maxPolls} polls`,
    null,
  );
}

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

export class PaidProvisionError extends Error {
  constructor(
    message: string,
    public readonly response: ProvisionResponse | null,
  ) {
    super(message);
    this.name = "PaidProvisionError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(
    message: string,
    public readonly response: ProvisionResponse,
  ) {
    super(message);
    this.name = "ApprovalRequiredError";
  }
}
