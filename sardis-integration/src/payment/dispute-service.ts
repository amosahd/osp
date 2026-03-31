/**
 * Dispute Handling Service — manages disputes for escrow-backed provisions.
 *
 * Provides dispute receipts, evidence tracking, post-dispute settlement
 * behavior, and operator workflow support.
 */

import type {
  EscrowHold,
  SardisResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// Dispute Types
// ---------------------------------------------------------------------------

export interface DisputeReceipt {
  dispute_id: string;
  escrow_id: string;
  resource_id: string;
  provider_id: string;
  amount: string;
  currency: string;
  reason: DisputeReason;
  evidence: DisputeEvidence[];
  status: DisputeStatus;
  filed_at: string;
  resolved_at?: string;
  resolution?: DisputeResolution;
}

export type DisputeReason =
  | "service_not_delivered"
  | "service_degraded"
  | "billing_error"
  | "unauthorized_charge"
  | "terms_violation"
  | "other";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_in_favor_of_agent"
  | "resolved_in_favor_of_provider"
  | "withdrawn";

export interface DisputeEvidence {
  type: "url" | "text" | "screenshot" | "log";
  content: string;
  submitted_at: string;
  submitted_by: "agent" | "provider" | "operator";
}

export interface DisputeResolution {
  outcome: "refund" | "release" | "partial_refund" | "no_action";
  refund_amount?: string;
  reason: string;
  resolved_by: string;
  resolved_at: string;
}

// ---------------------------------------------------------------------------
// Post-Dispute Settlement Behavior
// ---------------------------------------------------------------------------

/**
 * Post-dispute settlement rules:
 *
 * 1. During active dispute, escrow funds remain locked — no release, no refund.
 * 2. If resolved in favor of agent: full or partial refund.
 * 3. If resolved in favor of provider: funds released to provider.
 * 4. If withdrawn: funds released to provider.
 * 5. Dispute must be filed within the escrow's dispute_window_hours.
 */

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DisputeService {
  private disputes = new Map<string, DisputeReceipt>();

  /**
   * File a dispute for an escrow-backed provision.
   */
  async fileDispute(params: {
    escrow_id: string;
    resource_id: string;
    provider_id: string;
    amount: string;
    currency: string;
    reason: DisputeReason;
    evidence?: Array<{ type: DisputeEvidence["type"]; content: string }>;
  }): Promise<SardisResult<DisputeReceipt>> {
    const dispute: DisputeReceipt = {
      dispute_id: `dsp_${randomId()}`,
      escrow_id: params.escrow_id,
      resource_id: params.resource_id,
      provider_id: params.provider_id,
      amount: params.amount,
      currency: params.currency,
      reason: params.reason,
      evidence: (params.evidence ?? []).map((e) => ({
        ...e,
        submitted_at: new Date().toISOString(),
        submitted_by: "agent" as const,
      })),
      status: "open",
      filed_at: new Date().toISOString(),
    };

    this.disputes.set(dispute.dispute_id, dispute);
    return { ok: true, data: dispute };
  }

  /**
   * Add evidence to an open dispute.
   */
  addEvidence(
    disputeId: string,
    evidence: { type: DisputeEvidence["type"]; content: string; by: "agent" | "provider" | "operator" },
  ): SardisResult<DisputeReceipt> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      return { ok: false, error: { code: "NOT_FOUND", message: `Dispute ${disputeId} not found` } };
    }
    if (dispute.status !== "open" && dispute.status !== "under_review") {
      return { ok: false, error: { code: "INVALID_STATE", message: `Dispute is ${dispute.status}` } };
    }

    dispute.evidence.push({
      type: evidence.type,
      content: evidence.content,
      submitted_at: new Date().toISOString(),
      submitted_by: evidence.by,
    });

    return { ok: true, data: dispute };
  }

  /**
   * Resolve a dispute — operator workflow endpoint.
   */
  resolveDispute(
    disputeId: string,
    resolution: {
      outcome: DisputeResolution["outcome"];
      refund_amount?: string;
      reason: string;
      resolved_by: string;
    },
  ): SardisResult<DisputeReceipt> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      return { ok: false, error: { code: "NOT_FOUND", message: `Dispute ${disputeId} not found` } };
    }

    dispute.resolution = {
      ...resolution,
      resolved_at: new Date().toISOString(),
    };
    dispute.resolved_at = new Date().toISOString();
    dispute.status =
      resolution.outcome === "refund" || resolution.outcome === "partial_refund"
        ? "resolved_in_favor_of_agent"
        : "resolved_in_favor_of_provider";

    return { ok: true, data: dispute };
  }

  /** Withdraw a dispute — agent decides not to pursue. */
  withdrawDispute(disputeId: string): SardisResult<DisputeReceipt> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      return { ok: false, error: { code: "NOT_FOUND", message: `Dispute ${disputeId} not found` } };
    }
    if (dispute.status !== "open" && dispute.status !== "under_review") {
      return { ok: false, error: { code: "INVALID_STATE", message: `Cannot withdraw ${dispute.status} dispute` } };
    }
    dispute.status = "withdrawn";
    dispute.resolved_at = new Date().toISOString();
    return { ok: true, data: dispute };
  }

  /** Get dispute by ID. */
  getDispute(disputeId: string): DisputeReceipt | undefined {
    return this.disputes.get(disputeId);
  }

  /** List disputes by escrow ID. */
  listByEscrow(escrowId: string): DisputeReceipt[] {
    return Array.from(this.disputes.values()).filter(
      (d) => d.escrow_id === escrowId,
    );
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
