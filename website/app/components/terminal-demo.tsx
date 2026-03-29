"use client";

import { useState, useEffect } from "react";

const lines = [
  { type: "comment", text: "# Discover offerings" },
  { type: "command", text: "curl https://api.supabase.com/.well-known/osp.json" },
  { type: "blank" },
  { type: "comment", text: "# Provision a database with one request" },
  { type: "command", text: "curl -X POST /osp/v1/provision \\" },
  { type: "continuation", text: '  -d \'{"offering_id": "supabase/postgres", "tier_id": "free"}\'' },
  { type: "blank" },
  { type: "comment", text: "# Done." },
  { type: "output", text: '{ "resource_id": "proj_abc123", "status": "provisioned" }' },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= lines.length) return;
    const delay = lines[visibleLines]?.type === "blank" ? 200 : 120;
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-950 overflow-hidden shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-surface-700/60 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-surface-600" />
          <div className="h-3 w-3 rounded-full bg-surface-600" />
          <div className="h-3 w-3 rounded-full bg-surface-600" />
        </div>
        <span className="flex-1 text-center font-mono text-xs text-surface-500">
          terminal
        </span>
      </div>
      <div className="p-6 font-mono text-sm leading-7 min-h-[280px]">
        {lines.slice(0, visibleLines).map((line, i) => {
          if (line.type === "blank") return <div key={i} className="h-4" />;
          if (line.type === "comment")
            return (
              <div key={i} className="text-surface-500">
                {line.text}
              </div>
            );
          if (line.type === "command")
            return (
              <div key={i}>
                <span className="text-accent-400">$</span>{" "}
                <span className="text-surface-200">{line.text}</span>
              </div>
            );
          if (line.type === "continuation")
            return (
              <div key={i} className="text-surface-200">
                {line.text}
              </div>
            );
          if (line.type === "output")
            return (
              <div key={i} className="text-warm-500">
                {line.text}
              </div>
            );
          return null;
        })}
        {visibleLines < lines.length && (
          <span className="inline-block w-2 h-5 bg-surface-300 animate-typing-cursor" />
        )}
      </div>
    </div>
  );
}
