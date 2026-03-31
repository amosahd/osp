/**
 * @osp/mcp-server — MCP server for the Open Service Protocol.
 *
 * @example
 * ```ts
 * import { createOSPServer } from "@osp/mcp-server";
 * import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
 *
 * const server = createOSPServer();
 * const transport = new StdioServerTransport();
 * await server.connect(transport);
 * ```
 *
 * @packageDocumentation
 */

export { createOSPServer } from "./server.js";
export type { CreateOSPServerOptions } from "./server.js";

export type {
  ServiceManifest,
  ServiceOffering,
  ServiceTier,
  Price,
  ProviderEndpoints,
  MCPConfig,
  ProvisionRequest,
  ProvisionResponse,
  EstimateRequest,
  EstimateResponse,
  CredentialBundle,
  ResourceStatus,
  UsageReport,
  UsageDimension,
  CostEstimate,
  CostBreakdownItem,
  PaymentMethod,
  ServiceCategory,
  ProvisionStatus,
} from "./types.js";
