/**
 * Ledger Service — links finance identifiers to OSP resource lifecycle
 * and emits balanced double-entry ledger entries.
 *
 * Every payment action (hold, release, refund, charge) generates a pair
 * of debit/credit entries that are balanced and auditable.
 */

import type {
  LedgerEntry,
  LedgerEntryType,
  LedgerReferenceType,
} from "./types.js";

// ---------------------------------------------------------------------------
// Ledger Transaction
// ---------------------------------------------------------------------------

export interface LedgerTransaction {
  transaction_id: string;
  entries: LedgerEntry[];
  created_at: string;
  metadata?: {
    resource_id?: string;
    provider_id?: string;
    offering_id?: string;
    escrow_id?: string;
    mandate_id?: string;
    charge_id?: string;
  };
}

// ---------------------------------------------------------------------------
// Ledger Filter
// ---------------------------------------------------------------------------

export interface LedgerFilter {
  resource_id?: string;
  provider_id?: string;
  reference_type?: LedgerReferenceType;
  from_date?: string;
  to_date?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class LedgerService {
  private transactions: LedgerTransaction[] = [];
  private entryIndex = new Map<string, LedgerEntry>();

  /**
   * Record an escrow hold — debit wallet, credit escrow.
   */
  recordEscrowHold(params: {
    wallet_id: string;
    escrow_id: string;
    amount: string;
    currency: string;
    resource_id: string;
    provider_id?: string;
    mandate_id?: string;
  }): LedgerTransaction {
    return this.createBalancedTransaction(
      {
        debit_account: params.wallet_id,
        credit_account: `escrow:${params.escrow_id}`,
        amount: params.amount,
        currency: params.currency,
        reference_type: "escrow_hold",
        reference_id: params.escrow_id,
        description: `Escrow hold for resource ${params.resource_id}`,
      },
      {
        resource_id: params.resource_id,
        provider_id: params.provider_id,
        escrow_id: params.escrow_id,
        mandate_id: params.mandate_id,
      },
    );
  }

  /**
   * Record an escrow release — debit escrow, credit provider.
   */
  recordEscrowRelease(params: {
    escrow_id: string;
    provider_id: string;
    amount: string;
    currency: string;
    resource_id: string;
  }): LedgerTransaction {
    return this.createBalancedTransaction(
      {
        debit_account: `escrow:${params.escrow_id}`,
        credit_account: `provider:${params.provider_id}`,
        amount: params.amount,
        currency: params.currency,
        reference_type: "escrow_release",
        reference_id: params.escrow_id,
        description: `Release escrow to provider for resource ${params.resource_id}`,
      },
      {
        resource_id: params.resource_id,
        provider_id: params.provider_id,
        escrow_id: params.escrow_id,
      },
    );
  }

  /**
   * Record an escrow refund — debit escrow, credit wallet.
   */
  recordEscrowRefund(params: {
    wallet_id: string;
    escrow_id: string;
    amount: string;
    currency: string;
    resource_id: string;
  }): LedgerTransaction {
    return this.createBalancedTransaction(
      {
        debit_account: `escrow:${params.escrow_id}`,
        credit_account: params.wallet_id,
        amount: params.amount,
        currency: params.currency,
        reference_type: "escrow_refund",
        reference_id: params.escrow_id,
        description: `Refund escrow for resource ${params.resource_id}`,
      },
      {
        resource_id: params.resource_id,
        escrow_id: params.escrow_id,
      },
    );
  }

  /**
   * Record a usage charge settlement — debit wallet, credit provider.
   */
  recordChargeSettlement(params: {
    wallet_id: string;
    provider_id: string;
    charge_id: string;
    amount: string;
    currency: string;
    resource_id: string;
  }): LedgerTransaction {
    return this.createBalancedTransaction(
      {
        debit_account: params.wallet_id,
        credit_account: `provider:${params.provider_id}`,
        amount: params.amount,
        currency: params.currency,
        reference_type: "charge_settlement",
        reference_id: params.charge_id,
        description: `Usage charge for resource ${params.resource_id}`,
      },
      {
        resource_id: params.resource_id,
        provider_id: params.provider_id,
        charge_id: params.charge_id,
      },
    );
  }

  /**
   * Query ledger entries with filters by resource, provider, or date range.
   */
  query(filter: LedgerFilter): LedgerEntry[] {
    let entries = Array.from(this.entryIndex.values());

    if (filter.resource_id) {
      const txIds = new Set(
        this.transactions
          .filter((t) => t.metadata?.resource_id === filter.resource_id)
          .map((t) => t.transaction_id),
      );
      entries = entries.filter((e) => txIds.has(e.transaction_id));
    }

    if (filter.provider_id) {
      const txIds = new Set(
        this.transactions
          .filter((t) => t.metadata?.provider_id === filter.provider_id)
          .map((t) => t.transaction_id),
      );
      entries = entries.filter((e) => txIds.has(e.transaction_id));
    }

    if (filter.reference_type) {
      entries = entries.filter(
        (e) => e.reference_type === filter.reference_type,
      );
    }

    if (filter.from_date) {
      entries = entries.filter((e) => e.created_at >= filter.from_date!);
    }

    if (filter.to_date) {
      entries = entries.filter((e) => e.created_at <= filter.to_date!);
    }

    return entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  /**
   * Get all transactions for a specific resource.
   */
  getResourceHistory(resourceId: string): LedgerTransaction[] {
    return this.transactions.filter(
      (t) => t.metadata?.resource_id === resourceId,
    );
  }

  /**
   * Verify that all transactions are balanced (debits = credits).
   */
  verifyBalance(): { balanced: boolean; discrepancies: string[] } {
    const discrepancies: string[] = [];

    for (const tx of this.transactions) {
      let totalDebit = 0;
      let totalCredit = 0;
      for (const entry of tx.entries) {
        if (entry.type === "debit") totalDebit += parseFloat(entry.amount);
        if (entry.type === "credit") totalCredit += parseFloat(entry.amount);
      }
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        discrepancies.push(
          `Transaction ${tx.transaction_id}: debit=${totalDebit}, credit=${totalCredit}`,
        );
      }
    }

    return { balanced: discrepancies.length === 0, discrepancies };
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private createBalancedTransaction(
    params: {
      debit_account: string;
      credit_account: string;
      amount: string;
      currency: string;
      reference_type: LedgerReferenceType;
      reference_id: string;
      description: string;
    },
    metadata: LedgerTransaction["metadata"],
  ): LedgerTransaction {
    const txId = `txn_${randomId()}`;
    const now = new Date().toISOString();

    const debit: LedgerEntry = {
      entry_id: `ent_${randomId()}`,
      transaction_id: txId,
      account_id: params.debit_account,
      type: "debit",
      amount: params.amount,
      currency: params.currency,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      description: params.description,
      created_at: now,
    };

    const credit: LedgerEntry = {
      entry_id: `ent_${randomId()}`,
      transaction_id: txId,
      account_id: params.credit_account,
      type: "credit",
      amount: params.amount,
      currency: params.currency,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      description: params.description,
      created_at: now,
    };

    const tx: LedgerTransaction = {
      transaction_id: txId,
      entries: [debit, credit],
      created_at: now,
      metadata,
    };

    this.transactions.push(tx);
    this.entryIndex.set(debit.entry_id, debit);
    this.entryIndex.set(credit.entry_id, credit);

    return tx;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
