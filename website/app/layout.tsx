import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { BookOpen, Layers, Cpu, ArrowUpRight } from "lucide-react";
import { MobileNav } from "./components/mobile-nav";
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
    "The open standard for AI agents to discover, provision, and manage developer services.",
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
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-sans text-base font-bold text-white">
            O
          </div>
          <span className="font-sans text-xl font-bold tracking-tight text-surface-50">
            OSP
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-300 transition-colors duration-150 hover:bg-surface-800 hover:text-surface-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <div className="ml-3 h-5 w-px bg-surface-700" />
          <a
            href="https://github.com/openserviceprotocol/osp"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 flex items-center gap-2 rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-surface-100 transition-colors duration-150 hover:bg-surface-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
        </div>

        {/* Mobile nav */}
        <MobileNav />
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-surface-700/50 bg-surface-950">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-sans text-base font-bold text-white">
                O
              </div>
              <span className="font-sans text-xl font-bold tracking-tight text-surface-50">
                OSP
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-surface-400">
              The open standard for AI agents to discover and provision
              developer services.
            </p>
            <p className="mt-3 text-xs text-surface-500">Apache 2.0 Licensed</p>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-sans text-xs font-semibold uppercase tracking-widest text-surface-400">
                {section.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => {
                  const isExternal = "external" in link && link.external;
                  return (
                    <li key={link.label}>
                      {isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-1 text-sm text-surface-400 transition-colors duration-150 hover:text-surface-100"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-surface-400 transition-colors duration-150 hover:text-surface-100"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
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
