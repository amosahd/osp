/**
 * osp:// URI resolver for Node.js.
 *
 * Resolves `osp://provider.com/offering/credential_key` URIs to actual
 * credential values from the local vault or environment.
 *
 * Usage:
 *
 * ```ts
 * import { OSPResolver } from "@osp/client/resolver";
 *
 * const resolver = new OSPResolver();
 * resolver.addCredential("supabase.com", "postgres", {
 *   connection_string: "postgres://...",
 *   api_url: "https://...",
 * });
 *
 * const value = resolver.resolve("osp://supabase.com/postgres/connection_string");
 * // => "postgres://..."
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedOSPUri {
  provider: string;
  offering: string;
  key: string;
}

export interface ResolverOptions {
  /** Fallback to environment variables when credential not found in vault. */
  envFallback?: boolean;
  /** Custom environment variable prefix mapping. */
  envPrefixes?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// URI Parsing
// ---------------------------------------------------------------------------

const OSP_URI_REGEX = /^osp:\/\/([^/]+)\/([^/]+)\/(.+)$/;

/**
 * Parse an osp:// URI into its components.
 *
 * @param uri - URI in the format `osp://provider/offering/key`
 * @returns Parsed components or null if invalid.
 */
export function parseOSPUri(uri: string): ParsedOSPUri | null {
  const match = uri.match(OSP_URI_REGEX);
  if (!match) return null;
  return {
    provider: match[1]!,
    offering: match[2]!,
    key: match[3]!,
  };
}

/**
 * Build an osp:// URI from components.
 */
export function buildOSPUri(provider: string, offering: string, key: string): string {
  return `osp://${provider}/${offering}/${key}`;
}

/**
 * Check if a string is a valid osp:// URI.
 */
export function isOSPUri(value: string): boolean {
  return OSP_URI_REGEX.test(value);
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/** In-memory credential store keyed by provider/offering. */
type CredentialStore = Map<string, Map<string, Record<string, string>>>;

export class OSPResolver {
  private readonly credentials: CredentialStore = new Map();
  private readonly options: Required<ResolverOptions>;

  constructor(options?: ResolverOptions) {
    this.options = {
      envFallback: options?.envFallback ?? true,
      envPrefixes: options?.envPrefixes ?? {},
    };
  }

  /**
   * Store credentials for a provider/offering pair.
   */
  addCredential(
    provider: string,
    offering: string,
    credentials: Record<string, string>,
  ): void {
    let providerMap = this.credentials.get(provider);
    if (!providerMap) {
      providerMap = new Map();
      this.credentials.set(provider, providerMap);
    }
    providerMap.set(offering, credentials);
  }

  /**
   * Remove credentials for a provider/offering pair.
   */
  removeCredential(provider: string, offering: string): boolean {
    return this.credentials.get(provider)?.delete(offering) ?? false;
  }

  /**
   * Resolve an osp:// URI to its credential value.
   *
   * @returns The resolved value, or undefined if not found.
   */
  resolve(uri: string): string | undefined {
    const parsed = parseOSPUri(uri);
    if (!parsed) return undefined;

    // Try vault first
    const creds = this.credentials.get(parsed.provider)?.get(parsed.offering);
    if (creds && parsed.key in creds) {
      return creds[parsed.key];
    }

    // Fallback to environment variables
    if (this.options.envFallback) {
      return this.resolveFromEnv(parsed);
    }

    return undefined;
  }

  /**
   * Resolve all osp:// URIs in a record, returning a new record with
   * resolved values.
   */
  resolveAll(env: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      result[key] = isOSPUri(value) ? (this.resolve(value) ?? value) : value;
    }
    return result;
  }

  /**
   * List all stored credentials as osp:// URIs.
   */
  listUris(): string[] {
    const uris: string[] = [];
    for (const [provider, offerings] of this.credentials) {
      for (const [offering, creds] of offerings) {
        for (const key of Object.keys(creds)) {
          uris.push(buildOSPUri(provider, offering, key));
        }
      }
    }
    return uris;
  }

  /**
   * Generate a .env file content from stored credentials.
   */
  generateDotenv(options?: { framework?: "nextjs" | "vite" | "plain" }): string {
    const lines: string[] = [];
    const framework = options?.framework ?? "plain";

    for (const [provider, offerings] of this.credentials) {
      lines.push(`# ${provider}`);
      for (const [offering, creds] of offerings) {
        for (const [key, value] of Object.entries(creds)) {
          let envKey = key.toUpperCase();
          if (framework === "nextjs" && !envKey.startsWith("NEXT_PUBLIC_")) {
            // Only add prefix for client-side keys if they contain "public" or "anon"
            if (envKey.includes("ANON") || envKey.includes("PUBLIC") || envKey.includes("PUBLISHABLE")) {
              envKey = `NEXT_PUBLIC_${envKey}`;
            }
          } else if (framework === "vite" && !envKey.startsWith("VITE_")) {
            if (envKey.includes("ANON") || envKey.includes("PUBLIC") || envKey.includes("PUBLISHABLE")) {
              envKey = `VITE_${envKey}`;
            }
          }
          lines.push(`${envKey}=${value} # osp://${provider}/${offering}/${key}`);
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private resolveFromEnv(parsed: ParsedOSPUri): string | undefined {
    const envKey = parsed.key.toUpperCase();
    const prefix = this.options.envPrefixes[parsed.provider];

    // Try with custom prefix first
    if (prefix) {
      const prefixed = typeof process !== "undefined"
        ? process.env[`${prefix}${envKey}`]
        : undefined;
      if (prefixed) return prefixed;
    }

    // Try exact key
    return typeof process !== "undefined" ? process.env[envKey] : undefined;
  }
}
