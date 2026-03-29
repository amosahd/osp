import type { Metadata } from "next";
import { ArrowUpRight, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Specification - OSP",
  description: "The full Open Service Protocol v1.0 specification.",
};

const sections = [
  {
    id: "introduction",
    number: "1",
    title: "Introduction",
    content:
      "The Open Service Protocol (OSP) defines a standard interface through which AI agents and automated processes discover, provision, manage, and deprovision developer services such as databases, hosting platforms, authentication providers, and analytics systems. OSP is payment-rail agnostic, provider-neutral, and designed for machine-to-machine interaction without browser-based signup flows.",
  },
  {
    id: "concepts",
    number: "2",
    title: "Core Concepts",
    content:
      "OSP is built around four core objects: ServiceManifest (published by providers to advertise offerings), ProvisionRequest (sent by agents to create resources), CredentialBundle (encrypted credentials returned to agents), and ResourceHandle (ongoing reference to a provisioned resource). All interactions follow a RESTful pattern with JSON payloads.",
  },
  {
    id: "discovery",
    number: "4",
    title: "Discovery",
    content:
      "Providers publish a ServiceManifest at /.well-known/osp.json. This document advertises the provider\u2019s identity, available offerings, tiers, pricing, and the base URL for OSP API operations. Agents discover services by fetching this well-known endpoint or querying an OSP registry.",
  },
  {
    id: "provisioning",
    number: "5",
    title: "Provisioning",
    content:
      "When an agent decides to use a service, it sends a ProvisionRequest to the provider\u2019s /osp/v1/provision endpoint. The provider creates the resource and returns a ProvisionResponse containing a resource_id, status, and an encrypted CredentialBundle. Provisioning can be synchronous (immediate) or asynchronous (polling-based).",
  },
  {
    id: "endpoints",
    number: "6",
    title: "Provider Endpoints",
    content:
      "OSP defines standard endpoints for provisioning, deprovisioning, credential retrieval and rotation, status checks, usage reporting, health monitoring, disputes, webhook management, cost estimation, resource sharing, delegation, snapshots, metrics, migration, and canary deployments.",
  },
  {
    id: "security",
    number: "8",
    title: "Security",
    content:
      "All credential bundles are encrypted using the agent\u2019s Ed25519 public key. Manifests are signed to prevent tampering. Nonce-based replay protection is used for all mutating operations. TLS 1.2+ is required for all transport.",
  },
];

const endpoints = [
  { method: "GET", path: "/.well-known/osp.json", desc: "Service discovery" },
  { method: "POST", path: "/osp/v1/provision", desc: "Provision a new resource" },
  { method: "DELETE", path: "/osp/v1/deprovision/{id}", desc: "Deprovision a resource" },
  { method: "GET", path: "/osp/v1/credentials/{id}", desc: "Retrieve credentials" },
  { method: "POST", path: "/osp/v1/rotate/{id}", desc: "Rotate credentials" },
  { method: "GET", path: "/osp/v1/status/{id}", desc: "Resource status" },
  { method: "GET", path: "/osp/v1/usage/{id}", desc: "Usage report" },
  { method: "GET", path: "/osp/v1/health", desc: "Provider health check" },
  { method: "POST", path: "/osp/v1/estimate", desc: "Cost estimation" },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  POST: "bg-accent-500/10 text-accent-400 border border-accent-500/20",
  DELETE: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function SpecPage() {
  return (
    <div>
      {/* Header */}
      <section className="relative border-b border-surface-800 py-20 lg:py-24">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative mx-auto max-w-4xl px-6">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-accent-400">
            Specification
          </p>
          <h1 className="mt-4 font-sans text-4xl font-bold tracking-tight text-surface-50 lg:text-5xl">
            OSP v1.0
          </h1>
          <p className="mt-4 text-lg text-surface-400">
            Draft &mdash; March 2026
          </p>
          <a
            href="https://github.com/openserviceprotocol/osp/blob/main/spec/osp-v1.0.md"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent-400 transition-colors duration-150 hover:text-accent-300"
          >
            <FileText className="h-4 w-4" />
            Full specification on GitHub
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-6">
          {/* Table of contents */}
          <nav className="mb-16 rounded-xl border border-surface-700 bg-surface-800/30 p-6">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
              Contents
            </h2>
            <ul className="mt-4 columns-1 gap-8 space-y-2 sm:columns-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm text-surface-400 transition-colors duration-150 hover:text-surface-100"
                  >
                    <span className="font-mono text-surface-500 mr-2">
                      {s.number}.
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#endpoint-ref"
                  className="text-sm text-surface-400 transition-colors duration-150 hover:text-surface-100"
                >
                  <span className="font-mono text-surface-500 mr-2">
                    &mdash;
                  </span>
                  Endpoint Reference
                </a>
              </li>
            </ul>
          </nav>

          {/* Sections */}
          <div className="space-y-16">
            {sections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm text-surface-500">
                    {section.number}.
                  </span>
                  <h2 className="font-sans text-2xl font-bold text-surface-100">
                    {section.title}
                  </h2>
                </div>
                <p className="mt-4 text-surface-300 leading-7 max-w-prose">
                  {section.content}
                </p>
              </article>
            ))}
          </div>

          {/* Endpoint reference */}
          <div id="endpoint-ref" className="mt-20 scroll-mt-24">
            <h2 className="font-sans text-2xl font-bold text-surface-100">
              Endpoint Reference
            </h2>
            <div className="mt-8 overflow-x-auto rounded-xl border border-surface-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-800/50">
                    <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
                      Method
                    </th>
                    <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
                      Path
                    </th>
                    <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {endpoints.map((ep) => (
                    <tr
                      key={ep.path}
                      className="transition-colors duration-150 hover:bg-surface-800/30"
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${methodColors[ep.method] || ""}`}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm text-surface-300">
                        {ep.path}
                      </td>
                      <td className="px-5 py-3.5 text-surface-400">
                        {ep.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 rounded-xl border border-accent-500/20 bg-accent-500/[0.05] p-8 text-center">
            <p className="text-surface-300">
              This is a summary.{" "}
              <a
                href="https://github.com/openserviceprotocol/osp/blob/main/spec/osp-v1.0.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent-400 underline underline-offset-2 hover:text-accent-300"
              >
                Read the complete specification on GitHub
              </a>{" "}
              for full details on protocol objects, security, webhooks, billing,
              and more.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
