import { describe, it, expect, vi } from "vitest";
import { CLIBridge } from "../../src/cli/bridge.js";
import type { SardisWallet } from "../../src/payment/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestWallet(): SardisWallet {
  return {
    wallet_id: "wal_cli_bridge",
    label: "CLI Bridge Test Wallet",
    owner_id: "user_bridge",
    balance: "500.00",
    currency: "USD",
    settlement_rails: ["stripe"],
    spending_policies: [
      {
        policy_id: "pol_bridge",
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

describe("CLIBridge", () => {
  it("should initialize with wallet and options", () => {
    const bridge = new CLIBridge({
      wallet: createTestWallet(),
    });

    expect(bridge).toBeDefined();
    expect(bridge.getCLI()).toBeDefined();
  });

  it("should delegate listProjects to CLI", async () => {
    const bridge = new CLIBridge({
      wallet: createTestWallet(),
    });

    const result = await bridge.listProjects();
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it("should delegate projectStatus to CLI", async () => {
    const bridge = new CLIBridge({
      wallet: createTestWallet(),
    });

    const result = await bridge.projectStatus({
      project_name: "nonexistent",
    });
    expect(result.ok).toBe(false);
  });

  it("should cancel provisioning when user declines confirmation", async () => {
    const bridge = new CLIBridge({
      wallet: createTestWallet(),
      onConfirm: async () => false,
      onProgress: () => {},
    });

    // Mock fetch to return manifest with paid tier
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        provider_id: "test-provider",
        offerings: [
          {
            offering_id: "test/service",
            tiers: [
              {
                tier_id: "pro",
                price: { amount: "25.00", currency: "USD", interval: "P1M" },
                escrow_profile: { required: true },
              },
            ],
          },
        ],
        endpoints: { provision: "/osp/v1/provision" },
      }),
    })) as typeof fetch;

    try {
      const result = await bridge.addService({
        project_name: "test-project",
        provider_url: "https://test-provider.com",
        offering_id: "test/service",
        tier_id: "pro",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("cancelled");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should pass progress messages to callback", async () => {
    const progressMessages: string[] = [];

    const bridge = new CLIBridge({
      wallet: createTestWallet(),
      onProgress: (msg) => progressMessages.push(msg),
    });

    // Mock fetch to return free tier manifest + provision response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

      if (urlStr.includes("osp.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            provider_id: "test-provider",
            offerings: [
              {
                offering_id: "test/service",
                tiers: [
                  {
                    tier_id: "free",
                    price: { amount: "0.00", currency: "USD" },
                  },
                ],
              },
            ],
            endpoints: { provision: "/osp/v1/provision" },
          }),
        } as Response;
      }

      if (urlStr.includes("/osp/v1/provision")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            resource_id: "res_progress_test",
            status: "provisioned",
          }),
        } as Response;
      }

      throw new Error(`Unexpected URL: ${urlStr}`);
    }) as typeof fetch;

    try {
      const result = await bridge.addService({
        project_name: "test-project",
        provider_url: "https://test-provider.com",
        offering_id: "test/service",
        tier_id: "free",
      });

      expect(result.ok).toBe(true);
      expect(progressMessages.length).toBeGreaterThan(0);
      expect(progressMessages.some((m) => m.includes("manifest"))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
