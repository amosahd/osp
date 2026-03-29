import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Shield,
  Zap,
  Database,
  Cloud,
  Mail,
  Lock,
  BarChart3,
  Server,
} from "lucide-react";
import { TerminalDemo } from "./components/terminal-demo";

/* ────────────────────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────────────────────── */

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
  Database,
  Infrastructure: Cloud,
  Hosting: Server,
  Email: Mail,
  Auth: Lock,
  Analytics: BarChart3,
};

const steps = [
  {
    num: "01",
    title: "Discover",
    desc: "Providers publish a machine-readable manifest at a well-known URL. Agents fetch it to see every offering, tier, and price.",
    code: `GET /.well-known/osp.json

{
  "provider": "supabase",
  "offerings": [{
    "id": "postgres",
    "tiers": ["free", "pro", "team"]
  }]
}`,
  },
  {
    num: "02",
    title: "Provision",
    desc: "One POST request creates the resource. Credentials come back encrypted with the agent\u2019s own Ed25519 key.",
    code: `POST /osp/v1/provision
{
  "offering_id": "supabase/postgres",
  "tier_id": "free",
  "agent_public_key": "ed25519_key"
}`,
  },
  {
    num: "03",
    title: "Manage",
    desc: "Status checks, credential rotation, usage tracking, tier upgrades, and deprovisioning\u2014all through the same standard endpoints.",
    code: `GET  /osp/v1/status/proj_abc123
POST /osp/v1/rotate/proj_abc123
GET  /osp/v1/usage/proj_abc123`,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-accent-500/[0.05] blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="max-w-3xl">
            <h1 className="font-sans text-4xl font-bold leading-[1.08] tracking-tight text-surface-50 md:text-5xl lg:text-7xl">
              One protocol for
              <br />
              every AI agent
              <br />
              <span className="text-accent-400">service</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-surface-300">
              OSP is an open standard that lets AI agents discover, provision,
              and manage developer services&mdash;databases, hosting, auth,
              and more&mdash;through a single protocol.
            </p>

            <a
              href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
              className="group mt-10 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-600"
            >
              Become a Provider
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Inline demo */}
          <div className="mt-16 lg:mt-20">
            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* ── What & Who ───────────────────────────────────────────────────── */}
      <section className="border-t border-surface-800 bg-surface-950 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
              What is OSP?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-surface-300">
              Today, every cloud provider has a different API. Every integration
              is custom. Every agent needs bespoke code for each service it
              wants to use. OSP solves this by defining a{" "}
              <strong className="text-surface-100">
                single, open protocol
              </strong>{" "}
              for service discovery, provisioning, and lifecycle management.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-surface-700 bg-surface-700 md:grid-cols-3">
            {[
              {
                icon: Globe,
                title: "For service providers",
                desc: "Publish a manifest at a well-known URL. Any AI agent in the world can discover and provision your service.",
              },
              {
                icon: Zap,
                title: "For agent builders",
                desc: "Integrate once with OSP. Your agent can provision databases, hosting, auth, email, and analytics from any provider.",
              },
              {
                icon: Shield,
                title: "For the ecosystem",
                desc: "An open standard with Ed25519 encryption, Apache 2.0 license, and zero payment-rail lock-in.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-surface-900 p-8 lg:p-10">
                  <Icon className="h-5 w-5 text-accent-400" />
                  <h3 className="mt-4 font-sans text-lg font-semibold text-surface-100">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-surface-400">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-surface-800 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
              How it works
            </p>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
              Three steps to a running service
            </h2>
          </div>

          <div className="mt-16 space-y-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="grid grid-cols-1 gap-6 rounded-xl border border-surface-700/50 bg-surface-800/30 p-6 lg:grid-cols-2 lg:p-8"
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
                <div className="rounded-lg bg-surface-950 border border-surface-700/50 p-5 font-mono text-xs leading-6 text-surface-300 whitespace-pre overflow-x-auto">
                  {step.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider ecosystem ────────────────────────────────────────────── */}
      <section className="border-t border-surface-800 bg-surface-950 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
                Ecosystem
              </p>
              <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
                Growing provider ecosystem
              </h2>
              <p className="mt-3 max-w-lg text-surface-400">
                Example manifests ship for real services. Any provider can
                self-register by publishing a manifest at their domain.
              </p>
            </div>
            <Link
              href="/providers"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent-400 transition-colors duration-150 hover:text-accent-300"
            >
              View all providers
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {providers.map((p) => {
              const Icon = categoryIcons[p.category] || Globe;
              return (
                <Link
                  key={p.name}
                  href="/providers"
                  className="group rounded-xl border border-surface-700/50 bg-surface-800/30 p-5 transition-colors duration-200 hover:border-surface-600 hover:bg-surface-800/60 cursor-pointer"
                >
                  <Icon className="h-5 w-5 text-surface-500 transition-colors duration-200 group-hover:text-accent-400" />
                  <h3 className="mt-3 font-sans text-sm font-semibold text-surface-200">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs text-surface-500">{p.category}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-surface-800 py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight text-surface-100 lg:text-4xl">
            Ready to join the ecosystem?
          </h2>
          <p className="mt-4 text-lg text-surface-400">
            Publish a ServiceManifest and let every AI agent in the world
            discover your service.
          </p>
          <a
            href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
            className="group mt-10 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-600"
          >
            Become a Provider
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
