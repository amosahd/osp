/**
 * Pluggable Persistence Interfaces for sardis-integration.
 *
 * Production implementations should replace the in-memory stores
 * with database-backed persistence.
 */

import type {
  SpendingMandate,
  EscrowHold,
  ChargeIntent,
  LedgerEntry,
} from "./types.js";

// ---------------------------------------------------------------------------
// Persistence Interfaces
// ---------------------------------------------------------------------------

export interface MandateStore {
  save(mandate: SpendingMandate): Promise<void>;
  findById(mandateId: string): Promise<SpendingMandate | null>;
  findByWallet(walletId: string): Promise<SpendingMandate[]>;
  updateStatus(mandateId: string, status: SpendingMandate["status"]): Promise<void>;
}

export interface EscrowStore {
  save(hold: EscrowHold): Promise<void>;
  findById(escrowId: string): Promise<EscrowHold | null>;
  findByResource(resourceId: string): Promise<EscrowHold[]>;
  findByStatus(status: EscrowHold["status"]): Promise<EscrowHold[]>;
  update(hold: EscrowHold): Promise<void>;
}

export interface ChargeStore {
  save(charge: ChargeIntent): Promise<void>;
  findById(chargeId: string): Promise<ChargeIntent | null>;
  findByResource(resourceId: string): Promise<ChargeIntent[]>;
  findPending(): Promise<ChargeIntent[]>;
  updateStatus(chargeId: string, status: ChargeIntent["status"]): Promise<void>;
}

export interface LedgerStore {
  append(entry: LedgerEntry): Promise<void>;
  findByTransaction(txId: string): Promise<LedgerEntry[]>;
  findByAccount(accountId: string): Promise<LedgerEntry[]>;
  findByReference(refType: string, refId: string): Promise<LedgerEntry[]>;
  query(filter: { from?: string; to?: string; limit?: number }): Promise<LedgerEntry[]>;
}

// ---------------------------------------------------------------------------
// In-Memory Implementations (for testing and development)
// ---------------------------------------------------------------------------

export class InMemoryMandateStore implements MandateStore {
  private store = new Map<string, SpendingMandate>();

  async save(mandate: SpendingMandate): Promise<void> {
    this.store.set(mandate.mandate_id, mandate);
  }
  async findById(mandateId: string): Promise<SpendingMandate | null> {
    return this.store.get(mandateId) ?? null;
  }
  async findByWallet(walletId: string): Promise<SpendingMandate[]> {
    return [...this.store.values()].filter((m) => m.wallet_id === walletId);
  }
  async updateStatus(mandateId: string, status: SpendingMandate["status"]): Promise<void> {
    const m = this.store.get(mandateId);
    if (m) m.status = status;
  }
}

export class InMemoryEscrowStore implements EscrowStore {
  private store = new Map<string, EscrowHold>();

  async save(hold: EscrowHold): Promise<void> {
    this.store.set(hold.escrow_id, hold);
  }
  async findById(escrowId: string): Promise<EscrowHold | null> {
    return this.store.get(escrowId) ?? null;
  }
  async findByResource(resourceId: string): Promise<EscrowHold[]> {
    return [...this.store.values()].filter((h) => h.resource_id === resourceId);
  }
  async findByStatus(status: EscrowHold["status"]): Promise<EscrowHold[]> {
    return [...this.store.values()].filter((h) => h.status === status);
  }
  async update(hold: EscrowHold): Promise<void> {
    this.store.set(hold.escrow_id, hold);
  }
}
