/**
 * Next.js plugin for OSP — automatically injects OSP credentials into
 * environment variables and provides server-side helpers.
 *
 * Usage in `next.config.ts`:
 *
 * ```ts
 * import { withOSP } from "@osp/client/plugins/nextjs";
 *
 * export default withOSP({
 *   // your Next.js config
 * });
 * ```
 */

import { OSPResolver, isOSPUri } from "../resolver.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OSPNextConfig {
  /** Credentials to inject, as provider/offering -> credential map. */
  credentials?: Record<string, Record<string, string>>;
  /** Prefix public-facing keys with NEXT_PUBLIC_ automatically. */
  autoPrefix?: boolean;
  /** Additional osp:// URI mappings for environment variables. */
  ospUris?: Record<string, string>;
}

export interface NextConfig {
  env?: Record<string, string>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Wrap a Next.js config to automatically inject OSP credentials into
 * the build environment.
 *
 * @param nextConfig - The base Next.js configuration.
 * @param ospConfig - OSP credential configuration.
 */
export function withOSP(
  nextConfig: NextConfig = {},
  ospConfig?: OSPNextConfig,
): NextConfig {
  const resolver = new OSPResolver({ envFallback: true });

  // Load credentials into the resolver
  if (ospConfig?.credentials) {
    for (const [key, creds] of Object.entries(ospConfig.credentials)) {
      const [provider, offering] = key.split("/");
      if (provider && offering) {
        resolver.addCredential(provider, offering, creds);
      }
    }
  }

  // Resolve any osp:// URIs in the existing env
  const existingEnv = nextConfig.env ?? {};
  const resolvedEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(existingEnv)) {
    resolvedEnv[key] = isOSPUri(value) ? (resolver.resolve(value) ?? value) : value;
  }

  // Add explicitly mapped osp:// URIs
  if (ospConfig?.ospUris) {
    for (const [envKey, uri] of Object.entries(ospConfig.ospUris)) {
      const resolved = resolver.resolve(uri);
      if (resolved) {
        resolvedEnv[envKey] = resolved;
      }
    }
  }

  return {
    ...nextConfig,
    env: resolvedEnv,
  };
}

/**
 * Server-side helper: resolve an osp:// URI at runtime.
 * Reads from process.env after Next.js has injected the values.
 */
export function resolveOSPEnv(key: string): string | undefined {
  if (typeof process !== "undefined") {
    return process.env[key];
  }
  return undefined;
}
