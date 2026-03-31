/**
 * Reconciliation Workers — detect and alert on payment/resource drift.
 */

import type { EscrowHold, ChargeIntent, SardisResult } from "./types.js";

// ---------------------------------------------------------------------------
// Scanner Types
// ---------------------------------------------------------------------------

export interface ReconciliationAlert {
  alert_id: string;
  type: ReconciliationAlertType;
  severity: "warning" | "critical";
  message: string;
  details: Record<string, unknown>;
  detected_at: string;
}

export type ReconciliationAlertType =
  | "paid_without_resource"
  | "unsettled_hold"
  | "resource_without_payment"
  | "stale_hold"
  | "charge_settlement_failed";

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

/**
 * Scan for paid-but-unprovisioned requests.
 *
 * Detects mandates consumed but no corresponding active resource.
 */
export function scanPaidWithoutResource(
  holds: EscrowHold[],
  activeResourceIds: Set<string>,
): ReconciliationAlert[] {
  const alerts: ReconciliationAlert[] = [];

  for (const hold of holds) {
    if (
      (hold.status === "active" || hold.status === "released") &&
      !activeResourceIds.has(hold.resource_id)
    ) {
      alerts.push({
        alert_id: `alert_${randomId()}`,
        type: "paid_without_resource",
        severity: "critical",
        message: `Escrow ${hold.escrow_id} has status ${hold.status} but resource ${hold.resource_id} is not active`,
        details: {
          escrow_id: hold.escrow_id,
          resource_id: hold.resource_id,
          amount: hold.amount,
          currency: hold.currency,
        },
        detected_at: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Scan for provisioned-but-unsettled holds.
 *
 * Detects active escrow holds that should have been released.
 */
export function scanUnsettledHolds(
  holds: EscrowHold[],
  maxAgeHours: number = 24,
): ReconciliationAlert[] {
  const alerts: ReconciliationAlert[] = [];
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000);

  for (const hold of holds) {
    if (hold.status === "active" && new Date(hold.created_at) < cutoff) {
      alerts.push({
        alert_id: `alert_${randomId()}`,
        type: "unsettled_hold",
        severity: "warning",
        message: `Escrow ${hold.escrow_id} has been active for over ${maxAgeHours}h without settlement`,
        details: {
          escrow_id: hold.escrow_id,
          resource_id: hold.resource_id,
          created_at: hold.created_at,
          amount: hold.amount,
        },
        detected_at: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Run full reconciliation scan and return all alerts.
 */
export function runReconciliation(params: {
  holds: EscrowHold[];
  charges: ChargeIntent[];
  activeResourceIds: Set<string>;
  maxHoldAgeHours?: number;
}): ReconciliationAlert[] {
  return [
    ...scanPaidWithoutResource(params.holds, params.activeResourceIds),
    ...scanUnsettledHolds(params.holds, params.maxHoldAgeHours),
  ];
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
