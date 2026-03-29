/**
 * @osp/provider - Express.js middleware for OSP-compliant providers
 *
 * Turn any Express app into an OSP provider in ~20 lines of code.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createOSPProvider } from '@osp/provider';
 *
 * const app = express();
 * const osp = createOSPProvider({
 *   manifest: { ... },
 *   onProvision: async (req) => { ... },
 *   onDeprovision: async (resourceId) => { ... },
 *   onStatus: async (resourceId) => { ... },
 * });
 * app.use('/osp', osp);
 * ```
 *
 * @packageDocumentation
 */

export { createOSPProvider, OSPError } from './middleware';
export { createRateLimiter } from './rate-limiter';
export {
  ProvisionRequestSchema,
  ResourceIdSchema,
  CostSummaryQuerySchema,
  validate,
} from './validation';
export type {
  ValidationResult,
  ValidationError,
} from './validation';
export type {
  // Config
  OSPProviderConfig,
  OSPProviderHandlers,
  RateLimitConfig,
  // Manifest
  ServiceManifest,
  ServiceOffering,
  ServiceTier,
  Price,
  EscrowProfile,
  UsageMetering,
  ProviderEndpoints,
  // Provisioning
  ProvisionRequest,
  ProvisionResponse,
  ProvisionError,
  ProvisionStatus,
  ProvisionErrorCode,
  CredentialBundle,
  FulfillmentProof,
  BudgetConstraint,
  SandboxConfig,
  // Lifecycle
  ResourceStatus,
  UsageReport,
  UsageDimension,
  HealthStatus,
  CostSummary,
  CostSummaryParams,
  // Error
  OSPErrorResponse,
  // Enums
  PaymentMethod,
  Currency,
  ServiceCategory,
  FulfillmentProofType,
  EncryptionMethod,
  CredentialType,
  HealthState,
} from './types';
