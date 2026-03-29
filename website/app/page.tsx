import {
  ArrowRight,
  Check,
  X,
  Globe,
  Shield,
  Zap,
  Database,
  Cloud,
  Mail,
  Lock,
  BarChart3,
  Server,
  Terminal,
  ChevronRight,
} from "lucide-react";

const providers = [
  { name: "Supabase", category: "Database", count: 4 },
  { name: "Neon", category: "Database", count: 1 },
  { name: "Cloudflare", category: "Infrastructure", count: 4 },
  { name: "Vercel", category: "Hosting", count: 2 },
  { name: "Railway", category: "Hosting", count: 3 },
  { name: "Upstash", category: "Database", count: 3 },
  { name: "Turso", category: "Database", count: 1 },
  { name: "Resend", category: "Email", count: 1 },
  { name: "Clerk", category: "Auth", count: 1 },
  { name: "PostHog", category: "Analytics", count: 2 },
];

const categoryIcons: Record<string, typeof Database> = {
  Database: Database,
  Infrastructure: Cloud,
  Hosting: Server,
  Email: Mail,
  Auth: Lock,
  Analytics: BarChart3,
};

const comparisonRows = [
  {
    feature: "Provider onboarding",
    old: "Invite-only",
    osp: "Self-registration via .well-known",
  },
  {
    feature: "Protocol",
    old: "Proprietary & closed",
    osp: "Open standard (Apache 2.0)",
  },
  {
    feature: "Payment rail",
    old: "Single provider lock-in",
    osp: "Any rail (pluggable)",
  },
  {
    feature: "Service discovery",
    old: "CLI catalog or docs",
    osp: "Machine-readable manifests",
  },
  {
    feature: "Credential security",
    old: "Proprietary vault",
    osp: "Ed25519 encrypted bundles",
  },
  {
    feature: "Agent integration",
    old: "Custom per provider",
    osp: "Single standard protocol",
  },
];

