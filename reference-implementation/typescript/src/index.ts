/**
 * @osp/client — OSP (Open Service Protocol) client SDK for TypeScript.
 *
 * @example
 * ```ts
 * import { OSPClient } from "@osp/client";
 *
 * const osp = new OSPClient();
 * const manifest = await osp.discover("https://supabase.com");
 * console.log(manifest.offerings);
 * ```
 *
 * @packageDocumentation
 */

// Client
export { OSPClient, OSPError } from "./client.js";
export type { OSPClientOptions, RetryOptions } from "./client.js";

// Types — core
export type {
  ServiceManifest,
  ServiceOffering,
  ServiceTier,
  Price,
  EscrowProfile,
  UsageMetering,
  ProviderEndpoints,
  ProvisionRequest,
  ProvisionResponse,
  ProvisionError,
  FulfillmentProof,
  CredentialBundle,
  ResourceStatus,
  UsageReport,
  UsageDimension,
  HealthStatus,
  Currency,
  PaymentMethod,
  TrustTier,
  ServiceCategory,
  FulfillmentProofType,
  ProvisionStatus,
  ProvisionErrorCode,
  EncryptionMethod,
  CredentialType,
  OSPErrorBody,
} from "./types.js";

// Types — v1.1
export type {
  A2AAgentCard,
  A2ACapability,
  NHIConfig,
  NHIToken,
  NHITokenType,
  NHITokenMode,
  NHIFederationType,
  FinOpsConfig,
  BudgetConstraint,
  BudgetStatus,
  BurnRate,
  DependencyGraph,
  Scorecards,
  ComplianceFramework,
  ObservabilityConfig,
  TracePropagationFormat,
  MCPConfig,
  CanaryConfig,
  CanaryStrategy,
  CostEstimate,
  CostBreakdownItem,
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  CredentialBundleRef,
  WebhookEventError,
  ResourceWarning,
  WarningType,
  UsageThresholdData,
  PaymentDetails,
  BudgetAlert,
  NHIEvent,
  DependencyEvent,
  TTLEvent,
} from "./types.js";

// Types — v1.2
export type {
  AgentIdentity,
  ManifestIdentity,
  CostSummary,
  CostResource,
  HealthResponse,
  HealthCheck,
} from "./types.js";

// Manifest utilities
export {
  fetchManifest,
  verifyManifestSignature,
  findOffering,
  findTier,
  WELL_KNOWN_PATH,
} from "./manifest.js";

// Crypto utilities
export {
  verifyEd25519,
  canonicalJson,
  decryptCredentials,
  generateAgentKeyPair,
  exportKeyBase64url,
  base64urlDecode,
  base64urlEncode,
} from "./crypto.js";

// Resolver
export {
  OSPResolver,
  parseOSPUri,
  buildOSPUri,
  isOSPUri,
} from "./resolver.js";
export type { ParsedOSPUri, ResolverOptions } from "./resolver.js";

// MCP Server
export {
  OSPMCPHandler,
  createOSPMCPHandler,
  OSP_TOOL_DEFINITIONS,
} from "./mcp-server.js";
export type { MCPToolDefinition, MCPToolResult } from "./mcp-server.js";
