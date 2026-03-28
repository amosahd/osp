import { describe, it, expect, beforeEach } from "vitest";
import { Ledger } from "../../src/payment/ledger.js";

describe("Ledger", () => {
  let ledger: Ledger;

  beforeEach(() => {
    ledger = new Ledger();
  });

  describe("record", () => {
    it("should record a balanced transaction", () => {
      const txn = ledger.record({
        description: "Test transaction",
        entries: [
          {
            account_id: "wal_abc",
            type: "debit",
            amount: "25.00",
            currency: "USD",
            reference_type: "escrow_hold",
            reference_id: "esc_001",
            description: "Funds held",
          },
          {
            account_id: "esc_001",
            type: "credit",
            amount: "25.00",
            currency: "USD",
            reference_type: "escrow_hold",
            reference_id: "esc_001",
            description: "Escrow funded",
          },
        ],
      });

      expect(txn.transaction_id).toMatch(/^txn_/);
      expect(txn.entries).toHaveLength(2);
      expect(txn.description).toBe("Test transaction");
    });

    it("should throw on unbalanced transaction", () => {
      expect(() =>
        ledger.record({
          description: "Unbalanced",
          entries: [
            {
              account_id: "wal_abc",
              type: "debit",
              amount: "25.00",
              currency: "USD",
              reference_type: "escrow_hold",
              reference_id: "esc_001",
              description: "Debit",
            },
            {
              account_id: "esc_001",
              type: "credit",
              amount: "20.00",
              currency: "USD",
              reference_type: "escrow_hold",
              reference_id: "esc_001",
              description: "Credit",
            },
          ],
        }),
      ).toThrow("Unbalanced transaction");
    });
  });

  describe("recordEscrowHold", () => {
    it("should create debit/credit pair for escrow hold", () => {
      const txn = ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_001",
        amount: "25.00",
        currency: "USD",
      });

      expect(txn.entries).toHaveLength(2);
      expect(txn.entries[0].account_id).toBe("wal_abc");
      expect(txn.entries[0].type).toBe("debit");
      expect(txn.entries[1].account_id).toBe("esc_001");
      expect(txn.entries[1].type).toBe("credit");
    });
  });

  describe("recordEscrowRelease", () => {
    it("should create debit/credit pair for escrow release", () => {
      const txn = ledger.recordEscrowRelease({
        escrow_id: "esc_001",
        provider_account_id: "prv_supabase",
        amount: "25.00",
        currency: "USD",
      });

      expect(txn.entries).toHaveLength(2);
      expect(txn.entries[0].account_id).toBe("esc_001");
      expect(txn.entries[0].type).toBe("debit");
      expect(txn.entries[1].account_id).toBe("prv_supabase");
      expect(txn.entries[1].type).toBe("credit");
    });
  });

  describe("recordEscrowRefund", () => {
    it("should create debit/credit pair for escrow refund", () => {
      const txn = ledger.recordEscrowRefund({
        escrow_id: "esc_001",
        wallet_id: "wal_abc",
        amount: "25.00",
        currency: "USD",
      });

      expect(txn.entries).toHaveLength(2);
      expect(txn.entries[0].account_id).toBe("esc_001");
      expect(txn.entries[0].type).toBe("debit");
      expect(txn.entries[1].account_id).toBe("wal_abc");
      expect(txn.entries[1].type).toBe("credit");
    });
  });

  describe("recordChargeSettlement", () => {
    it("should create debit/credit pair for charge settlement", () => {
      const txn = ledger.recordChargeSettlement({
        charge_id: "chi_001",
        wallet_id: "wal_abc",
        provider_account_id: "prv_supabase",
        amount: "25.56",
        currency: "USD",
      });

      expect(txn.entries).toHaveLength(2);
      expect(txn.entries[0].account_id).toBe("wal_abc");
      expect(txn.entries[0].type).toBe("debit");
      expect(txn.entries[1].account_id).toBe("prv_supabase");
      expect(txn.entries[1].type).toBe("credit");
    });
  });

  describe("getAccountBalance", () => {
    it("should calculate correct balance from entries", () => {
      // Deposit 500 into wallet
      ledger.record({
        description: "Deposit",
        entries: [
          {
            account_id: "external",
            type: "debit",
            amount: "500.00",
            currency: "USD",
            reference_type: "wallet_deposit",
            reference_id: "dep_001",
            description: "External source",
          },
          {
            account_id: "wal_abc",
            type: "credit",
            amount: "500.00",
            currency: "USD",
            reference_type: "wallet_deposit",
            reference_id: "dep_001",
            description: "Wallet funded",
          },
        ],
      });

      // Hold 25 in escrow
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_001",
        amount: "25.00",
        currency: "USD",
      });

      const walletBalance = ledger.getAccountBalance("wal_abc", "USD");
      expect(walletBalance.balance).toBe("475.00");
      expect(walletBalance.total_credits).toBe("500.00");
      expect(walletBalance.total_debits).toBe("25.00");
      expect(walletBalance.entry_count).toBe(2);

      const escrowBalance = ledger.getAccountBalance("esc_001", "USD");
      expect(escrowBalance.balance).toBe("25.00");
    });
  });

  describe("getAccountEntries", () => {
    it("should return entries for a specific account", () => {
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_001",
        amount: "25.00",
        currency: "USD",
      });
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_002",
        amount: "10.00",
        currency: "USD",
      });

      const walletEntries = ledger.getAccountEntries("wal_abc");
      expect(walletEntries).toHaveLength(2);

      const escrow1Entries = ledger.getAccountEntries("esc_001");
      expect(escrow1Entries).toHaveLength(1);
    });
  });

  describe("getTransactions", () => {
    it("should return all transactions", () => {
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_001",
        amount: "25.00",
        currency: "USD",
      });
      ledger.recordEscrowRelease({
        escrow_id: "esc_001",
        provider_account_id: "prv_supabase",
        amount: "25.00",
        currency: "USD",
      });

      expect(ledger.getTransactions()).toHaveLength(2);
    });

    it("should filter transactions by reference", () => {
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_001",
        amount: "25.00",
        currency: "USD",
      });
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_002",
        amount: "10.00",
        currency: "USD",
      });

      const filtered = ledger.getTransactions("esc_001");
      expect(filtered).toHaveLength(1);
    });
  });

  describe("full lifecycle", () => {
    it("should track a complete escrow lifecycle through ledger", () => {
      // 1. Hold funds
      ledger.recordEscrowHold({
        wallet_id: "wal_abc",
        escrow_id: "esc_001",
        amount: "25.00",
        currency: "USD",
      });

      // Wallet debited, escrow credited
      expect(ledger.getAccountBalance("wal_abc", "USD").balance).toBe(
        "-25.00",
      );
      expect(ledger.getAccountBalance("esc_001", "USD").balance).toBe(
        "25.00",
      );

      // 2. Release to provider
      ledger.recordEscrowRelease({
        escrow_id: "esc_001",
        provider_account_id: "prv_supabase",
        amount: "25.00",
        currency: "USD",
      });

      // Escrow debited back to zero, provider credited
      expect(ledger.getAccountBalance("esc_001", "USD").balance).toBe("0.00");
      expect(
        ledger.getAccountBalance("prv_supabase", "USD").balance,
      ).toBe("25.00");

      // Wallet unchanged after release (was already debited on hold)
      expect(ledger.getAccountBalance("wal_abc", "USD").balance).toBe(
        "-25.00",
      );

      // 3. Total entries
      expect(ledger.getAllEntries()).toHaveLength(4);
    });
  });
});
