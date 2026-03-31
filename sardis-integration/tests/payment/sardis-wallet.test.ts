import { describe, it, expect, beforeEach } from "vitest";
import {
  SardisWalletClient,
  verifySardisPaymentProofBinding,
} from "../../src/payment/sardis-wallet.js";
import type { SardisWallet } from "../../src/payment/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestWallet(overrides?: Partial<SardisWallet>): SardisWallet {
  return {
    wallet_id: "wal_test123",
    label: "Test Wallet",
    owner_id: "user_abc",
    balance: "500.00",
    currency: "USD",
    settlement_rails: ["stripe", "internal"],
    spending_policies: [
      {
        policy_id: "pol_default",
        max_amount_per_tx: "100.00",
        max_amount_per_window: "1000.00",
        window_duration: "P30D",
        allowed_categories: [],
        allowed_providers: [],
        requires_approval: false,
      },
    ],
    created_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

const proTier = {
  tier_id: "pro",
  name: "Pro",
  price: { amount: "25.00", currency: "USD", interval: "P1M" },
  escrow_profile: {
    required: true,
    provider: "sardis",
    release_condition: "provision_success" as const,
    dispute_window_hours: 72,
  },
};

const freeTier = {
  tier_id: "free",
  name: "Free",
  price: { amount: "0.00", currency: "USD" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SardisWalletClient", () => {
  let client: SardisWalletClient;

  beforeEach(() => {
    client = new SardisWalletClient(createTestWallet());
  });

  describe("createMandate", () => {
    it("should create a mandate for a valid tier", async () => {
      const result = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.mandate_id).toMatch(/^mnd_/);
      expect(result.data!.offering_id).toBe("supabase/managed-postgres");
      expect(result.data!.tier_id).toBe("pro");
      expect(result.data!.max_amount).toBe("25.00");
      expect(result.data!.currency).toBe("USD");
      expect(result.data!.status).toBe("active");
    });

    it("should reject when amount exceeds per-tx policy limit", async () => {
      const expensiveTier = {
        ...proTier,
        price: { amount: "200.00", currency: "USD" },
      };

      const result = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "enterprise",
        tier: expensiveTier,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("POLICY_VIOLATION");
    });

    it("should reject when balance is insufficient", async () => {
      const poorClient = new SardisWalletClient(
        createTestWallet({ balance: "10.00" }),
      );

      const result = await poorClient.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("INSUFFICIENT_BALANCE");
    });

    it("should reject when policy requires approval", async () => {
      const approvalClient = new SardisWalletClient(
        createTestWallet({
          spending_policies: [
            {
              policy_id: "pol_approval",
              max_amount_per_tx: "100.00",
              max_amount_per_window: "1000.00",
              window_duration: "P30D",
              allowed_categories: [],
              allowed_providers: [],
              requires_approval: true,
            },
          ],
        }),
      );

      const result = await approvalClient.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("APPROVAL_REQUIRED");
    });

    it("should scope mandate with provider and region", async () => {
      const result = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
        provider_id: "supabase",
        region: "us-east-1",
      });

      expect(result.ok).toBe(true);
      expect(result.data!.provider_id).toBe("supabase");
      expect(result.data!.region).toBe("us-east-1");
    });

    it("should set custom TTL on mandate expiry", async () => {
      const result = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
        ttl_hours: 24,
      });

      expect(result.ok).toBe(true);
      const expiresAt = new Date(result.data!.expires_at).getTime();
      const now = Date.now();
      // Should expire roughly 24 hours from now (with some tolerance)
      expect(expiresAt - now).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(expiresAt - now).toBeLessThan(25 * 60 * 60 * 1000);
    });
  });

  describe("toProvisionRequest", () => {
    it("should convert mandate to OSP provision request", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;

      const requestResult = client.toProvisionRequest(mandate, {
        project_name: "my-app-db",
        nonce: "test-nonce-123",
        region: "us-east-1",
      });

      expect(requestResult.ok).toBe(true);
      const request = requestResult.data!;
      expect(request.offering_id).toBe("supabase/managed-postgres");
      expect(request.tier_id).toBe("pro");
      expect(request.project_name).toBe("my-app-db");
      expect(request.payment_method).toBe("sardis_wallet");
      expect(request.payment_proof).toMatchObject({
        version: "sardis-proof-v1",
        wallet_address: "wal_test123",
        payment_tx: mandate.mandate_id,
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        amount: "25.00",
        currency: "USD",
        nonce: "test-nonce-123",
        expires_at: mandate.expires_at,
      });
      expect(request.payment_proof?.signature_material).toBe(
        [
          "sardis-proof-v1",
          "wal_test123",
          mandate.mandate_id,
          "supabase/managed-postgres",
          "pro",
          "25.00",
          "USD",
          "test-nonce-123",
          mandate.expires_at,
          "",
          "us-east-1",
        ].join(":"),
      );
      expect(request.payment_proof).toEqual({
        version: "sardis-proof-v1",
        wallet_address: "wal_test123",
        payment_tx: mandate.mandate_id,
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        amount: "25.00",
        currency: "USD",
        nonce: "test-nonce-123",
        expires_at: mandate.expires_at,
        provider_id: undefined,
        region: "us-east-1",
        signature_material: [
          "sardis-proof-v1",
          "wal_test123",
          mandate.mandate_id,
          "supabase/managed-postgres",
          "pro",
          "25.00",
          "USD",
          "test-nonce-123",
          mandate.expires_at,
          "",
          "us-east-1",
        ].join(":"),
      });
      expect(request.nonce).toBe("test-nonce-123");
      expect(request.region).toBe("us-east-1");
    });

    it("should reject expired mandate", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
        ttl_hours: 0, // Expires immediately
      });
      const mandate = mandateResult.data!;
      // Force expiry
      mandate.expires_at = new Date(Date.now() - 1000).toISOString();

      const requestResult = client.toProvisionRequest(mandate, {
        project_name: "my-app-db",
        nonce: "test-nonce-123",
      });

      expect(requestResult.ok).toBe(false);
      expect(requestResult.error?.code).toBe("MANDATE_EXPIRED");
    });

    it("should reject consumed mandate", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;
      mandate.status = "consumed";

      const requestResult = client.toProvisionRequest(mandate, {
        project_name: "my-app-db",
        nonce: "test-nonce-123",
      });

      expect(requestResult.ok).toBe(false);
      expect(requestResult.error?.code).toBe("MANDATE_NOT_ACTIVE");
    });

    it("should validate proof bindings against the expected context", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
        provider_id: "supabase",
        region: "us-east-1",
      });
      const mandate = mandateResult.data!;

      const requestResult = client.toProvisionRequest(mandate, {
        project_name: "my-app-db",
        nonce: "test-nonce-123",
      });

      expect(requestResult.ok).toBe(true);
      const verification = verifySardisPaymentProofBinding(
        requestResult.data!.payment_proof!,
        {
          wallet_address: "wal_test123",
          payment_tx: mandate.mandate_id,
          provider_id: "supabase",
          offering_id: "supabase/managed-postgres",
          tier_id: "pro",
          amount: "25.00",
          currency: "USD",
          nonce: "test-nonce-123",
          region: "us-east-1",
        },
      );

      expect(verification.ok).toBe(true);
    });

    it("should reject proof reuse across mismatched contexts", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;

      const requestResult = client.toProvisionRequest(mandate, {
        project_name: "my-app-db",
        nonce: "test-nonce-123",
      });

      expect(requestResult.ok).toBe(true);
      const verification = verifySardisPaymentProofBinding(
        requestResult.data!.payment_proof!,
        {
          offering_id: "supabase/managed-postgres",
          tier_id: "enterprise",
          amount: "99.00",
          currency: "USD",
        },
      );

      expect(verification.ok).toBe(false);
      expect(verification.error?.code).toBe("PROOF_BINDING_MISMATCH");
      expect(verification.error?.message).toContain("tier_id");
      expect(verification.error?.message).toContain("amount");
    });
  });

  describe("createEscrowHold", () => {
    it("should create escrow hold after provisioning", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;

      const escrowResult = await client.createEscrowHold(
        mandate,
        "res_test456",
        proTier,
      );

      expect(escrowResult.ok).toBe(true);
      expect(escrowResult.data).toBeDefined();
      expect(escrowResult.data!.escrow_id).toMatch(/^esc_/);
      expect(escrowResult.data!.resource_id).toBe("res_test456");
      expect(escrowResult.data!.amount).toBe("25.00");
      expect(escrowResult.data!.status).toBe("active");
      expect(escrowResult.data!.release_condition).toBe("provision_success");
      expect(escrowResult.data!.dispute_window_hours).toBe(72);

      // Mandate should be consumed
      expect(mandate.status).toBe("consumed");
    });

    it("should reject escrow for non-active mandate", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;
      mandate.status = "revoked";

      const escrowResult = await client.createEscrowHold(
        mandate,
        "res_test456",
        proTier,
      );

      expect(escrowResult.ok).toBe(false);
      expect(escrowResult.error?.code).toBe("MANDATE_NOT_ACTIVE");
    });
  });

  describe("usageToChargeIntent", () => {
    it("should convert usage report to charge intent", async () => {
      const report = {
        report_id: "rpt_test789",
        resource_id: "res_test456",
        period_start: "2026-03-01T00:00:00Z",
        period_end: "2026-04-01T00:00:00Z",
        line_items: [
          {
            dimension_id: "storage_gb",
            description: "Database Storage",
            quantity: "12.5",
            unit: "GB",
            included_quantity: "8",
            billable_quantity: "4.5",
            unit_price: "0.125",
            amount: "0.56",
          },
        ],
        total_amount: "25.56",
        currency: "USD",
      };

      const result = await client.usageToChargeIntent(report);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.charge_id).toMatch(/^chi_/);
      expect(result.data!.resource_id).toBe("res_test456");
      expect(result.data!.report_id).toBe("rpt_test789");
      expect(result.data!.amount).toBe("25.56");
      expect(result.data!.status).toBe("approved");
      expect(result.data!.line_items).toHaveLength(1);
      expect(result.data!.line_items[0].dimension_id).toBe("storage_gb");
    });
  });

  describe("revokeMandate", () => {
    it("should revoke an active mandate", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;

      const revokeResult = client.revokeMandate(mandate.mandate_id);
      expect(revokeResult.ok).toBe(true);
      expect(revokeResult.data!.status).toBe("revoked");
    });

    it("should reject revoking a non-active mandate", async () => {
      const mandateResult = await client.createMandate({
        offering_id: "supabase/managed-postgres",
        tier_id: "pro",
        tier: proTier,
      });
      const mandate = mandateResult.data!;
      mandate.status = "consumed";

      const revokeResult = client.revokeMandate(mandate.mandate_id);
      expect(revokeResult.ok).toBe(false);
      expect(revokeResult.error?.code).toBe("INVALID_STATE");
    });

    it("should return not found for unknown mandate", () => {
      const result = client.revokeMandate("mnd_nonexistent");
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });
});
