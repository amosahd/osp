/**
 * Manifest discovery and verification utilities.
 *
 * Providers publish their manifest at `/.well-known/osp.json`.  This
 * module handles fetching, signature verification, and helper lookups.
 */

import type { ServiceManifest, ServiceOffering, ServiceTier } from "./types.js";
import { canonicalJson, verifyEd25519 } from "./crypto.js";

// ---------------------------------------------------------------------------
// Well-known path
// ---------------------------------------------------------------------------

/** The standardized well-known path where providers publish their manifest. */
export const WELL_KNOWN_PATH = "/.well-known/osp.json";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/**
 * Fetch a provider's service manifest from the well-known URL.
 *
 * @param providerUrl - Base URL of the provider (e.g. `https://supabase.com`).
 * @returns The parsed `ServiceManifest`.
 * @throws On network errors or non-2xx responses.
 */
export async function fetchManifest(
  providerUrl: string,
): Promise<ServiceManifest> {
  const url = new URL(WELL_KNOWN_PATH, normalizeUrl(providerUrl));
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch manifest from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const manifest: ServiceManifest = await response.json();
  return manifest;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify the Ed25519 signature on a service manifest.
 *
 * The provider signs the canonical JSON of the manifest **excluding** the
 * `provider_signature` field.  Verification requires `provider_public_key`
 * to be present in the manifest.
 *
 * @returns `true` when the signature is valid, `false` otherwise (including
 *          when the manifest has no public key).
 */
export async function verifyManifestSignature(
  manifest: ServiceManifest,
): Promise<boolean> {
  if (!manifest.provider_public_key || !manifest.provider_signature) {
    return false;
  }

  // Build the signed payload: everything except provider_signature.
  const { provider_signature: _sig, ...rest } = manifest;
  const payload = canonicalJson(rest);

  return verifyEd25519(
    manifest.provider_public_key,
    manifest.provider_signature,
    payload,
  );
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Find a specific offering inside a manifest by its `offering_id`.
 *
 * @returns The matching `ServiceOffering` or `null` if not found.
 */
export function findOffering(
  manifest: ServiceManifest,
  offeringId: string,
): ServiceOffering | null {
  return manifest.offerings.find((o) => o.offering_id === offeringId) ?? null;
}

/**
 * Find a specific tier inside an offering by its `tier_id`.
 *
 * @returns The matching `ServiceTier` or `null` if not found.
 */
export function findTier(
  offering: ServiceOffering,
  tierId: string,
): ServiceTier | null {
  return offering.tiers.find((t) => t.tier_id === tierId) ?? null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Ensure the URL has a protocol and no trailing slash. */
function normalizeUrl(url: string): string {
  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, "");
}
