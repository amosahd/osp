/**
 * Correlation ID and tracing support for OSP MCP tools.
 *
 * Every tool invocation gets a unique correlation ID that follows the
 * request through discovery, estimate, provision, and settlement.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Correlation ID Generation
// ---------------------------------------------------------------------------

/** Generate a new correlation ID for an MCP tool invocation. */
export function generateCorrelationId(): string {
  return `osp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// ---------------------------------------------------------------------------
// Trace Metadata
// ---------------------------------------------------------------------------

/** Trace metadata attached to every MCP tool response. */
export interface TraceMetadata {
  /** Unique correlation ID for this tool invocation chain. */
  correlation_id: string;
  /** Tool name that generated this response. */
  tool: string;
  /** ISO 8601 timestamp when the tool was invoked. */
  invoked_at: string;
  /** Duration in milliseconds. */
  duration_ms?: number;
  /** Provider URL if applicable. */
  provider_url?: string;
  /** Sardis payment trace ID for alignment with ledger. */
  sardis_trace_id?: string;
  /** Parent correlation ID for chained operations. */
  parent_correlation_id?: string;
}

/**
 * Create trace metadata for a tool response.
 */
export function createTraceMetadata(
  tool: string,
  opts?: {
    providerUrl?: string;
    sardisTraceId?: string;
    parentCorrelationId?: string;
    correlationId?: string;
  },
): TraceMetadata {
  return {
    correlation_id: opts?.correlationId ?? generateCorrelationId(),
    tool,
    invoked_at: new Date().toISOString(),
    provider_url: opts?.providerUrl,
    sardis_trace_id: opts?.sardisTraceId,
    parent_correlation_id: opts?.parentCorrelationId,
  };
}

/**
 * Finalize trace metadata with duration.
 */
export function finalizeTrace(
  trace: TraceMetadata,
  startTime: number,
): TraceMetadata {
  return {
    ...trace,
    duration_ms: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// Sardis Trace Alignment
// ---------------------------------------------------------------------------

/**
 * Create a Sardis-aligned trace ID from an OSP correlation ID.
 *
 * This allows operators to correlate MCP tool invocations with
 * Sardis ledger entries and payment events.
 */
export function createSardisTraceId(correlationId: string): string {
  return `sardis_${correlationId}`;
}
