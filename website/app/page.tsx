const providers = [
  {
    name: "Supabase",
    category: "Database",
    offerings: ["Managed PostgreSQL", "Auth", "Storage"],
  },
  {
    name: "Neon",
    category: "Database",
    offerings: ["Serverless Postgres"],
  },
  {
    name: "Cloudflare",
    category: "Infrastructure",
    offerings: ["Workers", "R2 Storage", "D1 Database", "KV"],
  },
  {
    name: "Vercel",
    category: "Hosting",
    offerings: ["Frontend Hosting", "Edge Functions"],
  },
  {
    name: "Railway",
    category: "Hosting",
    offerings: ["App Hosting", "Databases", "Cron Jobs"],
  },
  {
    name: "Upstash",
    category: "Database",
    offerings: ["Serverless Redis", "Kafka", "QStash"],
  },
  {
    name: "Turso",
    category: "Database",
    offerings: ["Embedded SQLite"],
  },
  {
    name: "Resend",
    category: "Email",
    offerings: ["Transactional Email"],
  },
  {
    name: "Clerk",
    category: "Auth",
    offerings: ["Authentication", "User Management"],
  },
  {
    name: "PostHog",
    category: "Analytics",
    offerings: ["Product Analytics", "Feature Flags"],
  },
];

const comparisonRows = [
  {
    feature: "Provider onboarding",
    stripe: "Invite-only",
    osp: "Self-registration",
  },
  { feature: "Protocol", stripe: "Proprietary", osp: "Open (Apache 2.0)" },
  { feature: "Payment rail", stripe: "Stripe only", osp: "Any (pluggable)" },
  {
    feature: "Discovery",
    stripe: "CLI catalog",
    osp: "/.well-known/osp.json",
  },
  {
    feature: "Credential security",
    stripe: "Proprietary vault",
    osp: "Ed25519 encrypted bundles",
  },
  {
    feature: "Agent integration",
    stripe: "Custom per provider",
    osp: "Single standard protocol",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-osp-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center lg:py-32">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-osp-200 bg-white px-4 py-1.5 text-sm text-osp-700">
              v1.0 Draft &mdash; Open for feedback
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 lg:text-6xl">
              The open standard for{" "}
              <span className="text-osp-600">AI agent services</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              OSP lets AI agents discover, provision, and manage developer
              services through a single open protocol. No gatekeeping. No
              proprietary APIs. No payment-rail lock-in.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <a
                href="https://github.com/openserviceprotocol/osp"
                className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
              >
                View on GitHub
              </a>
              <a
                href="/spec"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Read the Spec
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-gray-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              The problem
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              AI agents are becoming autonomous economic actors. But provisioning
              services is still broken.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-8">
              <div className="text-2xl font-bold text-red-500">1</div>
              <h3 className="mt-4 text-lg font-semibold">
                Gated ecosystems
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Existing solutions require invite-only onboarding and lock
                providers to a single payment rail.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-8">
              <div className="text-2xl font-bold text-red-500">2</div>
              <h3 className="mt-4 text-lg font-semibold">
                Manual signup flows
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Agents break their workflow to open browsers, fill forms, and
                verify emails just to get an API key.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-8">
              <div className="text-2xl font-bold text-red-500">3</div>
              <h3 className="mt-4 text-lg font-semibold">
                Fragmented integrations
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Every provider has a different API. Every integration is custom,
                fragile, and non-standard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              How OSP works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A simple, four-step flow from discovery to provisioning.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Discover",
                desc: "Providers publish a ServiceManifest at /.well-known/osp.json describing their offerings and tiers.",
              },
              {
                step: "2",
                title: "Choose",
                desc: "Agents browse offerings, compare tiers and pricing, and select the right service for their needs.",
              },
              {
                step: "3",
                title: "Provision",
                desc: "A single POST request provisions the resource. Credentials are returned encrypted with Ed25519.",
              },
              {
                step: "4",
                title: "Manage",
                desc: "Standard endpoints for status, credential rotation, tier upgrades, usage tracking, and deprovisioning.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-gray-200 bg-white p-8"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-osp-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 mx-auto max-w-3xl">
            <div className="code-block">
              <pre>{`# 1. Discover
GET https://api.supabase.com/.well-known/osp.json

# 2. Provision
POST https://api.supabase.com/osp/v1/provision
{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "project_name": "my-agent-app",
  "agent_public_key": "base64url_ed25519_public_key"
}

# 3. Receive credentials
{
  "resource_id": "proj_abc123",
  "status": "provisioned",
  "credentials_bundle": {
    "SUPABASE_URL": "https://xyz.supabase.co",
    "SUPABASE_ANON_KEY": "eyJ..."
  }
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-t border-gray-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              OSP vs. the status quo
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              An open protocol that works for everyone.
            </p>
          </div>
          <div className="mt-12 mx-auto max-w-3xl overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">
                    Feature
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Proprietary
                  </th>
                  <th className="px-6 py-4 font-semibold text-osp-700">OSP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{row.stripe}</td>
                    <td className="px-6 py-4 font-medium text-osp-700">
                      {row.osp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Provider Grid */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Providers with example manifests
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              OSP ships with example manifests for real services. Any provider
              can self-register.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {providers.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-gray-200 bg-white p-6 text-center"
              >
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{p.category}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {p.offerings.length} offering
                  {p.offerings.length > 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Get started with OSP
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Whether you are building an agent or running a service, OSP gives
            you a standard way to connect.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-agents.md"
              className="rounded-lg bg-osp-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-osp-700"
            >
              I am building an agent
            </a>
            <a
              href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              I am a service provider
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
