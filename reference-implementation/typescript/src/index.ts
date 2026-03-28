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
export type { OSPClientOptions } from "./client.js";

// Types
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
  OSPErrorBody,
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
