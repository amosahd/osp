/**
 * Escrow Hold Service — high-level abstraction over EscrowHold lifecycle.
 *
 * Handles:
 * - Escrow hold creation with timeout and dispute metadata
 * - Idempotent hold semantics
 * - Release, refund, and dispute state transitions
 * - Settlement status reconciliation
 */

import type {
  EscrowHold,
  EscrowStatus,
  LedgerEntry,
  LedgerEntryType,
  LedgerReferenceType,
  ReleaseCondition,
  SardisError,
  SardisResult,
  SettlementRail,
  SpendingMandate,
} from "./types.js";

// ---------------------------------------------------------------------------
// Escrow Hold Creation
// ---------------------------------------------------------------------------

export interface CreateEscrowHoldParams {
  mandate_id: string;
  wallet_id: string;
  resource_id: string;
  amount: string;
  currency: string;
  release_condition: ReleaseCondition;
  dispute_window_hours: number;
  timeout_hours?: number;
  settlement_rail?: SettlementRail;
  idempotency_key?: string;
  provider_id?: string;
  offering_id?: string;
}

// ---------------------------------------------------------------------------
// Escrow Service
// ---------------------------------------------------------------------------

export class EscrowService {
  private holds = new Map<string, EscrowHold>();
  private idempotencyIndex = new Map<string, string>();

  /**
   * Create an escrow hold with timeout and dispute metadata.
   *
   * Escrow holds lock funds from a wallet until the release condition
   * is met, the hold times out, or a dispute is filed.
   */
  async createHold(
    params: CreateEscrowHoldParams,
  ): Promise<SardisResult<EscrowHold>> {
    // Idempotent hold creation
    if (params.idempotency_key) {
      const existingId = this.idempotencyIndex.get(params.idempotency_key);
      if (existingId) {
        const existing = this.holds.get(existingId);
        if (existing) {
          return { ok: true, data: existing };
        }
      }
    }

    // Check for duplicate holds on the same resource
    for (const hold of this.holds.values()) {
      if (
        hold.resource_id === params.resource_id &&
        hold.status === "active"
      ) {
        return { ok: true, data: hold };
      }
    }

    const escrow: EscrowHold = {
      escrow_id: `esc_${randomId()}`,
      mandate_id: params.mandate_id,
      wallet_id: params.wallet_id,
      resource_id: params.resource_id,
      amount: params.amount,
      currency: params.currency,
      status: "active",
      release_condition: params.release_condition,
      dispute_window_hours: params.dispute_window_hours,
      created_at: new Date().toISOString(),
      settlement_rail: params.settlement_rail,
    };

    this.holds.set(escrow.escrow_id, escrow);
    if (params.idempotency_key) {
      this.idempotencyIndex.set(params.idempotency_key, escrow.escrow_id);
    }

    return { ok: true, data: escrow };
  }

  /**
   * Release an escrow hold — funds go to the provider.
   *
   * Release requires explicit provider acknowledgement. The release
   * condition must have been met (or overridden by operator action).
   */
  async releaseHold(
    escrowId: string,
    providerAcknowledgement: {
      provider_id: string;
      resource_confirmed_active: boolean;
      settlement_reference?: string;
    },
  ): Promise<SardisResult<EscrowHold>> {
    const hold = this.holds.get(escrowId);
    if (!hold) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (hold.status !== "active") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot release escrow in ${hold.status} state`,
        },
      };
    }

    if (!providerAcknowledgement.resource_confirmed_active) {
      return {
        ok: false,
        error: {
          code: "RELEASE_CONDITION_NOT_MET",
          message: "Provider has not confirmed the resource is active",
        },
      };
    }

    hold.status = "released";
    hold.resolved_at = new Date().toISOString();
    return { ok: true, data: hold };
  }

  /**
   * Refund an escrow hold — funds return to the wallet.
   *
   * Used when provisioning fails or times out.
   */
  async refundHold(
    escrowId: string,
    reason: {
      code: "provision_failed" | "provision_timeout" | "operator_override";
      message: string;
    },
  ): Promise<SardisResult<EscrowHold>> {
    const hold = this.holds.get(escrowId);
    if (!hold) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (hold.status !== "active" && hold.status !== "disputed") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot refund escrow in ${hold.status} state`,
        },
      };
    }

    hold.status = "refunded";
    hold.resolved_at = new Date().toISOString();
    return { ok: true, data: hold };
  }

  /**
   * File a dispute on an active escrow hold.
   */
  async disputeHold(
    escrowId: string,
    dispute: {
      reason: string;
      evidence_urls?: string[];
      dispute_receipt?: string;
    },
  ): Promise<SardisResult<EscrowHold>> {
    const hold = this.holds.get(escrowId);
    if (!hold) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (hold.status !== "active") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot dispute escrow in ${hold.status} state`,
        },
      };
    }

    // Check dispute window
    const createdAt = new Date(hold.created_at);
    const windowEnd = new Date(
      createdAt.getTime() + hold.dispute_window_hours * 3600_000,
    );
    if (new Date() > windowEnd) {
      return {
        ok: false,
        error: {
          code: "DISPUTE_WINDOW_CLOSED",
          message: `Dispute window closed at ${windowEnd.toISOString()}`,
        },
      };
    }

    hold.status = "disputed";
    hold.dispute_receipt = dispute.dispute_receipt;
    return { ok: true, data: hold };
  }

  /** Check for timed-out holds and transition them to expired. */
  expireTimedOutHolds(timeoutHours: number = 24): EscrowHold[] {
    const expired: EscrowHold[] = [];
    const cutoff = new Date(Date.now() - timeoutHours * 3600_000);

    for (const hold of this.holds.values()) {
      if (hold.status === "active" && new Date(hold.created_at) < cutoff) {
        hold.status = "expired";
        hold.resolved_at = new Date().toISOString();
        expired.push(hold);
      }
    }

    return expired;
  }

  /** Get settlement status reconciliation for a hold. */
  getSettlementStatus(escrowId: string): {
    escrow_id: string;
    status: EscrowStatus;
    amount: string;
    currency: string;
    settled: boolean;
    resolution_type?: "released" | "refunded" | "expired" | "disputed";
    resolved_at?: string;
  } | undefined {
    const hold = this.holds.get(escrowId);
    if (!hold) return undefined;

    return {
      escrow_id: hold.escrow_id,
      status: hold.status,
      amount: hold.amount,
      currency: hold.currency,
      settled: hold.status === "released" || hold.status === "refunded",
      resolution_type:
        hold.status !== "active" ? (hold.status as any) : undefined,
      resolved_at: hold.resolved_at,
    };
  }

  /** Retrieve a hold by ID. */
  getHold(escrowId: string): EscrowHold | undefined {
    return this.holds.get(escrowId);
  }

  /** List all holds, optionally filtered by status. */
  listHolds(status?: EscrowStatus): EscrowHold[] {
    const all = Array.from(this.holds.values());
    return status ? all.filter((h) => h.status === status) : all;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
