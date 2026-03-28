/**
 * Vite plugin for OSP — injects OSP credentials as `import.meta.env`
 * variables and resolves osp:// URIs during the build.
 *
 * Usage in `vite.config.ts`:
 *
 * ```ts
 * import { ospPlugin } from "@osp/client/plugins/vite";
 *
 * export default defineConfig({
 *   plugins: [
 *     ospPlugin({
 *       credentials: {
 *         "supabase.com/postgres": {
 *           SUPABASE_URL: "https://...",
 *           SUPABASE_ANON_KEY: "eyJ...",
 *         },
 *       },
 *     }),
 *   ],
 * });
 * ```
 */

import { OSPResolver, isOSPUri } from "../resolver.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OSPVitePluginOptions {
  /** Credentials to inject, as "provider/offering" -> credential map. */
  credentials?: Record<string, Record<string, string>>;
  /** Prefix client-safe keys with VITE_ automatically. */
  autoPrefix?: boolean;
  /** Additional osp:// URI mappings. */
  ospUris?: Record<string, string>;
}

export interface VitePlugin {
  name: string;
  config: () => { define: Record<string, string> };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Create a Vite plugin that injects OSP credentials into the build
 * as `import.meta.env.VITE_*` variables.
 */
export function ospPlugin(options?: OSPVitePluginOptions): VitePlugin {
  const resolver = new OSPResolver({ envFallback: true });

  // Load credentials
  if (options?.credentials) {
    for (const [key, creds] of Object.entries(options.credentials)) {
      const [provider, offering] = key.split("/");
      if (provider && offering) {
        resolver.addCredential(provider, offering, creds);
      }
    }
  }

  return {
    name: "osp-vite-plugin",
    config() {
      const define: Record<string, string> = {};

      // Inject credentials as import.meta.env.*
      if (options?.credentials) {
        for (const [_key, creds] of Object.entries(options.credentials)) {
          for (const [envKey, value] of Object.entries(creds)) {
            let finalKey = envKey.toUpperCase();
            // Auto-prefix for Vite exposure
            if (options?.autoPrefix && !finalKey.startsWith("VITE_")) {
              finalKey = `VITE_${finalKey}`;
            }
            const resolved = isOSPUri(value) ? (resolver.resolve(value) ?? value) : value;
            define[`import.meta.env.${finalKey}`] = JSON.stringify(resolved);
          }
        }
      }

      // Resolve explicit osp:// URI mappings
      if (options?.ospUris) {
        for (const [envKey, uri] of Object.entries(options.ospUris)) {
          const resolved = resolver.resolve(uri);
          if (resolved) {
            define[`import.meta.env.${envKey}`] = JSON.stringify(resolved);
          }
        }
      }

      return { define };
    },
  };
}
