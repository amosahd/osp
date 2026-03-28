/**
 * Bridge: sardis_provision_service → OSP provision + Sardis escrow.
 *
 * Orchestrates the full provisioning flow:
 * 1. Fetch provider manifest (OSP discovery)
 * 2. Find the requested offering + tier
 * 3. Create a SpendingMandate (Sardis)
 * 4. Build OSP ProvisionRequest with sardis_wallet payment proof
 * 5. Send provision request to provider (OSP)
 * 6. On success, create EscrowHold for paid tiers (Sardis)
 * 7. Return credentials + escrow info
 */

import type { SardisResult } from "../payment/types.js";
import type { SardisWalletClient } from "../payment/sardis-wallet.js";
import type { EscrowManager } from "../payment/escrow.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProvisionWithEscrowParams {
  walletClient: SardisWalletClient;
  escrowManager: EscrowManager;
  providerUrl: string;
  offeringId: string;
  tierId: string;
  projectName: string;
  region?: string;
  configuration?: Record<string, unknown>;
  agentPublicKey?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
  authToken?: string;
}

export interface ProvisionWithEscrowResult {
  resource_id: string;
  status: string;
  credentials?: Record<string, unknown>;
  escrow_id?: string;
  escrow_amount?: string;
  escrow_currency?: string;
  mandate_id: string;
  provider_url: string;
  offering_id: string;
  tier_id: string;
  dashboard_url?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Bridge function
// ---------------------------------------------------------------------------

/**
 * Provision a service through OSP with Sardis wallet payment and escrow.
 *
 * This is the core bridge function that ties together the OSP provisioning
 * protocol with Sardis payment primitives.
 */
export async function provisionWithEscrow(
  params: ProvisionWithEscrowParams,
): Promise<SardisResult<ProvisionWithEscrowResult>> {
  const {
    walletClient,
    escrowManager,
    providerUrl,
    offeringId,
    tierId,
    projectName,
    region,
    configuration,
    agentPublicKey,
    webhookUrl,
    metadata,
    authToken,
  } = params;

  const baseUrl = providerUrl.replace(/\/+$/, "");

  // Step 1: Fetch provider manifest
  let manifest: ProviderManifest;
  try {
    const manifestResponse = await fetch(
      `${baseUrl}/.well-known/osp.json`,
      { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
    );
    if (!manifestResponse.ok) {
      return {
        ok: false,
        error: {
          code: "MANIFEST_FETCH_FAILED",
          message: `Failed to fetch manifest from ${baseUrl}: ${manifestResponse.statusText}`,
        },
      };
    }
    manifest = (await manifestResponse.json()) as ProviderManifest;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "MANIFEST_FETCH_FAILED",
        message: `Failed to fetch manifest: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }

  // Step 2: Find offering + tier
  const offering = manifest.offerings?.find(
    (o: { offering_id: string }) => o.offering_id === offeringId,
  );
  if (!offering) {
    return {
      ok: false,
      error: {
        code: "OFFERING_NOT_FOUND",
        message: `Offering ${offeringId} not found in manifest`,
      },
    };
  }

  const tier = offering.tiers?.find(
    (t: { tier_id: string }) => t.tier_id === tierId,
  );
  if (!tier) {
    return {
      ok: false,
      error: {
        code: "TIER_NOT_FOUND",
        message: `Tier ${tierId} not found in offering ${offeringId}`,
      },
    };
  }

  // Build a typed tier object with defaults for missing fields.
  // Cast escrow_profile.release_condition from string to ReleaseCondition
  // since the manifest may return arbitrary strings but the wallet client
  // validates against the known union.
  const typedTier = {
    tier_id: tier.tier_id,
    name: tier.name,
    price: tier.price ?? { amount: "0.00", currency: "USD" },
    escrow_profile: tier.escrow_profile
      ? {
          ...tier.escrow_profile,
          release_condition: tier.escrow_profile.release_condition as
            | "provision_success"
            | "uptime_24h"
            | "uptime_7d"
            | "manual"
            | undefined,
        }
      : undefined,
  };

  const isFree = typedTier.price.amount === "0" || typedTier.price.amount === "0.00";

  // Step 3: Create spending mandate (skip for free tier)
  let mandateId: string;
  if (!isFree) {
    const mandateResult = await walletClient.createMandate({
      offering_id: offeringId,
      tier_id: tierId,
      tier: typedTier,
      provider_id: manifest.provider_id,
      region,
      metadata,
    });

    if (!mandateResult.ok || !mandateResult.data) {
      return {
        ok: false,
        error: mandateResult.error ?? {
          code: "MANDATE_FAILED",
          message: "Failed to create spending mandate",
        },
      };
    }
    mandateId = mandateResult.data.mandate_id;

    // Step 4: Build provision request with Sardis payment proof
    const requestResult = walletClient.toProvisionRequest(mandateResult.data, {
      project_name: projectName,
      nonce: generateUUID(),
      region,
      configuration,
      agent_public_key: agentPublicKey,
      webhook_url: webhookUrl,
      metadata,
    });

    if (!requestResult.ok || !requestResult.data) {
      return {
        ok: false,
        error: requestResult.error ?? {
          code: "REQUEST_BUILD_FAILED",
          message: "Failed to build provision request",
        },
      };
    }

    // Step 5: Send provision request
    const provisionResult = await sendProvisionRequest(
      baseUrl,
      manifest,
      requestResult.data,
      authToken,
    );

    if (!provisionResult.ok || !provisionResult.data) {
      return {
        ok: false,
        error: provisionResult.error ?? {
          code: "PROVISION_FAILED",
          message: "Provider returned an error",
        },
      };
    }

    const provisionResponse = provisionResult.data;

    // Step 6: Create escrow hold for paid provisioning
    let escrowId: string | undefined;
    let escrowAmount: string | undefined;
    let escrowCurrency: string | undefined;

    if (
      provisionResponse.status === "provisioned" ||
      provisionResponse.status === "provisioning"
    ) {
      const escrowResult = await walletClient.createEscrowHold(
        mandateResult.data,
        provisionResponse.resource_id,
        typedTier,
      );

      if (escrowResult.ok && escrowResult.data) {
        escrowManager.register(escrowResult.data);
        escrowId = escrowResult.data.escrow_id;
        escrowAmount = escrowResult.data.amount;
        escrowCurrency = escrowResult.data.currency;
      }
    }

    return {
      ok: true,
      data: {
        resource_id: provisionResponse.resource_id,
        status: provisionResponse.status,
        credentials: provisionResponse.credentials_bundle,
        escrow_id: escrowId,
        escrow_amount: escrowAmount,
        escrow_currency: escrowCurrency,
        mandate_id: mandateId,
        provider_url: providerUrl,
        offering_id: offeringId,
        tier_id: tierId,
        dashboard_url: provisionResponse.dashboard_url,
        message: provisionResponse.message,
      },
    };
  }

  // Free tier path — no mandate or escrow needed
  mandateId = "free";

  const freeRequest = {
    offering_id: offeringId,
    tier_id: tierId,
    project_name: projectName,
    payment_method: "free",
    nonce: generateUUID(),
    ...(region && { region }),
    ...(configuration && { configuration }),
    ...(agentPublicKey && { agent_public_key: agentPublicKey }),
    ...(webhookUrl && { webhook_url: webhookUrl }),
    ...(metadata && { metadata }),
  };

  const freeResult = await sendProvisionRequest(
    baseUrl,
    manifest,
    freeRequest,
    authToken,
  );

  if (!freeResult.ok || !freeResult.data) {
    return {
      ok: false,
      error: freeResult.error ?? {
        code: "PROVISION_FAILED",
        message: "Free tier provisioning failed",
      },
    };
  }

  return {
    ok: true,
    data: {
      resource_id: freeResult.data.resource_id,
      status: freeResult.data.status,
      credentials: freeResult.data.credentials_bundle,
      mandate_id: mandateId,
      provider_url: providerUrl,
      offering_id: offeringId,
      tier_id: tierId,
      dashboard_url: freeResult.data.dashboard_url,
      message: freeResult.data.message,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ProviderManifest {
  provider_id?: string;
  offerings?: Array<{
    offering_id: string;
    tiers?: Array<{
      tier_id: string;
      name: string;
      price?: { amount: string; currency: string; interval?: string | null };
      escrow_profile?: {
        required: boolean;
        provider?: string;
        release_condition?: string;
        dispute_window_hours?: number;
      };
    }>;
  }>;
  endpoints?: {
    provision?: string;
    base_url?: string;
  };
}

interface ProvisionResponseBody {
  resource_id: string;
  status: string;
  credentials_bundle?: Record<string, unknown>;
  dashboard_url?: string;
  message?: string;
  estimated_ready_seconds?: number;
}

async function sendProvisionRequest(
  baseUrl: string,
  manifest: ProviderManifest,
  request: Record<string, unknown>,
  authToken?: string,
): Promise<SardisResult<ProvisionResponseBody>> {
  const provisionPath =
    manifest.endpoints?.provision ?? "/osp/v1/provision";
  const provisionUrl = provisionPath.startsWith("http")
    ? provisionPath
    : `${baseUrl}${provisionPath.startsWith("/") ? "" : "/"}${provisionPath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-OSP-Version": "1.0",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(provisionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorBody: Record<string, string> = {};
      try {
        errorBody = (await response.json()) as Record<string, string>;
      } catch {
        // Not JSON
      }
      return {
        ok: false,
        error: {
          code: errorBody.code ?? `HTTP_${response.status}`,
          message:
            errorBody.error ??
            `Provider returned ${response.status}: ${response.statusText}`,
        },
      };
    }

    const body = (await response.json()) as ProvisionResponseBody;
    return { ok: true, data: body };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: `Failed to reach provider: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

function generateUUID(): string {
  // Simple UUID v4 generation without crypto dependency
  const hex = "0123456789abcdef";
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return hex[v];
  });
}
