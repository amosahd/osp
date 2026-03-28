import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSP - Open Service Protocol",
  description:
    "An open standard for AI agents to discover, provision, and manage developer services.",
  openGraph: {
    title: "OSP - Open Service Protocol",
    description:
      "An open standard for AI agents to discover, provision, and manage developer services.",
    url: "https://osp.dev",
    siteName: "OSP",
    type: "website",
  },
};

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="text-xl font-bold tracking-tight">
          OSP
        </a>
        <div className="flex items-center gap-8">
          <a
            href="/spec"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Specification
          </a>
          <a
            href="/providers"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Providers
          </a>
          <a
            href="/skills"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Skills
          </a>
          <a
            href="https://github.com/openserviceprotocol/osp"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-bold">OSP</h3>
            <p className="mt-2 text-sm text-gray-600">
              Open Service Protocol. Apache 2.0 licensed.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Protocol</h4>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              <li>
                <a href="/spec" className="hover:text-gray-900">
                  Specification
                </a>
              </li>
              <li>
                <a href="/providers" className="hover:text-gray-900">
                  Provider Directory
                </a>
              </li>
              <li>
                <a href="/skills" className="hover:text-gray-900">
                  Skill Browser
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Developers</h4>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              <li>
                <a
                  href="https://github.com/openserviceprotocol/osp"
                  className="hover:text-gray-900"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/openserviceprotocol/osp/blob/main/docs/getting-started.md"
                  className="hover:text-gray-900"
                >
                  Getting Started
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/openserviceprotocol/osp/blob/main/CONTRIBUTING.md"
                  className="hover:text-gray-900"
                >
                  Contributing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Community</h4>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              <li>
                <a
                  href="https://github.com/openserviceprotocol/osp/discussions"
                  className="hover:text-gray-900"
                >
                  Discussions
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/openserviceprotocol/osp/issues"
                  className="hover:text-gray-900"
                >
                  Issues
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          Built by the OSP community. Founding maintainer:{" "}
          <a
            href="https://sardis.sh"
            className="text-gray-700 hover:text-gray-900"
          >
            Sardis
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
