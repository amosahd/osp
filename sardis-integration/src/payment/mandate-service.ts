/**
 * Mandate Creation Service — high-level abstraction over SpendingMandate
 * lifecycle for OSP paid provisioning.
 *
 * This service layer wraps SardisWalletClient mandate operations with:
 * - Provider and offering scoping
 * - Budget and trust failure mapping
 * - Idempotent mandate creation
 */

import type {
  EscrowHold,
  MandateStatus,
  SardisError,
  SardisResult,
  SardisWallet,
  SpendingMandate,
  SpendingPolicy,
} from "./types.js";

// ---------------------------------------------------------------------------
// Mandate Creation Abstraction
// ---------------------------------------------------------------------------

/** Parameters for creating a spending mandate. */
export interface CreateMandateParams {
  wallet_id: string;
  provider_id: string;
  offering_id: string;
  tier_id: string;
  amount: string;
  currency: string;
  ttl_hours?: number;
  region?: string;
  idempotency_key?: string;
  metadata?: Record<string, string>;
}

/** Mandate creation result with enriched failure context. */
export interface MandateCreationResult {
  mandate?: SpendingMandate;
  error?: MandateCreationError;
}

export interface MandateCreationError {
  code: MandateErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type MandateErrorCode =
  | "insufficient_balance"
  | "budget_exceeded"
  | "provider_not_allowed"
  | "category_not_allowed"
  | "approval_required"
  | "policy_violation"
  | "duplicate_mandate"
  | "wallet_not_found"
  | "wallet_frozen"
  | "internal_error";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * MandateService encapsulates mandate lifecycle operations with structured
 * error mapping for OSP integration.
 */
export class MandateService {
  private mandates = new Map<string, SpendingMandate>();
  private idempotencyIndex = new Map<string, string>();

  /**
   * Create a spending mandate scoped to a specific provider and offering.
   *
   * Mandates are the atomic unit of spend authorization in Sardis. Each
   * mandate authorizes exactly one provisioning action up to a maximum
   * amount, with a hard expiry.
   */
  async createMandate(
    wallet: SardisWallet,
    params: CreateMandateParams,
  ): Promise<MandateCreationResult> {
    // Idempotency check
    if (params.idempotency_key) {
      const existing = this.idempotencyIndex.get(params.idempotency_key);
      if (existing) {
        const mandate = this.mandates.get(existing);
        if (mandate) {
          return { mandate };
        }
      }
    }

    // Wallet state checks
    if (parseFloat(wallet.balance) <= 0) {
      return {
        error: {
          code: "insufficient_balance",
          message: `Wallet ${wallet.wallet_id} has zero balance`,
          retryable: false,
        },
      };
    }

    // Budget check
    if (parseFloat(params.amount) > parseFloat(wallet.balance)) {
      return {
        error: {
          code: "budget_exceeded",
          message: `Requested ${params.amount} ${params.currency} exceeds wallet balance ${wallet.balance} ${wallet.currency}`,
          retryable: false,
          details: {
            requested: params.amount,
            available: wallet.balance,
            currency: params.currency,
          },
        },
      };
    }

    // Policy evaluation
    const policy = this.findMatchingPolicy(wallet, params);
    if (!policy) {
      return {
        error: {
          code: "policy_violation",
          message: "No spending policy permits this transaction",
          retryable: false,
          details: {
            provider_id: params.provider_id,
            offering_id: params.offering_id,
            amount: params.amount,
          },
        },
      };
    }

    // Provider allowlist check
    if (
      policy.allowed_providers.length > 0 &&
      !policy.allowed_providers.includes(params.provider_id)
    ) {
      return {
        error: {
          code: "provider_not_allowed",
          message: `Provider ${params.provider_id} is not in the allowlist for policy ${policy.policy_id}`,
          retryable: false,
        },
      };
    }

    // Per-tx amount check
    if (parseFloat(params.amount) > parseFloat(policy.max_amount_per_tx)) {
      return {
        error: {
          code: "budget_exceeded",
          message: `Amount ${params.amount} exceeds per-transaction limit ${policy.max_amount_per_tx}`,
          retryable: false,
        },
      };
    }

    // Approval gate
    if (policy.requires_approval) {
      return {
        error: {
          code: "approval_required",
          message: "Transaction requires human approval",
          retryable: false,
          details: { policy_id: policy.policy_id },
        },
      };
    }

    // Create mandate
    const ttlHours = params.ttl_hours ?? 1;
    const mandate: SpendingMandate = {
      mandate_id: `mnd_${randomId()}`,
      wallet_id: wallet.wallet_id,
      offering_id: params.offering_id,
      tier_id: params.tier_id,
      max_amount: params.amount,
      currency: params.currency,
      expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
      status: "active",
      policy_id: policy.policy_id,
      provider_id: params.provider_id,
      region: params.region,
      metadata: params.metadata,
      created_at: new Date().toISOString(),
    };

    this.mandates.set(mandate.mandate_id, mandate);
    if (params.idempotency_key) {
      this.idempotencyIndex.set(params.idempotency_key, mandate.mandate_id);
    }

    return { mandate };
  }

  /** Retrieve a mandate by ID. */
  getMandate(mandateId: string): SpendingMandate | undefined {
    return this.mandates.get(mandateId);
  }

  /** Revoke an active mandate. */
  revokeMandate(mandateId: string): MandateCreationResult {
    const mandate = this.mandates.get(mandateId);
    if (!mandate) {
      return {
        error: {
          code: "wallet_not_found",
          message: `Mandate ${mandateId} not found`,
          retryable: false,
        },
      };
    }
    if (mandate.status !== "active") {
      return {
        error: {
          code: "policy_violation",
          message: `Cannot revoke mandate in ${mandate.status} state`,
          retryable: false,
        },
      };
    }
    mandate.status = "revoked";
    return { mandate };
  }

  /** Mark mandate as consumed after successful provisioning. */
  consumeMandate(mandateId: string): void {
    const mandate = this.mandates.get(mandateId);
    if (mandate && mandate.status === "active") {
      mandate.status = "consumed";
    }
  }

  private findMatchingPolicy(
    wallet: SardisWallet,
    params: CreateMandateParams,
  ): SpendingPolicy | undefined {
    return wallet.spending_policies.find((p) => {
      const amountOk =
        parseFloat(params.amount) <= parseFloat(p.max_amount_per_tx);
      const providerOk =
        p.allowed_providers.length === 0 ||
        p.allowed_providers.includes(params.provider_id);
      return amountOk && providerOk;
    });
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
