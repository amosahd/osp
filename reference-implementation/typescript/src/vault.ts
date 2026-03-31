/**
 * Local vault for storing and migrating provisioned resource credential
 * bundles across SDK versions.
 *
 * The vault supports versioned bundle schemas so that agents can upgrade
 * SDKs without losing provisioned resource history.
 */

// ---------------------------------------------------------------------------
// Bundle Versioning
// ---------------------------------------------------------------------------

/** Current vault bundle schema version. */
export const VAULT_BUNDLE_VERSION = 2;

/** Version 1 bundle shape (legacy, pre-payment). */
export interface VaultBundleV1 {
  version: 1;
  resource_id: string;
  offering_id: string;
  provider_url: string;
  credentials: Record<string, unknown>;
  created_at: string;
}

/** Version 2 bundle shape (current, payment-aware). */
export interface VaultBundleV2 {
  version: 2;
  resource_id: string;
  offering_id: string;
  tier_id: string;
  provider_url: string;
  provider_fingerprint?: string;
  manifest_hash?: string;
  credentials: Record<string, unknown>;
  payment_method?: string;
  escrow_id?: string;
  created_at: string;
  last_rotated_at?: string;
  rotation_count: number;
  environment?: string;
}

/** Union of all known vault bundle versions. */
export type VaultBundle = VaultBundleV1 | VaultBundleV2;

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Migrate a bundle from any older version to the current version.
 *
 * This function is safe to call on bundles that are already current —
 * it returns them unchanged.
 */
export function migrateBundle(bundle: VaultBundle): VaultBundleV2 {
  if (bundle.version === 2) {
    return bundle;
  }

  // V1 → V2 migration
  if (bundle.version === 1) {
    return {
      version: 2,
      resource_id: bundle.resource_id,
      offering_id: bundle.offering_id,
      tier_id: "unknown", // V1 did not track tier
      provider_url: bundle.provider_url,
      credentials: bundle.credentials,
      created_at: bundle.created_at,
      rotation_count: 0,
    };
  }

  // Unknown version — best-effort forward migration
  const raw = bundle as Record<string, unknown>;
  return {
    version: 2,
    resource_id: String(raw.resource_id ?? "unknown"),
    offering_id: String(raw.offering_id ?? "unknown"),
    tier_id: String(raw.tier_id ?? "unknown"),
    provider_url: String(raw.provider_url ?? ""),
    credentials: (raw.credentials as Record<string, unknown>) ?? {},
    created_at: String(raw.created_at ?? new Date().toISOString()),
    rotation_count: Number(raw.rotation_count ?? 0),
  };
}

/**
 * Check whether a bundle needs migration.
 */
export function needsMigration(bundle: VaultBundle): boolean {
  return bundle.version !== VAULT_BUNDLE_VERSION;
}

/**
 * Validate that a bundle has all required fields for the current schema.
 */
export function validateBundle(bundle: VaultBundleV2): string[] {
  const errors: string[] = [];
  if (!bundle.resource_id) errors.push("missing resource_id");
  if (!bundle.offering_id) errors.push("missing offering_id");
  if (!bundle.provider_url) errors.push("missing provider_url");
  if (!bundle.created_at) errors.push("missing created_at");
  if (bundle.version !== VAULT_BUNDLE_VERSION) {
    errors.push(`unexpected version ${bundle.version}, expected ${VAULT_BUNDLE_VERSION}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Vault Operations
// ---------------------------------------------------------------------------

/** In-memory vault store (production implementations should use encrypted storage). */
export class VaultStore {
  private bundles: Map<string, VaultBundleV2> = new Map();

  /** Store a bundle, migrating if necessary. */
  store(bundle: VaultBundle): VaultBundleV2 {
    const migrated = migrateBundle(bundle);
    this.bundles.set(migrated.resource_id, migrated);
    return migrated;
  }

  /** Retrieve a bundle by resource ID. */
  get(resourceId: string): VaultBundleV2 | undefined {
    return this.bundles.get(resourceId);
  }

  /** List all stored bundles. */
  list(): VaultBundleV2[] {
    return Array.from(this.bundles.values());
  }

  /** Remove a bundle by resource ID. */
  remove(resourceId: string): boolean {
    return this.bundles.delete(resourceId);
  }

  /** Record a credential rotation. */
  recordRotation(
    resourceId: string,
    newCredentials: Record<string, unknown>,
  ): VaultBundleV2 | undefined {
    const bundle = this.bundles.get(resourceId);
    if (!bundle) return undefined;

    bundle.credentials = newCredentials;
    bundle.last_rotated_at = new Date().toISOString();
    bundle.rotation_count += 1;
    return bundle;
  }

  /** Migrate all stored bundles to current version. */
  migrateAll(): { migrated: number; total: number } {
    let migrated = 0;
    for (const [id, bundle] of this.bundles) {
      if (needsMigration(bundle as VaultBundle)) {
        this.bundles.set(id, migrateBundle(bundle as VaultBundle));
        migrated++;
      }
    }
    return { migrated, total: this.bundles.size };
  }
}