const steps = [
  {
    num: "01",
    title: "Discover",
    desc: "Providers publish a ServiceManifest at /.well-known/osp.json. Agents fetch it to see offerings, tiers, and pricing.",
    code: "GET https://api.supabase.com/.well-known/osp.json",
  },
  {
    num: "02",
    title: "Choose",
    desc: "Agents compare offerings across providers. Standard schema means no custom integration per provider.",
    code: '{ "offerings": [{ "id": "postgres", "tiers": ["free", "pro"] }] }',
  },
  {
    num: "03",
    title: "Provision",
    desc: "A single POST request provisions the resource. Credentials come back encrypted with the agent's Ed25519 key.",
    code: 'POST /osp/v1/provision\n{ "offering_id": "supabase/postgres", "tier_id": "free" }',
  },
  {
    num: "04",
    title: "Manage",
    desc: "Standard endpoints for status, rotation, upgrades, usage tracking, and deprovisioning. One protocol for everything.",
    code: "GET /osp/v1/status/proj_abc123\nPOST /osp/v1/rotate/proj_abc123",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 grid-pattern" />
        {/* Gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-accent-500/[0.07] blur-[120px] animate-pulse_slow" />

        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-surface-700 bg-surface-800/60 px-3.5 py-1.5 text-xs text-surface-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse_slow" />
              v1.0 Draft &mdash; Open for feedback
            </div>

            <h1 className="mt-8 font-sans text-5xl font-bold leading-[1.08] tracking-tight text-surface-100 lg:text-7xl">
              The open standard
              <br />
              for AI agent
              <br />
              <span className="text-accent-400">services</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-surface-300">
              OSP lets AI agents discover, provision, and manage developer
              services through a single open protocol. No gatekeeping. No
              proprietary APIs. No payment-rail lock-in.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
                className="group inline-flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent-600 hover:shadow-lg hover:shadow-accent-500/20"
              >
                Become a Provider
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <a
                href="https://github.com/openserviceprotocol/osp"
                className="inline-flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-800/50 px-6 py-3 text-sm font-semibold text-surface-200 transition-all duration-200 hover:border-surface-500 hover:bg-surface-800"
              >
                View on GitHub
              </a>
              <a
                href="/spec"
                className="inline-flex items-center gap-1 px-2 py-3 text-sm text-surface-400 transition-colors duration-200 hover:text-surface-200"
              >
                Read the Spec
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Hero code block */}
          <div className="mt-16 lg:mt-20">
            <div className="rounded-xl border border-surface-700 bg-surface-950 shadow-2xl shadow-black/30 overflow-hidden">
              {/* Terminal chrome */}
              <div className="flex items-center gap-2 border-b border-surface-700/60 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-surface-600" />
                  <div className="h-3 w-3 rounded-full bg-surface-600" />
                  <div className="h-3 w-3 rounded-full bg-surface-600" />
                </div>
                <div className="flex-1 text-center">
                  <span className="font-mono text-xs text-surface-500">
                    osp-provision.sh
                  </span>
                </div>
              </div>
              <div className="p-6 font-mono text-sm leading-7">
                <div className="text-surface-500">
                  # Discover what Supabase offers via OSP
                </div>
                <div>
                  <span className="text-accent-400">$</span>{" "}
                  <span className="text-surface-200">
                    curl https://api.supabase.com/.well-known/osp.json
                  </span>
                </div>
                <div className="mt-4 text-surface-500">
                  # Provision a Postgres database in one request
                </div>
                <div>
                  <span className="text-accent-400">$</span>{" "}
                  <span className="text-surface-200">
                    curl -X POST https://api.supabase.com/osp/v1/provision \
                  </span>
                </div>
                <div className="pl-4 text-surface-200">
                  -d &#39;{"{"}&quot;offering_id&quot;:
                  &quot;supabase/postgres&quot;,
                  &quot;tier_id&quot;: &quot;free&quot;,
                </div>
                <div className="pl-8 text-surface-200">
                  &quot;agent_public_key&quot;:
                  &quot;base64url_ed25519_key&quot;{"}"}&#39;
                </div>
                <div className="mt-4 text-surface-500"># Response</div>
                <div className="text-warm-500">
                  {"{"} &quot;resource_id&quot;: &quot;proj_abc123&quot;,
                </div>
                <div className="pl-2 text-warm-500">
                  &quot;status&quot;: &quot;provisioned&quot;,
                </div>
                <div className="pl-2 text-warm-500">
                  &quot;credentials_bundle&quot;: {"{"} &quot;encrypted&quot;:
                  true {"}"} {"}"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="relative border-t border-surface-800 bg-surface-950 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
              The problem
            </p>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
              AI agents are becoming autonomous economic actors.
              <br />
              <span className="text-surface-400">
                Service provisioning is still broken.
              </span>
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-surface-700 bg-surface-700 md:grid-cols-3">
            {[
              {
                title: "Gated ecosystems",
                desc: "Existing solutions require invite-only onboarding and lock providers to a single payment rail.",
              },
              {
                title: "Manual signup flows",
                desc: "Agents break their workflow to open browsers, fill forms, and verify emails just to get an API key.",
              },
              {
                title: "Fragmented integrations",
                desc: "Every provider has a different API. Every integration is custom, fragile, and non-standard.",
              },
            ].map((item, i) => (
              <div key={item.title} className="bg-surface-900 p-8 lg:p-10">
                <span className="font-mono text-xs text-surface-500">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-sans text-lg font-semibold text-surface-100">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-surface-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-surface-800 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
              How OSP works
            </p>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
              Four steps from discovery to provisioning
            </h2>
          </div>

          <div className="mt-16 space-y-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="group grid grid-cols-1 gap-6 rounded-xl border border-surface-700/50 bg-surface-800/30 p-6 transition-colors duration-200 hover:border-surface-600/50 hover:bg-surface-800/50 lg:grid-cols-2 lg:p-8"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-accent-400">
                      {step.num}
                    </span>
                    <h3 className="font-sans text-xl font-bold text-surface-100">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-surface-400">
                    {step.desc}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-950 border border-surface-700/50 p-4 font-mono text-xs leading-6 text-surface-300">
                  {step.code.split("\n").map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-surface-800 bg-surface-950 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
              Why OSP
            </p>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
              An open protocol that works for everyone
            </h2>
          </div>

          <div className="mt-12 overflow-hidden rounded-xl border border-surface-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-800/50">
                  <th className="px-6 py-4 font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
                    Feature
                  </th>
                  <th className="px-6 py-4 font-sans text-xs font-semibold uppercase tracking-widest text-surface-500">
                    Status Quo
                  </th>
                  <th className="px-6 py-4 font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
                    OSP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {comparisonRows.map((row) => (
                  <tr
                    key={row.feature}
                    className="transition-colors duration-150 hover:bg-surface-800/30"
                  >
                    <td className="px-6 py-4 font-medium text-surface-200">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-surface-500">
                      <span className="inline-flex items-center gap-1.5">
                        <X className="h-3.5 w-3.5 text-red-400/60" />
                        {row.old}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-surface-200">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        {row.osp}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Provider grid */}
      <section className="border-t border-surface-800 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
                Ecosystem
              </p>
              <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
                Growing provider ecosystem
              </h2>
              <p className="mt-3 text-surface-400">
                Example manifests for real services. Any provider can
                self-register.
              </p>
            </div>
            <a
              href="/providers"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent-400 transition-colors duration-150 hover:text-accent-300"
            >
              View all providers
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {providers.map((p) => {
              const Icon = categoryIcons[p.category] || Globe;
              return (
                <div
                  key={p.name}
                  className="group rounded-xl border border-surface-700/50 bg-surface-800/30 p-5 transition-all duration-200 hover:border-surface-600 hover:bg-surface-800/60 cursor-pointer"
                >
                  <Icon className="h-5 w-5 text-surface-500 transition-colors duration-200 group-hover:text-accent-400" />
                  <h3 className="mt-3 font-sans text-sm font-semibold text-surface-200">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs text-surface-500">{p.category}</p>
                  <p className="mt-2 font-mono text-xs text-surface-500">
                    {p.count} offering{p.count > 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="border-t border-surface-800 bg-surface-950 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Provider CTA */}
            <div className="relative overflow-hidden rounded-2xl border border-accent-500/20 bg-gradient-to-br from-accent-500/[0.08] to-transparent p-10 lg:p-12">
              <div className="absolute top-0 right-0 h-40 w-40 bg-accent-500/[0.06] blur-[80px]" />
              <div className="relative">
                <Globe className="h-8 w-8 text-accent-400" />
                <h3 className="mt-5 font-sans text-2xl font-bold text-surface-100">
                  I run a service
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-surface-400">
                  Publish a ServiceManifest and let any AI agent discover and
                  provision your service. No middleman. No rev-share.
                </p>
                <a
                  href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
                  className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent-600 hover:shadow-lg hover:shadow-accent-500/20"
                >
                  Provider Guide
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>

            {/* Agent CTA */}
            <div className="rounded-2xl border border-surface-700 bg-surface-800/30 p-10 lg:p-12">
              <Terminal className="h-8 w-8 text-surface-400" />
              <h3 className="mt-5 font-sans text-2xl font-bold text-surface-100">
                I am building an agent
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-400">
                Give your agent the ability to discover and provision any
                OSP-compatible service with a single protocol integration.
              </p>
              <a
                href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-agents.md"
                className="group mt-8 inline-flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-800 px-6 py-3 text-sm font-semibold text-surface-200 transition-all duration-200 hover:border-surface-500 hover:bg-surface-700"
              >
                Agent Guide
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-surface-800 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-center">
            {[
              { icon: Shield, label: "Ed25519 encryption" },
              { icon: Globe, label: "Payment-rail agnostic" },
              { icon: Zap, label: "Single POST to provision" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 text-sm text-surface-400"
              >
                <Icon className="h-4 w-4 text-surface-500" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
