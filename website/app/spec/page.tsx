import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specification - OSP",
  description: "The full Open Service Protocol v1.0 specification.",
};

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content:
      "The Open Service Protocol (OSP) defines a standard interface through which AI agents and automated processes discover, provision, manage, and deprovision developer services such as databases, hosting platforms, authentication providers, and analytics systems. OSP is payment-rail agnostic, provider-neutral, and designed for machine-to-machine interaction without browser-based signup flows.",
  },
  {
    id: "discovery",
    title: "4. Discovery",
    content:
      'Providers publish a ServiceManifest at /.well-known/osp.json. This document advertises the provider\'s identity, available offerings, tiers, pricing, and the base URL for OSP API operations. Agents discover services by fetching this well-known endpoint or querying an OSP registry.',
  },
  {
    id: "provisioning",
    title: "5. Provisioning",
    content:
      "When an agent decides to use a service, it sends a ProvisionRequest to the provider's /osp/v1/provision endpoint. The provider creates the resource and returns a ProvisionResponse containing a resource_id, status, and an encrypted CredentialBundle. Provisioning can be synchronous (immediate) or asynchronous (polling-based).",
  },
  {
    id: "endpoints",
    title: "6. Provider Endpoints",
    content:
      "OSP defines standard endpoints for provisioning, deprovisioning, credential retrieval and rotation, status checks, usage reporting, health monitoring, disputes, webhook management, cost estimation, resource sharing, delegation, snapshots, metrics, migration, and canary deployments.",
  },
  {
    id: "security",
    title: "8. Security",
    content:
      "All credential bundles are encrypted using the agent's Ed25519 public key. Manifests are signed to prevent tampering. Nonce-based replay protection is used for all mutating operations. TLS 1.2+ is required for all transport.",
  },
];

const endpoints = [
  { method: "GET", path: "/.well-known/osp.json", desc: "Service discovery" },
  {
    method: "POST",
    path: "/osp/v1/provision",
    desc: "Provision a new resource",
  },
  {
    method: "DELETE",
    path: "/osp/v1/deprovision/{id}",
    desc: "Deprovision a resource",
  },
  {
    method: "GET",
    path: "/osp/v1/credentials/{id}",
    desc: "Retrieve credentials",
  },
  {
    method: "POST",
    path: "/osp/v1/rotate/{id}",
    desc: "Rotate credentials",
  },
  { method: "GET", path: "/osp/v1/status/{id}", desc: "Resource status" },
  { method: "GET", path: "/osp/v1/usage/{id}", desc: "Usage report" },
  { method: "GET", path: "/osp/v1/health", desc: "Provider health check" },
  { method: "POST", path: "/osp/v1/estimate", desc: "Cost estimation" },
];

export default function SpecPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        OSP v1.0 Specification
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Draft &mdash; March 2026. Read the{" "}
        <a
          href="https://github.com/openserviceprotocol/osp/blob/main/spec/osp-v1.0.md"
          className="text-osp-600 underline hover:text-osp-800"
        >
          full specification on GitHub
        </a>
        .
      </p>

      <div className="mt-12 space-y-12">
        {sections.map((section) => (
          <div key={section.id} id={section.id}>
            <h2 className="text-2xl font-bold text-gray-900">
              {section.title}
            </h2>
            <p className="mt-3 text-gray-600 leading-7">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900">
          Endpoint Reference
        </h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-900">
                  Method
                </th>
                <th className="px-6 py-3 font-semibold text-gray-900">Path</th>
                <th className="px-6 py-3 font-semibold text-gray-900">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {endpoints.map((ep) => (
                <tr key={ep.path}>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        ep.method === "GET"
                          ? "bg-green-100 text-green-800"
                          : ep.method === "POST"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-sm text-gray-700">
                    {ep.path}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-16 rounded-xl border border-osp-200 bg-osp-50 p-8 text-center">
        <p className="text-gray-700">
          This is a summary view.{" "}
          <a
            href="https://github.com/openserviceprotocol/osp/blob/main/spec/osp-v1.0.md"
            className="font-semibold text-osp-700 underline hover:text-osp-900"
          >
            Read the complete specification on GitHub
          </a>{" "}
          for full details on protocol objects, security, webhooks, billing, and
          more.
        </p>
      </div>
    </div>
  );
}
