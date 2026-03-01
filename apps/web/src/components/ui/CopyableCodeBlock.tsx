"use client";

import { useState } from "react";

interface CopyableCodeBlockProps {
  title?: string;
  code: string;
}

export function CopyableCodeBlock({ title, code }: CopyableCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg overflow-hidden border border-white/10">
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-white/5">
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
            {title}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-[var(--color-text-secondary)] hover:text-white cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      {!title && (
        <div className="flex justify-end px-3 py-1.5 bg-white/5">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-[var(--color-text-secondary)] hover:text-white cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-3 text-sm font-mono overflow-x-auto bg-white/[0.02]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
