import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

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
      "Discover and provision a managed PostgreSQL database via Supabase\u2019s OSP endpoint. Supports free, pro, and team tiers.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "rotate-credentials"],
  },
  {
    id: "neon-postgres",
    provider: "Neon",
    name: "Provision Neon Serverless Postgres",
    description:
      "Provision a serverless Postgres database with branching support via Neon\u2019s OSP endpoint.",
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
      "Provision application hosting, databases, and cron jobs on Railway\u2019s infrastructure.",
    category: "Hosting",
    actions: ["discover", "provision", "deprovision", "status", "logs"],
  },
  {
    id: "upstash-redis",
    provider: "Upstash",
    name: "Provision Upstash Redis",
    description:
      "Create a serverless Redis database with per-request pricing via Upstash\u2019s OSP endpoint.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "rotate-credentials"],
  },
  {
    id: "turso-sqlite",
    provider: "Turso",
    name: "Provision Turso SQLite",
    description:
      "Create an embedded SQLite database with global replication via Turso\u2019s OSP endpoint.",
    category: "Database",
    actions: ["discover", "provision", "deprovision", "replicate"],
  },
  {
    id: "resend-email",
    provider: "Resend",
    name: "Provision Resend Email",
    description:
      "Set up transactional email sending with domain verification via Resend\u2019s OSP endpoint.",
    category: "Email",
    actions: ["discover", "provision", "deprovision", "verify-domain"],
  },
  {
    id: "clerk-auth",
    provider: "Clerk",
    name: "Provision Clerk Auth",
    description:
      "Set up authentication with user management, SSO, and prebuilt components via Clerk\u2019s OSP endpoint.",
    category: "Auth",
    actions: ["discover", "provision", "deprovision", "configure"],
  },
  {
    id: "posthog-analytics",
    provider: "PostHog",
    name: "Provision PostHog Analytics",
    description:
      "Set up product analytics, feature flags, and session replay via PostHog\u2019s OSP endpoint.",
    category: "Analytics",
    actions: ["discover", "provision", "deprovision", "configure"],
  },
];

export default function SkillsPage() {
  return (
    <div>
      {/* Header */}
      <section className="relative border-b border-surface-800 py-20 lg:py-24">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
            Skills
          </p>
          <h1 className="mt-4 font-sans text-4xl font-bold tracking-tight text-surface-50 lg:text-5xl">
            Skill Browser
          </h1>
          <p className="mt-4 max-w-xl text-lg text-surface-400">
            LLM skills for discovering and provisioning services through OSP.
            Load these into any agent that supports tool use.
          </p>
        </div>
      </section>

      {/* Skills list */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="space-y-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-xl border border-surface-700/50 bg-surface-800/30 p-6 transition-colors duration-200 hover:border-surface-600 hover:bg-surface-800/50"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-sans text-lg font-semibold text-surface-100">
                        {skill.name}
                      </h2>
                      <span className="rounded-full border border-surface-700 bg-surface-800 px-3 py-1 text-xs font-medium text-surface-400">
                        {skill.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-surface-500">
                      Provider: {skill.provider}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-surface-400">
                  {skill.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {skill.actions.map((action) => (
                    <span
                      key={action}
                      className="rounded-md border border-surface-700 bg-surface-800/50 px-2.5 py-1 font-mono text-xs text-surface-400"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 rounded-xl border border-surface-700 bg-surface-800/30 p-10 text-center">
            <h3 className="font-sans text-xl font-bold text-surface-100">
              Build your own skill
            </h3>
            <p className="mt-3 text-sm text-surface-400">
              OSP skills follow a standard format that works with any LLM agent
              framework. Check the skills directory for templates.
            </p>
            <a
              href="https://github.com/openserviceprotocol/osp/tree/main/skills"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent-400 transition-colors duration-150 hover:text-accent-300"
            >
              View Skills on GitHub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
