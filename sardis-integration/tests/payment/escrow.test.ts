import { describe, it, expect, beforeEach, vi } from "vitest";
import { EscrowManager } from "../../src/payment/escrow.js";
import type { EscrowHold, LedgerEntry } from "../../src/payment/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestEscrow(overrides?: Partial<EscrowHold>): EscrowHold {
  return {
    escrow_id: "esc_test001",
    mandate_id: "mnd_test001",
    wallet_id: "wal_test123",
    resource_id: "res_test456",
    amount: "25.00",
    currency: "USD",
    status: "active",
    release_condition: "provision_success",
    dispute_window_hours: 72,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EscrowManager", () => {
  let manager: EscrowManager;
  let ledgerEntries: LedgerEntry[];

  beforeEach(() => {
    ledgerEntries = [];
    manager = new EscrowManager({
      onLedgerEntry: (entry) => ledgerEntries.push(entry),
    });
  });

  describe("register and get", () => {
    it("should register and retrieve an escrow", () => {
      const escrow = createTestEscrow();
      manager.register(escrow);

      expect(manager.get("esc_test001")).toBe(escrow);
    });

    it("should find escrow by resource ID", () => {
      const escrow = createTestEscrow();
      manager.register(escrow);

      expect(manager.getByResourceId("res_test456")).toBe(escrow);
    });

    it("should return undefined for unknown escrow", () => {
      expect(manager.get("esc_nonexistent")).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list all escrows", () => {
      manager.register(createTestEscrow({ escrow_id: "esc_001" }));
      manager.register(
        createTestEscrow({ escrow_id: "esc_002", status: "released" }),
      );
      manager.register(createTestEscrow({ escrow_id: "esc_003" }));

      expect(manager.list()).toHaveLength(3);
    });

    it("should filter by status", () => {
      manager.register(createTestEscrow({ escrow_id: "esc_001" }));
      manager.register(
        createTestEscrow({ escrow_id: "esc_002", status: "released" }),
      );

      expect(manager.list("active")).toHaveLength(1);
      expect(manager.list("released")).toHaveLength(1);
      expect(manager.list("disputed")).toHaveLength(0);
    });
  });

  describe("release", () => {
    it("should release an active escrow", () => {
      const escrow = createTestEscrow();
      manager.register(escrow);

      const result = manager.release("esc_test001");

      expect(result.ok).toBe(true);
      expect(result.data!.status).toBe("released");
      expect(result.data!.resolved_at).toBeDefined();
    });

    it("should emit a debit ledger entry on release", () => {
      manager.register(createTestEscrow());
      manager.release("esc_test001");

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0].type).toBe("debit");
      expect(ledgerEntries[0].reference_type).toBe("escrow_release");
      expect(ledgerEntries[0].amount).toBe("25.00");
    });

    it("should accept a settlement rail", () => {
      manager.register(createTestEscrow());
      const result = manager.release("esc_test001", "stripe");

      expect(result.data!.settlement_rail).toBe("stripe");
    });

    it("should reject releasing a non-active escrow", () => {
      manager.register(createTestEscrow({ status: "released" }));
      const result = manager.release("esc_test001");

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });
  });

  describe("dispute", () => {
    it("should dispute an active escrow", () => {
      manager.register(createTestEscrow());
      const result = manager.dispute("esc_test001", "jwt_dispute_receipt_abc");

      expect(result.ok).toBe(true);
      expect(result.data!.status).toBe("disputed");
      expect(result.data!.dispute_receipt).toBe("jwt_dispute_receipt_abc");
    });

    it("should reject dispute after window expires", () => {
      const oldEscrow = createTestEscrow({
        created_at: new Date(
          Date.now() - 73 * 60 * 60 * 1000,
        ).toISOString(), // 73 hours ago
        dispute_window_hours: 72,
      });
      manager.register(oldEscrow);

      const result = manager.dispute("esc_test001", "jwt_receipt");

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("DISPUTE_WINDOW_EXPIRED");
    });

    it("should reject disputing a non-active escrow", () => {
      manager.register(createTestEscrow({ status: "released" }));
      const result = manager.dispute("esc_test001", "jwt_receipt");

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });
  });

  describe("refund", () => {
    it("should refund an active escrow", () => {
      manager.register(createTestEscrow());
      const result = manager.refund("esc_test001");

      expect(result.ok).toBe(true);
      expect(result.data!.status).toBe("refunded");
    });

    it("should refund a disputed escrow", () => {
      manager.register(createTestEscrow({ status: "disputed" }));
      const result = manager.refund("esc_test001");

      expect(result.ok).toBe(true);
      expect(result.data!.status).toBe("refunded");
    });

    it("should emit a credit ledger entry on refund", () => {
      manager.register(createTestEscrow());
      manager.refund("esc_test001");

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0].type).toBe("credit");
      expect(ledgerEntries[0].reference_type).toBe("escrow_refund");
    });

    it("should reject refunding a released escrow", () => {
      manager.register(createTestEscrow({ status: "released" }));
      const result = manager.refund("esc_test001");

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });
  });

  describe("expire", () => {
    it("should expire an active escrow", () => {
      manager.register(createTestEscrow());
      const result = manager.expire("esc_test001");

      expect(result.ok).toBe(true);
      expect(result.data!.status).toBe("expired");
    });

    it("should emit a credit ledger entry on expiry (refund to wallet)", () => {
      manager.register(createTestEscrow());
      manager.expire("esc_test001");

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0].type).toBe("credit");
      expect(ledgerEntries[0].reference_type).toBe("escrow_refund");
    });
  });

  describe("expireStale", () => {
    it("should expire old active escrows", () => {
      manager.register(
        createTestEscrow({
          escrow_id: "esc_old",
          created_at: new Date(
            Date.now() - 200 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      );
      manager.register(
        createTestEscrow({
          escrow_id: "esc_new",
          created_at: new Date().toISOString(),
        }),
      );

      const expired = manager.expireStale(168); // 7 days

      expect(expired).toHaveLength(1);
      expect(expired[0].escrow_id).toBe("esc_old");
      expect(manager.get("esc_new")!.status).toBe("active");
    });
  });
});
