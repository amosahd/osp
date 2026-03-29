/**
 * @osp/provider - Zod schemas for validating OSP requests
 *
 * These schemas enforce the OSP v1.0 specification constraints on incoming
 * requests, ensuring providers receive well-formed data.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const PaymentMethodSchema = z.enum([
  'free',
  'sardis_wallet',
  'stripe_spt',
  'x402',
  'mpp',
  'invoice',
  'external',
]);

const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'USDC', 'EURC']);

const BudgetConstraintSchema = z.object({
  max_monthly_cost: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .optional(),
  max_total_cost: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .optional(),
  currency: CurrencySchema.optional(),
  alert_threshold_percent: z.number().int().min(1).max(100).optional(),
});

const SandboxConfigSchema = z.object({
  enabled: z.boolean(),
  ttl_hours: z.number().int().positive().optional(),
  seed_data: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Provision Request
// ---------------------------------------------------------------------------

export const ProvisionRequestSchema = z.object({
  offering_id: z
    .string()
    .regex(
      /^[a-z0-9-]+\/[a-z0-9-]+$/,
      'offering_id must match pattern: provider/service (e.g., "supabase/postgres")'
    ),
  tier_id: z.string().min(1, 'tier_id is required'),
  project_name: z
    .string()
    .min(1, 'project_name is required')
    .max(100, 'project_name must be 100 characters or fewer'),
  region: z.string().optional(),
  payment_method: PaymentMethodSchema.optional(),
  payment_proof: z.string().optional(),
  agent_public_key: z.string().optional(),
  nonce: z.string().min(1, 'nonce is required for replay protection'),
  config: z.record(z.unknown()).optional(),
  webhook_url: z.string().url().optional(),
  delegating_agent_id: z.string().optional(),
  delegation_proof: z.string().optional(),
  nhi_token_mode: z.enum(['static', 'short_lived', 'federated']).optional(),
  budget: BudgetConstraintSchema.optional(),
  ttl_seconds: z.number().int().positive().nullable().optional(),
  trace_context: z.string().optional(),
  sandbox: SandboxConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Resource ID parameter
// ---------------------------------------------------------------------------

export const ResourceIdSchema = z
  .string()
  .min(1, 'resource_id is required');

// ---------------------------------------------------------------------------
// Cost Summary Query
// ---------------------------------------------------------------------------

export const CostSummaryQuerySchema = z.object({
  resource_id: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  errors: Array<{ path: string; message: string }>;
}

/**
 * Validate data against a Zod schema and return a typed result.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return { success: false, errors };
}
