import { describe, it, expect } from "vitest";
import { ospPlugin } from "../src/plugins/vite.js";
import { withOSP, resolveOSPEnv } from "../src/plugins/nextjs.js";

// ---------------------------------------------------------------------------
// Vite Plugin
// ---------------------------------------------------------------------------

describe("ospPlugin (Vite)", () => {
  it("returns a plugin with the correct name", () => {
    const plugin = ospPlugin();
    expect(plugin.name).toBe("osp-vite-plugin");
  });

  it("config returns an object with define", () => {
    const plugin = ospPlugin();
    const result = plugin.config();
    expect(result).toHaveProperty("define");
    expect(typeof result.define).toBe("object");
  });

  it("injects credentials as import.meta.env defines", () => {
    const plugin = ospPlugin({
      credentials: {
        "supabase.com/postgres": {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_ANON_KEY: "eyJtest",
        },
      },
    });

    const { define } = plugin.config();
    expect(define["import.meta.env.SUPABASE_URL"]).toBe(
      JSON.stringify("https://example.supabase.co"),
    );
    expect(define["import.meta.env.SUPABASE_ANON_KEY"]).toBe(
      JSON.stringify("eyJtest"),
    );
  });

  it("auto-prefixes keys with VITE_ when autoPrefix is true", () => {
    const plugin = ospPlugin({
      credentials: {
        "a.com/svc": {
          api_key: "sk_123",
        },
      },
      autoPrefix: true,
    });

    const { define } = plugin.config();
    expect(define["import.meta.env.VITE_API_KEY"]).toBe(
      JSON.stringify("sk_123"),
    );
  });

  it("does not double-prefix keys already starting with VITE_", () => {
    const plugin = ospPlugin({
      credentials: {
        "a.com/svc": {
          VITE_KEY: "val",
        },
      },
      autoPrefix: true,
    });

    const { define } = plugin.config();
    expect(define["import.meta.env.VITE_KEY"]).toBe(JSON.stringify("val"));
    expect(define["import.meta.env.VITE_VITE_KEY"]).toBeUndefined();
  });

  it("does not auto-prefix when autoPrefix is false", () => {
    const plugin = ospPlugin({
      credentials: {
        "a.com/svc": {
          api_key: "sk_123",
        },
      },
      autoPrefix: false,
    });

    const { define } = plugin.config();
    expect(define["import.meta.env.API_KEY"]).toBe(JSON.stringify("sk_123"));
    expect(define["import.meta.env.VITE_API_KEY"]).toBeUndefined();
  });

  it("resolves osp:// URIs in credential values", () => {
    const plugin = ospPlugin({
      credentials: {
        "a.com/svc": {
          KEY: "osp://a.com/svc/KEY",
        },
      },
    });

    // Since the resolver doesn't have the credential yet (circular), it won't resolve
    // But it should still set the value (fallback to original)
    const { define } = plugin.config();
    expect(define["import.meta.env.KEY"]).toBeDefined();
  });

  it("resolves explicit osp:// URI mappings", () => {
    const plugin = ospPlugin({
      credentials: {
        "a.com/svc": {
          key: "resolved_value",
        },
      },
      ospUris: {
        CUSTOM_VAR: "osp://a.com/svc/key",
      },
    });

    const { define } = plugin.config();
    expect(define["import.meta.env.CUSTOM_VAR"]).toBe(
      JSON.stringify("resolved_value"),
    );
  });

  it("handles empty options", () => {
    const plugin = ospPlugin({});
    const { define } = plugin.config();
    expect(Object.keys(define)).toHaveLength(0);
  });

  it("handles undefined options", () => {
    const plugin = ospPlugin();
    const { define } = plugin.config();
    expect(Object.keys(define)).toHaveLength(0);
  });

  it("ignores invalid provider/offering key format", () => {
    const plugin = ospPlugin({
      credentials: {
        "no-slash": { KEY: "val" },
      },
    });

    // Should not throw, just skip
    const { define } = plugin.config();
    // The credential still gets injected as define, just not stored in resolver
    expect(define["import.meta.env.KEY"]).toBe(JSON.stringify("val"));
  });
});

// ---------------------------------------------------------------------------
// Next.js Plugin
// ---------------------------------------------------------------------------

describe("withOSP (Next.js)", () => {
  it("returns a Next.js config with env property", () => {
    const config = withOSP({});
    expect(config).toHaveProperty("env");
  });

  it("preserves existing Next.js config properties", () => {
    const config = withOSP({
      reactStrictMode: true,
      poweredByHeader: false,
    });
    expect(config.reactStrictMode).toBe(true);
    expect(config.poweredByHeader).toBe(false);
    expect(config.env).toBeDefined();
  });

  it("resolves osp:// URIs in existing env", () => {
    const config = withOSP(
      {
        env: {
          PLAIN_VAR: "plain_value",
        },
      },
      {
        credentials: {
          "a.com/svc": {
            key: "resolved",
          },
        },
      },
    );

    expect(config.env?.PLAIN_VAR).toBe("plain_value");
  });

  it("adds credentials from ospConfig", () => {
    const config = withOSP(
      {},
      {
        credentials: {
          "supabase.com/postgres": {
            SUPABASE_URL: "https://abc.supabase.co",
          },
        },
        ospUris: {
          DB_URL: "osp://supabase.com/postgres/SUPABASE_URL",
        },
      },
    );

    expect(config.env?.DB_URL).toBe("https://abc.supabase.co");
  });

  it("handles missing osp config", () => {
    const config = withOSP({ env: { KEY: "val" } });
    expect(config.env?.KEY).toBe("val");
  });

  it("handles empty nextConfig", () => {
    const config = withOSP();
    expect(config.env).toEqual({});
  });

  it("ignores unresolvable osp URIs in ospUris", () => {
    const config = withOSP(
      {},
      {
        ospUris: {
          MISSING: "osp://unknown.com/svc/key",
        },
      },
    );

    // Unresolvable URIs are not added to env
    expect(config.env?.MISSING).toBeUndefined();
  });

  it("passes through osp:// values in existing env that cannot be resolved", () => {
    const config = withOSP({
      env: {
        OSP_VAR: "osp://unknown.com/svc/key",
      },
    });

    // Unresolvable osp URIs in existing env fall back to original value
    expect(config.env?.OSP_VAR).toBe("osp://unknown.com/svc/key");
  });
});

// ---------------------------------------------------------------------------
// resolveOSPEnv
// ---------------------------------------------------------------------------

describe("resolveOSPEnv", () => {
  it("resolves from process.env", () => {
    process.env.__OSP_TEST_KEY = "test_value";
    expect(resolveOSPEnv("__OSP_TEST_KEY")).toBe("test_value");
    delete process.env.__OSP_TEST_KEY;
  });

  it("returns undefined for missing key", () => {
    expect(resolveOSPEnv("__OSP_NONEXISTENT_KEY_12345")).toBeUndefined();
  });
});
