import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import {
  Github,
  BookOpen,
  Layers,
  Cpu,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OSP - Open Service Protocol",
  description:
    "The open standard for AI agents to discover, provision, and manage developer services. No gatekeeping. No lock-in.",
  openGraph: {
    title: "OSP - Open Service Protocol",
    description:
      "The open standard for AI agents to discover, provision, and manage developer services.",
    url: "https://osp.dev",
    siteName: "OSP",
    type: "website",
  },
};

const navLinks = [
  { href: "/spec", label: "Spec", icon: BookOpen },
  { href: "/providers", label: "Providers", icon: Layers },
  { href: "/skills", label: "Skills", icon: Cpu },
];

const footerSections = [
  {
    title: "Protocol",
    links: [
      { href: "/spec", label: "Specification" },
      { href: "/providers", label: "Provider Directory" },
      { href: "/skills", label: "Skill Browser" },
    ],
  },
  {
    title: "Developers",
    links: [
      {
        href: "https://github.com/openserviceprotocol/osp",
        label: "GitHub",
        external: true,
      },
      {
        href: "https://github.com/openserviceprotocol/osp/blob/main/docs/getting-started.md",
        label: "Getting Started",
        external: true,
      },
      {
        href: "https://github.com/openserviceprotocol/osp/blob/main/CONTRIBUTING.md",
        label: "Contributing",
        external: true,
      },
    ],
  },
  {
    title: "Community",
    links: [
      {
        href: "https://github.com/openserviceprotocol/osp/discussions",
        label: "Discussions",
        external: true,
      },
      {
        href: "https://github.com/openserviceprotocol/osp/issues",
        label: "Issues",
        external: true,
      },
    ],
  },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-500 font-sans text-sm font-bold text-white transition-transform duration-200 group-hover:scale-105">
            O
          </div>
          <span className="font-sans text-lg font-bold tracking-tight text-surface-100">
            OSP
          </span>
        </a>

        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-300 transition-colors duration-150 hover:bg-surface-800 hover:text-surface-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
          <div className="ml-3 h-5 w-px bg-surface-700" />
          <a
            href="https://github.com/openserviceprotocol/osp"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 flex items-center gap-2 rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-surface-100 transition-colors duration-150 hover:bg-surface-700"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-surface-700/50 bg-surface-950">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-500 font-sans text-sm font-bold text-white">
                O
              </div>
              <span className="font-sans text-lg font-bold tracking-tight text-surface-100">
                OSP
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-surface-400">
              Open Service Protocol. The open standard for AI agents to
              discover and provision developer services.
            </p>
            <p className="mt-3 text-xs text-surface-500">Apache 2.0 Licensed</p>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
                {section.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...("external" in link && link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="group flex items-center gap-1 text-sm text-surface-400 transition-colors duration-150 hover:text-surface-100"
                    >
                      {link.label}
                      {"external" in link && link.external && (
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-surface-800 pt-8">
          <p className="text-xs text-surface-500">
            Built by the OSP community
          </p>
          <a
            href="https://sardis.sh"
            className="flex items-center gap-1.5 text-xs text-surface-500 transition-colors duration-150 hover:text-surface-300"
          >
            Founding maintainer: Sardis
            <ArrowUpRight className="h-3 w-3" />
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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
