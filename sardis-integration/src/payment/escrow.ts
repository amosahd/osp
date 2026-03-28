/**
 * Escrow lifecycle management for Sardis + OSP integration.
 *
 * Manages the full escrow lifecycle:
 *   active → released   (service delivered, release condition met)
 *   active → disputed   (agent filed OSP dispute via Section 6.8)
 *   active → expired    (timeout without resolution)
 *   disputed → released (dispute resolved in provider's favor)
 *   disputed → refunded (dispute resolved in agent's favor)
 */

import type {
  EscrowHold,
  EscrowStatus,
  LedgerEntry,
  SardisError,
  SardisResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// EscrowManager
// ---------------------------------------------------------------------------

export class EscrowManager {
  private readonly escrows = new Map<string, EscrowHold>();
  private readonly onLedgerEntry?: (entry: LedgerEntry) => void;

  constructor(options?: { onLedgerEntry?: (entry: LedgerEntry) => void }) {
    this.onLedgerEntry = options?.onLedgerEntry;
  }

  /** Register an escrow hold (typically created by SardisWalletClient). */
  register(escrow: EscrowHold): void {
    this.escrows.set(escrow.escrow_id, escrow);
  }

  /** Get an escrow by ID. */
  get(escrowId: string): EscrowHold | undefined {
    return this.escrows.get(escrowId);
  }

  /** Get an escrow by its OSP resource ID. */
  getByResourceId(resourceId: string): EscrowHold | undefined {
    for (const escrow of this.escrows.values()) {
      if (escrow.resource_id === resourceId) return escrow;
    }
    return undefined;
  }

  /** List all escrows, optionally filtered by status. */
  list(status?: EscrowStatus): EscrowHold[] {
    const all = Array.from(this.escrows.values());
    if (!status) return all;
    return all.filter((e) => e.status === status);
  }

  // -----------------------------------------------------------------------
  // State transitions
  // -----------------------------------------------------------------------

  /**
   * Release escrowed funds to the provider.
   *
   * Called when the release condition is met (e.g., provision_success
   * confirmed, uptime SLA met for required duration).
   */
  release(
    escrowId: string,
    settlementRail?: string,
  ): SardisResult<EscrowHold> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (escrow.status !== "active") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot release escrow in ${escrow.status} state`,
        },
      };
    }

    escrow.status = "released";
    escrow.resolved_at = new Date().toISOString();
    if (settlementRail) {
      escrow.settlement_rail = settlementRail as EscrowHold["settlement_rail"];
    }

    this.emitLedgerEntry({
      entry_id: `led_${generateId()}`,
      transaction_id: `txn_${generateId()}`,
      account_id: escrow.wallet_id,
      type: "debit",
      amount: escrow.amount,
      currency: escrow.currency,
      reference_type: "escrow_release",
      reference_id: escrow.escrow_id,
      description: `Escrow released for resource ${escrow.resource_id}`,
      created_at: escrow.resolved_at,
    });

    return { ok: true, data: escrow };
  }

  /**
   * File a dispute against an escrowed resource.
   *
   * The OSP dispute receipt JWT (from POST /osp/v1/dispute/{resource_id})
   * is attached to the escrow for settlement rail resolution.
   */
  dispute(
    escrowId: string,
    disputeReceipt: string,
  ): SardisResult<EscrowHold> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (escrow.status !== "active") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot dispute escrow in ${escrow.status} state`,
        },
      };
    }

    // Check dispute window
    const createdAt = new Date(escrow.created_at).getTime();
    const windowMs = escrow.dispute_window_hours * 60 * 60 * 1000;
    if (Date.now() > createdAt + windowMs) {
      return {
        ok: false,
        error: {
          code: "DISPUTE_WINDOW_EXPIRED",
          message: `Dispute window of ${escrow.dispute_window_hours}h has expired`,
        },
      };
    }

    escrow.status = "disputed";
    escrow.dispute_receipt = disputeReceipt;

    return { ok: true, data: escrow };
  }

  /**
   * Refund escrowed funds to the agent's wallet.
   *
   * Called when a dispute is resolved in the agent's favor, or when
   * provisioning fails and the provider cannot deliver the service.
   */
  refund(escrowId: string): SardisResult<EscrowHold> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (escrow.status !== "active" && escrow.status !== "disputed") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot refund escrow in ${escrow.status} state`,
        },
      };
    }

    escrow.status = "refunded";
    escrow.resolved_at = new Date().toISOString();

    this.emitLedgerEntry({
      entry_id: `led_${generateId()}`,
      transaction_id: `txn_${generateId()}`,
      account_id: escrow.wallet_id,
      type: "credit",
      amount: escrow.amount,
      currency: escrow.currency,
      reference_type: "escrow_refund",
      reference_id: escrow.escrow_id,
      description: `Escrow refunded for resource ${escrow.resource_id}`,
      created_at: escrow.resolved_at,
    });

    return { ok: true, data: escrow };
  }

  /**
   * Expire an escrow that was not resolved within its timeout.
   *
   * Typically called by a background job. Expired escrows are refunded
   * to the agent's wallet by default.
   */
  expire(escrowId: string): SardisResult<EscrowHold> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Escrow ${escrowId} not found` },
      };
    }

    if (escrow.status !== "active") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot expire escrow in ${escrow.status} state`,
        },
      };
    }

    escrow.status = "expired";
    escrow.resolved_at = new Date().toISOString();

    // Expired escrows are treated as refunds — funds return to wallet.
    this.emitLedgerEntry({
      entry_id: `led_${generateId()}`,
      transaction_id: `txn_${generateId()}`,
      account_id: escrow.wallet_id,
      type: "credit",
      amount: escrow.amount,
      currency: escrow.currency,
      reference_type: "escrow_refund",
      reference_id: escrow.escrow_id,
      description: `Escrow expired for resource ${escrow.resource_id}`,
      created_at: escrow.resolved_at,
    });

    return { ok: true, data: escrow };
  }

  /**
   * Check all active escrows for expiration.
   * Returns the list of escrows that were expired.
   */
  expireStale(maxAgeHours: number = 168): EscrowHold[] {
    const expired: EscrowHold[] = [];
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    for (const escrow of this.escrows.values()) {
      if (
        escrow.status === "active" &&
        new Date(escrow.created_at).getTime() < cutoff
      ) {
        const result = this.expire(escrow.escrow_id);
        if (result.ok && result.data) {
          expired.push(result.data);
        }
      }
    }

    return expired;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private emitLedgerEntry(entry: LedgerEntry): void {
    this.onLedgerEntry?.(entry);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
