import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { provisionWithEscrow } from "../../src/mcp/bridge.js";
import { SardisWalletClient } from "../../src/payment/sardis-wallet.js";
import { EscrowManager } from "../../src/payment/escrow.js";
import type { SardisWallet } from "../../src/payment/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestWallet(): SardisWallet {
  return {
    wallet_id: "wal_bridge_test",
    label: "Bridge Test Wallet",
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

// Mock fetch globally
const originalFetch = globalThis.fetch;

function mockFetch(responses: Record<string, { status: number; body: unknown }>) {
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

    for (const [pattern, response] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.status === 200 ? "OK" : "Error",
          json: async () => response.body,
          text: async () => JSON.stringify(response.body),
          headers: new Headers({ "content-type": "application/json" }),
        } as Response;
      }
    }

    throw new Error(`No mock for URL: ${urlStr}`);
  }) as typeof fetch;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("provisionWithEscrow", () => {
  let walletClient: SardisWalletClient;
  let escrowManager: EscrowManager;

  beforeEach(() => {
    walletClient = new SardisWalletClient(createTestWallet());
    escrowManager = new EscrowManager();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should provision a free tier without mandate or escrow", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 200,
        body: {
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
        },
      },
      "/osp/v1/provision": {
        status: 200,
        body: {
          resource_id: "res_free_001",
          status: "provisioned",
          credentials_bundle: { api_key: "test_key" },
        },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/service",
      tierId: "free",
      projectName: "test-project",
    });

    expect(result.ok).toBe(true);
    expect(result.data!.resource_id).toBe("res_free_001");
    expect(result.data!.mandate_id).toBe("free");
    expect(result.data!.escrow_id).toBeUndefined();
  });

  it("should provision a paid tier with mandate and escrow", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 200,
        body: {
          provider_id: "test-provider",
          offerings: [
            {
              offering_id: "test/service",
              tiers: [
                {
                  tier_id: "pro",
                  price: { amount: "25.00", currency: "USD", interval: "P1M" },
                  escrow_profile: {
                    required: true,
                    release_condition: "provision_success",
                    dispute_window_hours: 72,
                  },
                },
              ],
            },
          ],
          endpoints: { provision: "/osp/v1/provision" },
        },
      },
      "/osp/v1/provision": {
        status: 200,
        body: {
          resource_id: "res_paid_001",
          status: "provisioned",
          credentials_bundle: { connection_string: "postgres://..." },
        },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/service",
      tierId: "pro",
      projectName: "test-project",
    });

    expect(result.ok).toBe(true);
    expect(result.data!.resource_id).toBe("res_paid_001");
    expect(result.data!.mandate_id).toMatch(/^mnd_/);
    expect(result.data!.escrow_id).toMatch(/^esc_/);
    expect(result.data!.escrow_amount).toBe("25.00");
    expect(result.data!.escrow_currency).toBe("USD");
  });

  it("should fail when manifest fetch fails", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 404,
        body: { error: "Not found" },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/service",
      tierId: "pro",
      projectName: "test-project",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("MANIFEST_FETCH_FAILED");
  });

  it("should fail when offering not found", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 200,
        body: {
          provider_id: "test-provider",
          offerings: [],
          endpoints: { provision: "/osp/v1/provision" },
        },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/nonexistent",
      tierId: "pro",
      projectName: "test-project",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("OFFERING_NOT_FOUND");
  });

  it("should fail when tier not found", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 200,
        body: {
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
        },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/service",
      tierId: "enterprise",
      projectName: "test-project",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("TIER_NOT_FOUND");
  });

  it("should fail when provider returns error", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 200,
        body: {
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
        },
      },
      "/osp/v1/provision": {
        status: 400,
        body: { error: "Invalid request", code: "invalid_request" },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/service",
      tierId: "free",
      projectName: "test-project",
    });

    expect(result.ok).toBe(false);
  });

  it("should register escrow in manager after paid provisioning", async () => {
    mockFetch({
      "/.well-known/osp.json": {
        status: 200,
        body: {
          provider_id: "test-provider",
          offerings: [
            {
              offering_id: "test/service",
              tiers: [
                {
                  tier_id: "pro",
                  price: { amount: "25.00", currency: "USD" },
                  escrow_profile: {
                    required: true,
                    release_condition: "provision_success",
                    dispute_window_hours: 72,
                  },
                },
              ],
            },
          ],
          endpoints: { provision: "/osp/v1/provision" },
        },
      },
      "/osp/v1/provision": {
        status: 200,
        body: {
          resource_id: "res_escrow_test",
          status: "provisioned",
        },
      },
    });

    const result = await provisionWithEscrow({
      walletClient,
      escrowManager,
      providerUrl: "https://test-provider.com",
      offeringId: "test/service",
      tierId: "pro",
      projectName: "test-project",
    });

    expect(result.ok).toBe(true);

    // Escrow should be registered in the manager
    const escrow = escrowManager.getByResourceId("res_escrow_test");
    expect(escrow).toBeDefined();
    expect(escrow!.status).toBe("active");
    expect(escrow!.amount).toBe("25.00");
  });
});
