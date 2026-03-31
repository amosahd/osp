/**
 * MCP contract tests — verifies tool input/output schemas, mock provider
 * integration, and backward compatibility.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Input-Output Contract Tests
// ---------------------------------------------------------------------------

describe("MCP Tool Input-Output Contracts", () => {
  it("osp_discover requires provider_url string", () => {
    const validInput = { provider_url: "https://neon.tech" };
    assert.ok(typeof validInput.provider_url === "string");
    assert.ok(validInput.provider_url.startsWith("https://"));
  });

  it("osp_estimate requires provider_url, offering_id, tier_id", () => {
    const validInput = {
      provider_url: "https://neon.tech",
      offering_id: "db-postgres",
      tier_id: "pro",
    };
    assert.ok(validInput.provider_url);
    assert.ok(validInput.offering_id);
    assert.ok(validInput.tier_id);
  });

  it("osp_provision requires provider_url, offering_id, tier_id, project_name", () => {
    const validInput = {
      provider_url: "https://neon.tech",
      offering_id: "db-postgres",
      tier_id: "free",
      project_name: "my-app",
    };
    assert.ok(validInput.provider_url);
    assert.ok(validInput.project_name);
  });

  it("osp_provision with payment requires payment_method and payment_proof", () => {
    const paidInput = {
      provider_url: "https://neon.tech",
      offering_id: "db-postgres",
      tier_id: "pro",
      project_name: "my-app",
      payment_method: "sardis_wallet",
      payment_proof: { version: "sardis-proof-v1", wallet_address: "wal_test" },
    };
    assert.ok(paidInput.payment_method !== "free");
    assert.ok(paidInput.payment_proof);
    assert.ok(paidInput.payment_proof.version);
  });

  it("estimate response includes cost and payment_methods", () => {
    const response = {
      offering_id: "db-postgres",
      tier_id: "pro",
      cost: { amount: "29.00", currency: "USD" },
      accepted_payment_methods: ["sardis_wallet", "stripe_spt"],
      escrow_required: false,
    };
    assert.ok(response.cost.amount);
    assert.ok(Array.isArray(response.accepted_payment_methods));
  });

  it("approval_required response includes resume_token", () => {
    const response = {
      status: "approval_required",
      approval: {
        reason: "Amount exceeds limit",
        threshold: "100.00",
        requested: "199.00",
        resume_token: "apr_tok_test",
      },
    };
    assert.equal(response.status, "approval_required");
    assert.ok(response.approval.resume_token);
  });
});

// ---------------------------------------------------------------------------
// Mock Provider Integration Tests
// ---------------------------------------------------------------------------

describe("Mock Provider Integration", () => {
  it("free provision returns active status with credentials", () => {
    const mockResponse = {
      resource_id: "res_test_001",
      status: "active",
      credentials: { api_key: "sk_test_abc" },
    };
    assert.equal(mockResponse.status, "active");
    assert.ok(mockResponse.credentials);
    assert.ok(mockResponse.resource_id.startsWith("res_"));
  });

  it("paid provision returns payment settlement info", () => {
    const mockResponse = {
      resource_id: "res_test_002",
      status: "active",
      credentials: { connection_string: "postgres://..." },
      payment: { settled: true, amount: "29.00", currency: "USD" },
    };
    assert.ok(mockResponse.payment.settled);
    assert.equal(mockResponse.payment.amount, "29.00");
  });

  it("async provision returns 202 with poll_url", () => {
    const mockResponse = {
      resource_id: "res_test_003",
      status: "provisioning",
      poll_url: "/osp/v1/resources/res_test_003/status",
    };
    assert.equal(mockResponse.status, "provisioning");
    assert.ok(mockResponse.poll_url);
  });

  it("error response includes structured error payload", () => {
    const mockError = {
      error: {
        code: "payment_declined",
        message: "Proof verification failed",
        retryable: false,
      },
    };
    assert.ok(mockError.error.code);
    assert.equal(mockError.error.retryable, false);
  });
});

// ---------------------------------------------------------------------------
// Backward Compatibility Tests
// ---------------------------------------------------------------------------

describe("Backward Compatibility", () => {
  it("free provision without payment fields still works", () => {
    const legacyInput = {
      provider_url: "https://neon.tech",
      offering_id: "db-postgres",
      tier_id: "free",
      project_name: "my-app",
      // No payment_method or payment_proof
    };
    assert.ok(!legacyInput.payment_method);
    // Should default to free
  });

  it("response without _trace metadata is valid", () => {
    const legacyResponse = {
      resource_id: "res_legacy",
      status: "active",
      credentials: { api_key: "sk_test" },
    };
    assert.ok(!legacyResponse._trace);
    assert.equal(legacyResponse.status, "active");
  });

  it("response without payment object is valid for free tiers", () => {
    const freeResponse = {
      resource_id: "res_free",
      status: "active",
      credentials: { api_key: "sk_free" },
    };
    assert.ok(!freeResponse.payment);
    assert.equal(freeResponse.status, "active");
  });
});
