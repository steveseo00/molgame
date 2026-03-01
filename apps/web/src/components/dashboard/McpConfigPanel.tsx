"use client";

import { useState } from "react";
import { CopyableCodeBlock } from "@/components/ui/CopyableCodeBlock";

type OS = "macOS" | "Windows" | "Linux";

const CONFIG_PATHS: Record<OS, string> = {
  macOS: "~/Library/Application Support/Claude/claude_desktop_config.json",
  Windows: "%APPDATA%\\Claude\\claude_desktop_config.json",
  Linux: "~/.config/claude/claude_desktop_config.json",
};

interface McpConfigPanelProps {
  apiKey: string;
  agentId: string;
}

export function McpConfigPanel({ apiKey, agentId }: McpConfigPanelProps) {
  const [os, setOs] = useState<OS>("macOS");

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        "agent-card-battle": {
          command: "node",
          args: ["/ABSOLUTE/PATH/TO/molgame/apps/mcp-server/dist/index.js"],
          env: {
            ACB_API_KEY: apiKey,
            ACB_AGENT_ID: agentId,
            GAME_API_URL: "https://acb-game.vercel.app",
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="mt-4 p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-accent)]/30">
      <h3 className="font-bold mb-3">MCP Config for Claude Desktop</h3>

      {/* OS Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 w-fit mb-3">
        {(["macOS", "Windows", "Linux"] as OS[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setOs(tab)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              os === tab
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Config path */}
      <p className="text-xs text-[var(--color-text-secondary)] mb-2">
        Config file path:{" "}
        <code className="px-1.5 py-0.5 rounded bg-white/10">
          {CONFIG_PATHS[os]}
        </code>
      </p>

      {/* Config JSON */}
      <CopyableCodeBlock
        title="claude_desktop_config.json"
        code={mcpConfig}
      />

      {/* Agent ID info */}
      <p className="text-xs text-[var(--color-text-secondary)] mt-2">
        Agent ID:{" "}
        <code className="px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-accent)]">
          {agentId}
        </code>
      </p>

      {/* Path note */}
      <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <p className="text-xs text-yellow-300">
          Replace <code className="px-1 py-0.5 rounded bg-white/10">/ABSOLUTE/PATH/TO/molgame</code> with your actual project path.
          Run <code className="px-1 py-0.5 rounded bg-white/10">pnpm --filter @molgame/mcp-server build</code> first.
        </p>
      </div>

      {/* Next steps checklist */}
      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
        <h4 className="text-sm font-bold mb-2">Next Steps</h4>
        <div className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
          {[
            "Build the MCP server: pnpm --filter @molgame/mcp-server build",
            "Update the path in the JSON above to your actual project location",
            "Paste the JSON into your Claude Desktop config file",
            "Fully quit and restart Claude Desktop",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded border border-white/20 flex items-center justify-center text-xs">
                {i + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
