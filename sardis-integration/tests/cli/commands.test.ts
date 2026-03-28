import { describe, it, expect, beforeEach, vi } from "vitest";
import { SardisCLI } from "../../src/cli/commands.js";
import { SardisWalletClient } from "../../src/payment/sardis-wallet.js";
import { EscrowManager } from "../../src/payment/escrow.js";
import type { SardisWallet } from "../../src/payment/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestWallet(): SardisWallet {
  return {
    wallet_id: "wal_cli_test",
    label: "CLI Test Wallet",
    owner_id: "user_cli",
    balance: "500.00",
    currency: "USD",
    settlement_rails: ["stripe"],
    spending_policies: [
      {
        policy_id: "pol_cli",
        max_amount_per_tx: "100.00",
        max_amount_per_window: "1000.00",
        window_duration: "P30D",
        allowed_categories: [],
        allowed_providers: [],
        requires_approval: false,
      },
    ],
    created_at: "2026-03-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SardisCLI", () => {
  let cli: SardisCLI;

  beforeEach(() => {
    const wallet = createTestWallet();
    const walletClient = new SardisWalletClient(wallet);
    const escrowManager = new EscrowManager();

    cli = new SardisCLI({
      walletClient,
      escrowManager,
    });
  });

  describe("list", () => {
    it("should return empty list when no projects", async () => {
      const result = await cli.list();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it("should return registered projects", async () => {
      cli.registerProject({
        project_id: "proj_test001",
        name: "test-project",
        resources: [],
        created_at: "2026-03-28T00:00:00Z",
        updated_at: "2026-03-28T00:00:00Z",
      });

      const result = await cli.list();

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe("test-project");
    });
  });

  describe("remove", () => {
    it("should return error for unknown project", async () => {
      const result = await cli.remove({
        project_name: "nonexistent",
        resource_id: "res_abc",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for unknown resource", async () => {
      cli.registerProject({
        project_id: "proj_test001",
        name: "test-project",
        resources: [],
        created_at: "2026-03-28T00:00:00Z",
        updated_at: "2026-03-28T00:00:00Z",
      });

      const result = await cli.remove({
        project_name: "test-project",
        resource_id: "res_nonexistent",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should reject removing already deprovisioned resource", async () => {
      cli.registerProject({
        project_id: "proj_test001",
        name: "test-project",
        resources: [
          {
            resource_id: "res_abc",
            provider_url: "https://test.com",
            offering_id: "test/service",
            tier_id: "free",
            status: "deprovisioned",
            mandate_id: "free",
            provisioned_at: "2026-03-28T00:00:00Z",
          },
        ],
        created_at: "2026-03-28T00:00:00Z",
        updated_at: "2026-03-28T00:00:00Z",
      });

      const result = await cli.remove({
        project_name: "test-project",
        resource_id: "res_abc",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("already deprovisioned");
    });
  });

  describe("status", () => {
    it("should return error for unknown project", async () => {
      const result = await cli.status({ project_name: "nonexistent" });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return status for existing project", async () => {
      cli.registerProject({
        project_id: "proj_test001",
        name: "test-project",
        resources: [
          {
            resource_id: "res_abc",
            provider_url: "https://test.com",
            offering_id: "test/service",
            tier_id: "free",
            status: "deprovisioned",
            mandate_id: "free",
            provisioned_at: "2026-03-28T00:00:00Z",
          },
        ],
        created_at: "2026-03-28T00:00:00Z",
        updated_at: "2026-03-28T00:00:00Z",
      });

      const result = await cli.status({ project_name: "test-project" });

      expect(result.ok).toBe(true);
      expect(result.data!.project_name).toBe("test-project");
      expect(result.data!.total_resources).toBe(1);
      expect(result.data!.active_resources).toBe(0);
      expect(result.data!.wallet.wallet_id).toBe("wal_cli_test");
    });
  });

  describe("getProject", () => {
    it("should return undefined for unknown project", () => {
      expect(cli.getProject("proj_nonexistent")).toBeUndefined();
    });

    it("should return registered project by ID", () => {
      cli.registerProject({
        project_id: "proj_test001",
        name: "test-project",
        resources: [],
        created_at: "2026-03-28T00:00:00Z",
        updated_at: "2026-03-28T00:00:00Z",
      });

      const project = cli.getProject("proj_test001");
      expect(project).toBeDefined();
      expect(project!.name).toBe("test-project");
    });
  });
});
