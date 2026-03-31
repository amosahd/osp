import test from "node:test";
import assert from "node:assert/strict";

import { createOSPServer } from "../dist/index.js";

const originalFetch = globalThis.fetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler) {
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    return handler(url, init);
  };
}

async function runTool(server, name, args) {
  const tool = server._registeredTools[name];
  assert.ok(tool, `Tool '${name}' should be registered`);
  return server.executeToolHandler(tool, args, {});
}

function makeManifest(providerUrl, overrides = {}) {
  return {
    manifest_id: "mf_test",
    manifest_version: 1,
    previous_version: null,
    provider_id: "test-provider",
    display_name: "Test Provider",
    provider_url: providerUrl,
    offerings: [
      {
        offering_id: "test-provider/postgres",
        name: "Postgres",
        category: "database",
        credentials_schema: {},
        tiers: [
          {
            tier_id: "pro",
            name: "Pro",
            price: { amount: "25.00", currency: "USD", interval: "monthly" },
            accepted_payment_methods: ["sardis_wallet"],
          },
        ],
      },
    ],
    accepted_payment_methods: ["free", "sardis_wallet"],
    endpoints: {
      provision: "/osp/v1/provision",
      estimate: "/osp/v1/estimate",
      deprovision: "/osp/v1/resources/:resource_id",
      credentials: "/osp/v1/resources/:resource_id/credentials",
      status: "/osp/v1/resources/:resource_id/status",
      usage: "/osp/v1/resources/:resource_id/usage",
      health: "/osp/v1/health",
    },
    provider_signature: "sig",
    ...overrides,
  };
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("osp_estimate returns estimate details and accepted payment methods", async () => {
  const providerUrl = "https://estimate-provider.example";
  const manifest = makeManifest(providerUrl);

  mockFetch(async (url, init) => {
    if (url === `${providerUrl}/.well-known/osp.json`) {
      return jsonResponse(manifest);
    }

    if (url === `${providerUrl}/osp/v1/estimate`) {
      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body ?? "{}");
      assert.equal(body.offering_id, "test-provider/postgres");
      assert.equal(body.tier_id, "pro");
      assert.deepEqual(body.estimated_usage, { storage_gb: 25 });

      return jsonResponse({
        offering_id: "test-provider/postgres",
        tier_id: "pro",
        estimate: {
          total_monthly: "31.63",
          total_for_period: "94.89",
          currency: "USD",
          billing_periods: 3,
        },
        comparison_hint: "Slightly more expensive than alternative.",
        valid_until: "2026-04-01T00:00:00Z",
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  });

  const server = createOSPServer();
  const result = await runTool(server, "osp_estimate", {
    provider_url: providerUrl,
    offering_id: "test-provider/postgres",
    tier_id: "pro",
    estimated_usage: { storage_gb: 25 },
    billing_periods: 3,
  });

  assert.equal(result.isError, undefined);
  const payload = JSON.parse(result.content[0].text);
  assert.deepEqual(payload.accepted_payment_methods, ["sardis_wallet"]);
  assert.equal(payload.estimate.total_monthly, "31.63");
  assert.equal(payload.valid_until, "2026-04-01T00:00:00Z");
});

test("osp_provision rejects paid tiers without an explicit payment method", async () => {
  const providerUrl = "https://payment-required-provider.example";
  const manifest = makeManifest(providerUrl);

  mockFetch(async (url) => {
    if (url === `${providerUrl}/.well-known/osp.json`) {
      return jsonResponse(manifest);
    }

    throw new Error(`Unexpected URL ${url}`);
  });

  const server = createOSPServer();
  const result = await runTool(server, "osp_provision", {
    provider_url: providerUrl,
    offering_id: "test-provider/postgres",
    tier_id: "pro",
    project_name: "demo",
  });

  assert.equal(result.isError, true);
  const payload = JSON.parse(result.content[0].text);
  assert.deepEqual(payload.accepted_payment_methods, ["sardis_wallet"]);
  assert.match(payload.error, /explicit payment_method/i);
});

test("osp_provision forwards payment_method and payment_proof for paid tiers", async () => {
  const providerUrl = "https://paid-provider.example";
  const manifest = makeManifest(providerUrl);
  let provisionRequest;

  mockFetch(async (url, init) => {
    if (url === `${providerUrl}/.well-known/osp.json`) {
      return jsonResponse(manifest);
    }

    if (url === `${providerUrl}/osp/v1/provision`) {
      provisionRequest = JSON.parse(init?.body ?? "{}");
      return jsonResponse({
        resource_id: "res_paid_001",
        status: "active",
        cost_estimate: { monthly_estimate: "25.00", currency: "USD" },
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  });

  const server = createOSPServer();
  const result = await runTool(server, "osp_provision", {
    provider_url: providerUrl,
    offering_id: "test-provider/postgres",
    tier_id: "pro",
    project_name: "demo",
    payment_method: "sardis_wallet",
    payment_proof: {
      wallet_address: "wal_123",
      payment_tx: "mnd_123",
    },
  });

  assert.equal(result.isError, undefined);
  assert.equal(provisionRequest.payment_method, "sardis_wallet");
  assert.deepEqual(provisionRequest.payment_proof, {
    wallet_address: "wal_123",
    payment_tx: "mnd_123",
  });

  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.payment_method, "sardis_wallet");
  assert.equal(payload.resource_id, "res_paid_001");
});

test("osp_provision rejects paid tiers without an explicit payment method", async () => {
  const providerUrl = "https://payment-required-provider.example";
  const manifest = makeManifest(providerUrl);

  mockFetch(async (url) => {
    if (url === `${providerUrl}/.well-known/osp.json`) {
      return jsonResponse(manifest);
    }

    throw new Error(`Unexpected URL ${url}`);
  });

  const server = createOSPServer();
  const result = await runTool(server, "osp_provision", {
    provider_url: providerUrl,
    offering_id: "test-provider/postgres",
    tier_id: "pro",
    project_name: "demo",
  });

  assert.equal(result.isError, true);
  const payload = JSON.parse(result.content[0].text);
  assert.deepEqual(payload.accepted_payment_methods, ["sardis_wallet"]);
  assert.match(payload.error, /explicit payment_method/i);
});

test("osp_provision forwards payment_method and payment_proof for paid tiers", async () => {
  const providerUrl = "https://paid-provider.example";
  const manifest = makeManifest(providerUrl);
  let provisionRequest;

  mockFetch(async (url, init) => {
    if (url === `${providerUrl}/.well-known/osp.json`) {
      return jsonResponse(manifest);
    }

    if (url === `${providerUrl}/osp/v1/provision`) {
      provisionRequest = JSON.parse(init?.body ?? "{}");
      return jsonResponse({
        resource_id: "res_paid_001",
        status: "active",
        cost_estimate: { monthly_estimate: "25.00", currency: "USD" },
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  });

  const server = createOSPServer();
  const result = await runTool(server, "osp_provision", {
    provider_url: providerUrl,
    offering_id: "test-provider/postgres",
    tier_id: "pro",
    project_name: "demo",
    payment_method: "sardis_wallet",
    payment_proof: {
      wallet_address: "wal_123",
      payment_tx: "mnd_123",
    },
  });

  assert.equal(result.isError, undefined);
  assert.equal(provisionRequest.payment_method, "sardis_wallet");
  assert.deepEqual(provisionRequest.payment_proof, {
    wallet_address: "wal_123",
    payment_tx: "mnd_123",
  });

  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.payment_method, "sardis_wallet");
  assert.equal(payload.resource_id, "res_paid_001");
});
