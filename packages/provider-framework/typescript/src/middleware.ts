/**
 * @osp/provider - Express.js middleware factory
 *
 * Creates an Express Router that implements all OSP provider endpoints:
 *   - GET  /.well-known/osp.json          (manifest discovery)
 *   - POST /v1/provision                   (provision a resource)
 *   - DELETE /v1/deprovision/:resource_id  (deprovision a resource)
 *   - GET  /v1/status/:resource_id         (resource status)
 *   - POST /v1/rotate/:resource_id         (credential rotation)
 *   - GET  /v1/usage/:resource_id          (usage report)
 *   - GET  /v1/health                      (provider health)
 *   - GET  /v1/cost-summary                (cost summary)
 *
 * Usage:
 *   const osp = createOSPProvider({ manifest, onProvision, ... })
 *   app.use('/osp', osp)
 *
 * This will make the manifest available at /osp/.well-known/osp.json,
 * and all lifecycle endpoints under /osp/v1/*.
 */

import { Router, json } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type {
  OSPProviderConfig,
  OSPErrorResponse,
  ProvisionResponse,
  HealthStatus,
} from './types';
import {
  ProvisionRequestSchema,
  ResourceIdSchema,
  CostSummaryQuerySchema,
  validate,
} from './validation';
import { createRateLimiter } from './rate-limiter';

/**
 * Create an Express Router that serves all OSP provider endpoints.
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
 * app.listen(3000);
 * ```
 */
