/**
 * Internal ledger for Sardis settlement accounting.
 *
 * Implements a double-entry bookkeeping system where every fund movement
 * (escrow hold, release, refund, charge settlement) produces balanced
 * debit/credit pairs.
 *
 * Account types:
 * - Wallet accounts (agent-owned): wal_*
 * - Escrow accounts (platform-held): esc_*
 * - Provider accounts (settlement destination): prv_*
 * - Revenue accounts (platform fees): rev_*
 */

import type { LedgerEntry, LedgerEntryType, LedgerReferenceType } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A balanced transaction consisting of one or more debit/credit pairs. */
export interface LedgerTransaction {
  transaction_id: string;
  entries: LedgerEntry[];
  description: string;
  created_at: string;
}

/** Summary of an account's current state. */
export interface AccountBalance {
  account_id: string;
  balance: string;
  currency: string;
  total_debits: string;
  total_credits: string;
  entry_count: number;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export class Ledger {
  private readonly transactions: LedgerTransaction[] = [];
  private readonly entries: LedgerEntry[] = [];

  /**
   * Record a balanced transaction (total debits must equal total credits).
   */
  record(params: {
    description: string;
    entries: Array<{
      account_id: string;
      type: LedgerEntryType;
      amount: string;
      currency: string;
      reference_type: LedgerReferenceType;
      reference_id: string;
      description: string;
    }>;
  }): LedgerTransaction {
    const now = new Date().toISOString();
    const transactionId = `txn_${generateId()}`;

    // Validate: debits must equal credits
    let totalDebits = 0;
    let totalCredits = 0;
    for (const e of params.entries) {
      const amt = parseFloat(e.amount);
      if (e.type === "debit") totalDebits += amt;
      else totalCredits += amt;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new Error(
        `Unbalanced transaction: debits=${totalDebits.toFixed(2)} credits=${totalCredits.toFixed(2)}`,
      );
    }

    const entries: LedgerEntry[] = params.entries.map((e) => ({
      entry_id: `led_${generateId()}`,
      transaction_id: transactionId,
      account_id: e.account_id,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      reference_type: e.reference_type,
      reference_id: e.reference_id,
      description: e.description,
      created_at: now,
    }));

    const transaction: LedgerTransaction = {
      transaction_id: transactionId,
      entries,
      description: params.description,
      created_at: now,
    };

    this.transactions.push(transaction);
    this.entries.push(...entries);

    return transaction;
  }

  /**
   * Record an escrow hold: debit the wallet, credit the escrow account.
   */
  recordEscrowHold(params: {
    wallet_id: string;
    escrow_id: string;
    amount: string;
    currency: string;
  }): LedgerTransaction {
    return this.record({
      description: `Escrow hold ${params.escrow_id} from wallet ${params.wallet_id}`,
      entries: [
        {
          account_id: params.wallet_id,
          type: "debit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "escrow_hold",
          reference_id: params.escrow_id,
          description: "Funds held in escrow",
        },
        {
          account_id: params.escrow_id,
          type: "credit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "escrow_hold",
          reference_id: params.escrow_id,
          description: "Escrow account funded",
        },
      ],
    });
  }

  /**
   * Record an escrow release: debit escrow, credit provider.
   */
  recordEscrowRelease(params: {
    escrow_id: string;
    provider_account_id: string;
    amount: string;
    currency: string;
  }): LedgerTransaction {
    return this.record({
      description: `Escrow release ${params.escrow_id} to provider ${params.provider_account_id}`,
      entries: [
        {
          account_id: params.escrow_id,
          type: "debit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "escrow_release",
          reference_id: params.escrow_id,
          description: "Escrow funds released",
        },
        {
          account_id: params.provider_account_id,
          type: "credit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "escrow_release",
          reference_id: params.escrow_id,
          description: "Provider received escrow payment",
        },
      ],
    });
  }

  /**
   * Record an escrow refund: debit escrow, credit wallet.
   */
  recordEscrowRefund(params: {
    escrow_id: string;
    wallet_id: string;
    amount: string;
    currency: string;
  }): LedgerTransaction {
    return this.record({
      description: `Escrow refund ${params.escrow_id} to wallet ${params.wallet_id}`,
      entries: [
        {
          account_id: params.escrow_id,
          type: "debit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "escrow_refund",
          reference_id: params.escrow_id,
          description: "Escrow funds refunded",
        },
        {
          account_id: params.wallet_id,
          type: "credit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "escrow_refund",
          reference_id: params.escrow_id,
          description: "Wallet received escrow refund",
        },
      ],
    });
  }

  /**
   * Record a usage-based charge settlement: debit wallet, credit provider.
   */
  recordChargeSettlement(params: {
    charge_id: string;
    wallet_id: string;
    provider_account_id: string;
    amount: string;
    currency: string;
  }): LedgerTransaction {
    return this.record({
      description: `Charge settlement ${params.charge_id}`,
      entries: [
        {
          account_id: params.wallet_id,
          type: "debit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "charge_settlement",
          reference_id: params.charge_id,
          description: "Usage charge deducted from wallet",
        },
        {
          account_id: params.provider_account_id,
          type: "credit",
          amount: params.amount,
          currency: params.currency,
          reference_type: "charge_settlement",
          reference_id: params.charge_id,
          description: "Provider received usage payment",
        },
      ],
    });
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get all entries for a specific account. */
  getAccountEntries(accountId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.account_id === accountId);
  }

  /** Calculate the current balance for an account. */
  getAccountBalance(accountId: string, currency: string): AccountBalance {
    const accountEntries = this.getAccountEntries(accountId);
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of accountEntries) {
      if (entry.currency !== currency) continue;
      const amt = parseFloat(entry.amount);
      if (entry.type === "debit") totalDebits += amt;
      else totalCredits += amt;
    }

    const balance = totalCredits - totalDebits;

    return {
      account_id: accountId,
      balance: balance.toFixed(2),
      currency,
      total_debits: totalDebits.toFixed(2),
      total_credits: totalCredits.toFixed(2),
      entry_count: accountEntries.length,
    };
  }

  /** Get all transactions, optionally filtered by reference. */
  getTransactions(referenceId?: string): LedgerTransaction[] {
    if (!referenceId) return [...this.transactions];
    return this.transactions.filter((t) =>
      t.entries.some((e) => e.reference_id === referenceId),
    );
  }

  /** Get all entries. */
  getAllEntries(): LedgerEntry[] {
    return [...this.entries];
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
