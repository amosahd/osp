import type { Metadata } from "next";

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
    description: "Modern email API for developers. Transactional and marketing email.",
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

const categories = [
  "All",
  ...Array.from(new Set(providers.map((p) => p.category))),
];

export default function ProvidersPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Provider Directory
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Services with example OSP manifests. Any provider can self-register by
          publishing a ServiceManifest at{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono">
            /.well-known/osp.json
          </code>
          .
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span
            key={cat}
            className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex flex-col rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {provider.name}
                </h2>
                <p className="text-sm text-gray-500">{provider.domain}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {provider.category}
              </span>
            </div>
            <p className="mt-3 flex-1 text-sm text-gray-600">
              {provider.description}
            </p>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Offerings
              </h3>
              <ul className="mt-2 space-y-1">
                {provider.offerings.map((o) => (
                  <li
                    key={o.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{o.name}</span>
                    <span className="text-xs text-gray-400">
                      {o.tiers.join(" / ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Want to add your service?
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Publish a ServiceManifest at your domain and submit a PR to the OSP
          repository.
        </p>
        <a
          href="https://github.com/openserviceprotocol/osp/blob/main/docs/for-providers.md"
          className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Provider Guide
        </a>
      </div>
    </div>
  );
}
