import type { Metadata } from "next";
import {
  ArrowRight,
  Database,
  Cloud,
  Server,
  Mail,
  Lock,
  BarChart3,
  Globe,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Provider Directory - OSP",
  description:
    "Browse service providers with OSP example manifests. Databases, hosting, auth, email, and analytics.",
};

const providers = [
  {
    id: "supabase",
    name: "Supabase",
    domain: "supabase.com",
    category: "Database",
    description:
      "Open-source Firebase alternative with managed PostgreSQL, Auth, Storage, and Edge Functions.",
    offerings: [
      { name: "Managed PostgreSQL", tiers: ["Free", "Pro", "Team"] },
      { name: "Auth", tiers: ["Free", "Pro"] },
      { name: "Storage", tiers: ["Free", "Pro"] },
      { name: "Edge Functions", tiers: ["Free", "Pro"] },
    ],
  },
  {
    id: "neon",
    name: "Neon",
    domain: "neon.tech",
    category: "Database",
    description:
      "Serverless Postgres with branching, autoscaling, and a generous free tier.",
    offerings: [
      { name: "Serverless Postgres", tiers: ["Free", "Launch", "Scale"] },
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "Infrastructure",
    description:
      "Global cloud platform with Workers, R2 object storage, D1 SQL database, and KV store.",
    offerings: [
      { name: "Workers", tiers: ["Free", "Paid"] },
      { name: "R2 Storage", tiers: ["Free", "Paid"] },
      { name: "D1 Database", tiers: ["Free", "Paid"] },
      { name: "KV Store", tiers: ["Free", "Paid"] },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    domain: "vercel.com",
    category: "Hosting",
    description:
      "Frontend cloud platform for deploying web applications with serverless and edge functions.",
    offerings: [
      { name: "Frontend Hosting", tiers: ["Hobby", "Pro", "Enterprise"] },
      { name: "Edge Functions", tiers: ["Hobby", "Pro"] },
    ],
  },
  {
    id: "railway",
    name: "Railway",
    domain: "railway.app",
    category: "Hosting",
    description:
      "Infrastructure platform for deploying apps, databases, and scheduled jobs.",
    offerings: [
      { name: "App Hosting", tiers: ["Trial", "Pro"] },
      { name: "Databases", tiers: ["Trial", "Pro"] },
      { name: "Cron Jobs", tiers: ["Trial", "Pro"] },
    ],
  },
  {
    id: "upstash",
    name: "Upstash",
    domain: "upstash.com",
    category: "Database",
    description:
      "Serverless data platform with Redis, Kafka, and QStash message queue.",
    offerings: [
      { name: "Serverless Redis", tiers: ["Free", "Pay-as-you-go", "Pro"] },
      { name: "Kafka", tiers: ["Free", "Pay-as-you-go"] },
      { name: "QStash", tiers: ["Free", "Pay-as-you-go"] },
    ],
  },
  {
    id: "turso",
    name: "Turso",
    domain: "turso.tech",
    category: "Database",
    description:
      "Embedded SQLite database with replication at the edge, built on libSQL.",
    offerings: [
      { name: "Embedded SQLite", tiers: ["Starter", "Scaler", "Enterprise"] },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    domain: "resend.com",
    category: "Email",
    description:
      "Modern email API for developers. Transactional and marketing email.",
    offerings: [
      { name: "Transactional Email", tiers: ["Free", "Pro", "Enterprise"] },
    ],
  },
  {
    id: "clerk",
    name: "Clerk",
    domain: "clerk.com",
    category: "Auth",
    description:
      "Authentication and user management with prebuilt components and flexible APIs.",
    offerings: [
      { name: "Authentication", tiers: ["Free", "Pro", "Enterprise"] },
    ],
  },
  {
    id: "posthog",
    name: "PostHog",
    domain: "posthog.com",
    category: "Analytics",
    description:
      "Open-source product analytics suite with feature flags, session replay, and A/B testing.",
    offerings: [
      { name: "Product Analytics", tiers: ["Free", "Growth"] },
      { name: "Feature Flags", tiers: ["Free", "Growth"] },
    ],
  },
];

const categoryIcons: Record<string, typeof Database> = {
  Database,
  Infrastructure: Cloud,
  Hosting: Server,
  Email: Mail,
  Auth: Lock,
  Analytics: BarChart3,
};

export default function ProvidersPage() {
  return (
    <div>
      {/* Header */}
      <section className="relative border-b border-surface-800 py-20 lg:py-24">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
            Ecosystem
          </p>
          <h1 className="mt-4 font-sans text-4xl font-bold tracking-tight text-surface-50 lg:text-5xl">
            Provider Directory
          </h1>
          <p className="mt-4 max-w-xl text-lg text-surface-400">
            Services with example OSP manifests. Any provider can self-register
            by publishing a ServiceManifest at{" "}
            <code className="rounded bg-surface-800 px-1.5 py-0.5 text-sm font-mono text-surface-300">
              /.well-known/osp.json
            </code>
          </p>
        </div>
      </section>

      {/* Provider grid */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => {
              const Icon = categoryIcons[provider.category] || Globe;
              return (
                <div
                  key={provider.id}
                  className="flex flex-col rounded-xl border border-surface-700/50 bg-surface-800/30 p-6 transition-colors duration-200 hover:border-surface-600 hover:bg-surface-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-surface-500" />
                      <div>
                        <h2 className="font-sans text-lg font-semibold text-surface-100">
                          {provider.name}
                        </h2>
                        <p className="text-xs text-surface-500">
                          {provider.domain}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-surface-700 bg-surface-800 px-3 py-1 text-xs font-medium text-surface-400">
                      {provider.category}
                    </span>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-relaxed text-surface-400">
                    {provider.description}
                  </p>

                  <div className="mt-5 border-t border-surface-700/50 pt-5">
                    <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-surface-500">
                      Offerings
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {provider.offerings.map((o) => (
                        <li
                          key={o.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-surface-300">{o.name}</span>
                          <span className="font-mono text-xs text-surface-500">
                            {o.tiers.join(" / ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-20 rounded-xl border border-surface-700 bg-surface-800/30 p-10 text-center">
            <h3 className="font-sans text-xl font-bold text-surface-100">
              Want to add your service?
            </h3>
            <p className="mt-3 text-sm text-surface-400">
              Publish a ServiceManifest at your domain and let every AI agent
              discover your service.
            </p>
            <a
              href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
              className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-600"
            >
              Become a Provider
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