export function createOSPProvider(config: OSPProviderConfig): Router {
  const router = Router();
  const logging = config.logging !== false;

  // Parse JSON bodies
  router.use(json());

  // Rate limiting (OSP spec Section 8.6)
  const rateLimiter = createRateLimiter({
    windowMs: config.rateLimit?.windowMs ?? 60_000,
    maxRequests: config.rateLimit?.maxRequests ?? 60,
  });
  router.use(rateLimiter);

  // Add X-OSP-Version header to all responses (OSP spec Section 9.1)
  router.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-OSP-Version', config.manifest.osp_spec_version || '1.0');
    next();
  });

  // Request logging middleware
  if (logging) {
    router.use((req: Request, _res: Response, next: NextFunction) => {
      const resourceId =
        req.params.resource_id || (req.body as Record<string, unknown>)?.resource_id || '-';
      console.log(
        `[osp] ${new Date().toISOString()} ${req.method} ${req.originalUrl} resource_id=${resourceId}`
      );
      next();
    });
  }

  // -----------------------------------------------------------------------
  // GET /.well-known/osp.json - Manifest discovery
  // -----------------------------------------------------------------------
  router.get('/.well-known/osp.json', (_req: Request, res: Response) => {
    res.json(config.manifest);
  });

  // -----------------------------------------------------------------------
  // POST /v1/provision - Provision a resource
  // -----------------------------------------------------------------------
  router.post(
    '/v1/provision',
    async (req: Request, res: Response) => {
      const result = validate(ProvisionRequestSchema, req.body);

      if (!result.success) {
        return sendError(res, 400, 'invalid_request', 'Request validation failed', {
          validation_errors: result.errors,
        });
      }

      try {
        const response = await config.onProvision(result.data);

        // Return 202 for async provisioning, 200 for sync
        const statusCode = response.status === 'provisioning' ? 202 : 200;
        return res.status(statusCode).json(response);
      } catch (err) {
        return handleProviderError(res, err, 'provision');
      }
    }
  );

  // -----------------------------------------------------------------------
  // DELETE /v1/deprovision/:resource_id - Deprovision a resource
  // -----------------------------------------------------------------------
  router.delete(
    '/v1/deprovision/:resource_id',
    async (req: Request, res: Response) => {
      const idResult = validate(ResourceIdSchema, req.params.resource_id);
      if (!idResult.success) {
        return sendError(res, 400, 'invalid_request', 'Invalid resource_id');
      }

      try {
        await config.onDeprovision(idResult.data);
        return res.json({ status: 'deprovisioned', resource_id: idResult.data });
      } catch (err) {
        return handleProviderError(res, err, 'deprovision');
      }
    }
  );

  // -----------------------------------------------------------------------
  // GET /v1/status/:resource_id - Resource status
  // -----------------------------------------------------------------------
  router.get(
    '/v1/status/:resource_id',
    async (req: Request, res: Response) => {
      const idResult = validate(ResourceIdSchema, req.params.resource_id);
      if (!idResult.success) {
        return sendError(res, 400, 'invalid_request', 'Invalid resource_id');
      }

      try {
        const status = await config.onStatus(idResult.data);
        return res.json(status);
      } catch (err) {
        return handleProviderError(res, err, 'status');
      }
    }
  );

  // -----------------------------------------------------------------------
  // POST /v1/rotate/:resource_id - Credential rotation
  // -----------------------------------------------------------------------
  if (config.onRotate) {
    const rotateHandler = config.onRotate;
    router.post(
      '/v1/rotate/:resource_id',
      async (req: Request, res: Response) => {
        const idResult = validate(ResourceIdSchema, req.params.resource_id);
        if (!idResult.success) {
          return sendError(res, 400, 'invalid_request', 'Invalid resource_id');
        }

        try {
          const credentials = await rotateHandler(idResult.data);
          return res.json(credentials);
        } catch (err) {
          return handleProviderError(res, err, 'rotate');
        }
      }
    );
  }

  // -----------------------------------------------------------------------
  // GET /v1/usage/:resource_id - Usage report
  // -----------------------------------------------------------------------
  if (config.onUsage) {
    const usageHandler = config.onUsage;
    router.get(
      '/v1/usage/:resource_id',
      async (req: Request, res: Response) => {
        const idResult = validate(ResourceIdSchema, req.params.resource_id);
        if (!idResult.success) {
          return sendError(res, 400, 'invalid_request', 'Invalid resource_id');
        }

        try {
          const report = await usageHandler(idResult.data);
          return res.json(report);
        } catch (err) {
          return handleProviderError(res, err, 'usage');
        }
      }
    );
  }

  // -----------------------------------------------------------------------
  // GET /v1/health - Provider health check
  // -----------------------------------------------------------------------
  router.get('/v1/health', async (_req: Request, res: Response) => {
    if (!config.onHealth) {
      const health: HealthStatus = {
        status: 'healthy',
        checked_at: new Date().toISOString(),
      };
      return res.json(health);
    }

    try {
      const health = await config.onHealth();
      const statusCode = health.status === 'unhealthy' ? 503 : 200;
      return res.status(statusCode).json(health);
    } catch (err) {
      return res.status(503).json({
        status: 'unhealthy',
        checked_at: new Date().toISOString(),
        details: {
          error: err instanceof Error ? err.message : 'Health check failed',
        },
      });
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/cost-summary - Cost summary
  // -----------------------------------------------------------------------
  if (config.onCostSummary) {
    const costHandler = config.onCostSummary;
    router.get('/v1/cost-summary', async (req: Request, res: Response) => {
      const queryResult = validate(CostSummaryQuerySchema, req.query);
      if (!queryResult.success) {
        return sendError(res, 400, 'invalid_request', 'Invalid query parameters');
      }

      try {
        const summary = await costHandler(queryResult.data);
        return res.json(summary);
      } catch (err) {
        return handleProviderError(res, err, 'cost_summary');
      }
    });
  }

  return router;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Custom error class for provider errors with OSP error codes.
 * Throw this from handlers to return structured error responses.
 */
export class OSPError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OSPError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  const body: OSPErrorResponse = { error: message, code };
  if (details) {
    body.details = details;
  }
  res.status(statusCode).json(body);
}

function handleProviderError(
  res: Response,
  err: unknown,
  operation: string
): void {
  if (err instanceof OSPError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  const message =
    err instanceof Error ? err.message : `${operation} failed`;

  console.error(`[osp] Error in ${operation}:`, err);
  sendError(res, 500, 'provider_error', message);
}
