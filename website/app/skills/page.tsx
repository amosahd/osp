import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skill Browser - OSP",
  description:
    "Browse LLM skills for provisioning developer services through the Open Service Protocol.",
};

const skills = [
  {
    id: "supabase-postgres",
    provider: "Supabase",
    name: "Provision Supabase PostgreSQL",
    description:
      "Discover and provision a managed PostgreSQL database via Supabase's OSP endpoint. Supports free, pro, and team tiers.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "rotate-credentials"],
  },
  {
    id: "neon-postgres",
    provider: "Neon",
    name: "Provision Neon Serverless Postgres",
    description:
      "Provision a serverless Postgres database with branching support via Neon's OSP endpoint.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "branch"],
  },
  {
    id: "cloudflare-workers",
    provider: "Cloudflare",
    name: "Deploy Cloudflare Worker",
    description:
      "Provision a Cloudflare Worker with KV bindings, R2 storage, or D1 database attachments.",
    category: "Infrastructure",
    actions: ["discover", "provision", "deprovision", "upgrade"],
  },
  {
    id: "vercel-deploy",
    provider: "Vercel",
    name: "Deploy to Vercel",
    description:
      "Provision a frontend deployment on Vercel with automatic builds and edge functions.",
    category: "Hosting",
    actions: ["discover", "provision", "deprovision", "status"],
  },
  {
    id: "railway-app",
    provider: "Railway",
    name: "Deploy on Railway",
    description:
      "Provision application hosting, databases, and cron jobs on Railway's infrastructure.",
    category: "Hosting",
    actions: ["discover", "provision", "deprovision", "status", "logs"],
  },
  {
    id: "upstash-redis",
    provider: "Upstash",
    name: "Provision Upstash Redis",
    description:
      "Create a serverless Redis database with per-request pricing via Upstash's OSP endpoint.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "rotate-credentials"],
  },
  {
    id: "turso-sqlite",
    provider: "Turso",
    name: "Provision Turso SQLite",
    description:
      "Create an embedded SQLite database with global replication via Turso's OSP endpoint.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "replicate"],
  },
  {
    id: "resend-email",
    provider: "Resend",
    name: "Provision Resend Email",
    description:
      "Set up transactional email sending with domain verification via Resend's OSP endpoint.",
    category: "Email",
    actions: ["discover", "provision", "deprovision", "verify-domain"],
  },
  {
    id: "clerk-auth",
    provider: "Clerk",
    name: "Provision Clerk Auth",
    description:
      "Set up authentication with user management, SSO, and prebuilt components via Clerk's OSP endpoint.",
    category: "Auth",
    actions: ["discover", "provision", "deprovision", "configure"],
  },
  {
    id: "posthog-analytics",
    provider: "PostHog",
    name: "Provision PostHog Analytics",
    description:
      "Set up product analytics, feature flags, and session replay via PostHog's OSP endpoint.",
    category: "Analytics",
    actions: ["discover", "provision", "deprovision", "configure"],
  },
];

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Skill Browser
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          LLM skills for discovering and provisioning services through OSP.
          These skills can be loaded into any agent that supports tool use.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {skill.name}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {skill.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Provider: {skill.provider}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">{skill.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {skill.actions.map((action) => (
                <span
                  key={action}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-mono text-gray-600"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Build your own skill
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          OSP skills follow a standard format that works with any LLM agent
          framework. Check the skills directory for templates.
        </p>
        <a
          href="https://github.com/openserviceprotocol/osp/tree/main/skills"
          className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          View Skills on GitHub
        </a>
      </div>
    </div>
  );
}
