import { describe, it, expect, beforeEach } from "vitest";
import {
  SardisMCPServer,
  SARDIS_TOOLS,
  type MCPToolResult,
} from "../../src/mcp/sardis-mcp-server.js";
import type { SardisWallet } from "../../src/payment/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestWallet(): SardisWallet {
  return {
    wallet_id: "wal_mcp_test",
    label: "MCP Test Wallet",
    owner_id: "user_mcp",
    balance: "1000.00",
    currency: "USD",
    settlement_rails: ["stripe"],
    spending_policies: [
      {
        policy_id: "pol_mcp",
        max_amount_per_tx: "500.00",
        max_amount_per_window: "5000.00",
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

describe("SardisMCPServer", () => {
  let server: SardisMCPServer;

  beforeEach(() => {
    server = new SardisMCPServer({
      wallet: createTestWallet(),
      registryUrl: "https://registry.osp.dev",
    });
  });

  describe("tool definitions", () => {
    it("should expose exactly 9 tools", () => {
      expect(server.tools).toHaveLength(9);
      expect(SARDIS_TOOLS).toHaveLength(9);
    });

    it("should have all required tool names", () => {
      const names = server.tools.map((t) => t.name);
      expect(names).toContain("sardis_discover_services");
      expect(names).toContain("sardis_provision_service");
      expect(names).toContain("sardis_deprovision");
      expect(names).toContain("sardis_rotate_credentials");
      expect(names).toContain("sardis_check_status");
      expect(names).toContain("sardis_get_usage");
      expect(names).toContain("sardis_estimate_cost");
      expect(names).toContain("sardis_list_skills");
      expect(names).toContain("sardis_env_generate");
    });

    it("should have valid schemas for all tools", () => {
      for (const tool of server.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it("sardis_provision_service should have required fields", () => {
      const tool = server.tools.find(
        (t) => t.name === "sardis_provision_service",
      )!;
      expect(tool.inputSchema.required).toContain("provider_url");
      expect(tool.inputSchema.required).toContain("offering_id");
      expect(tool.inputSchema.required).toContain("tier_id");
      expect(tool.inputSchema.required).toContain("project_name");
    });

    it("sardis_deprovision should require confirmation", () => {
      const tool = server.tools.find(
        (t) => t.name === "sardis_deprovision",
      )!;
      expect(tool.inputSchema.required).toContain("confirm");
    });

    it("sardis_env_generate should have format enum", () => {
      const tool = server.tools.find(
        (t) => t.name === "sardis_env_generate",
      )!;
      expect(tool.inputSchema.properties.format.enum).toContain("dotenv");
      expect(tool.inputSchema.properties.format.enum).toContain("json");
      expect(tool.inputSchema.properties.format.enum).toContain("yaml");
      expect(tool.inputSchema.properties.format.enum).toContain("shell");
    });
  });

  describe("handleToolCall", () => {
    it("should return error for unknown tool", async () => {
      const result = await server.handleToolCall("unknown_tool", {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown tool");
    });

    it("sardis_deprovision should reject without confirmation", async () => {
      const result = await server.handleToolCall("sardis_deprovision", {
        provider_url: "https://supabase.com",
        resource_id: "res_abc123",
        confirm: "no",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("confirmation");
    });

    it("sardis_discover_services should handle network errors gracefully", async () => {
      // Registry URL doesn't actually exist in tests — should get a network error
      const result = await server.handleToolCall(
        "sardis_discover_services",
        { category: "database" },
      );

      // Should return an error, not throw
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
    });

    it("sardis_provision_service should handle network errors gracefully", async () => {
      const result = await server.handleToolCall(
        "sardis_provision_service",
        {
          provider_url: "https://nonexistent.example.com",
          offering_id: "test/service",
          tier_id: "free",
          project_name: "test-project",
        },
      );

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it("sardis_check_status should handle network errors gracefully", async () => {
      const result = await server.handleToolCall("sardis_check_status", {
        provider_url: "https://nonexistent.example.com",
        resource_id: "res_abc123",
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });
  });

  describe("tool schema completeness", () => {
    it("sardis_discover_services should support category enum", () => {
      const tool = server.tools.find(
        (t) => t.name === "sardis_discover_services",
      )!;
      const categories = tool.inputSchema.properties.category.enum!;
      expect(categories).toContain("database");
      expect(categories).toContain("hosting");
      expect(categories).toContain("auth");
      expect(categories).toContain("storage");
      expect(categories).toContain("compute");
    });

    it("sardis_env_generate should support framework enum", () => {
      const tool = server.tools.find(
        (t) => t.name === "sardis_env_generate",
      )!;
      const frameworks = tool.inputSchema.properties.framework.enum!;
      expect(frameworks).toContain("nextjs");
      expect(frameworks).toContain("vite");
      expect(frameworks).toContain("generic");
    });
  });
});
