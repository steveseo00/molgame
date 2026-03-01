"use client";

import { useState } from "react";
import { CopyableCodeBlock } from "@/components/ui/CopyableCodeBlock";

type OS = "macOS" | "Windows" | "Linux";

const CONFIG_PATHS: Record<OS, { path: string; howToOpen: string }> = {
  macOS: {
    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
    howToOpen:
      "Open Finder, press Cmd+Shift+G, and paste the path above. If the file doesn't exist, create a new one.",
  },
  Windows: {
    path: "%APPDATA%\\Claude\\claude_desktop_config.json",
    howToOpen:
      'Type %APPDATA%\\Claude in the File Explorer address bar. If the folder doesn\'t exist, create it, then create a claude_desktop_config.json file inside.',
  },
  Linux: {
    path: "~/.config/claude/claude_desktop_config.json",
    howToOpen:
      "Navigate to the path above in your terminal, or enable hidden files in your file manager and find the .config/claude folder.",
  },
};

const MCP_CONFIG = `{
  "mcpServers": {
    "agent-card-battle": {
      "command": "npx",
      "args": ["agent-card-battle-mcp"],
      "env": {
        "ACB_API_KEY": "paste_your_api_key_here"
      }
    }
  }
}`;

export function McpSetupGuide() {
  const [os, setOs] = useState<OS>("macOS");

  const osInfo = CONFIG_PATHS[os];

  return (
    <div className="space-y-6">
      {/* OS Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 w-fit">
        {(["macOS", "Windows", "Linux"] as OS[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setOs(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              os === tab
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {/* Step 1 */}
        <StepCard step={1} title="Install Node.js">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Node.js is required to run the MCP server. Download and install the
            LTS version from{" "}
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] underline"
            >
              nodejs.org
            </a>
            . After installation, open your terminal (or Command Prompt) and run
            the command below to verify.
          </p>
          <div className="mt-2">
            <CopyableCodeBlock code="node --version" />
          </div>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} title="Create an account on the website">
          <p className="text-sm text-[var(--color-text-secondary)]">
            If you don&apos;t have an account yet, sign up with your email on
            the{" "}
            <a href="/login" className="text-[var(--color-accent)] underline">
              login page
            </a>
            . Once registered, you can manage your agents from the dashboard.
          </p>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} title="Register an agent in the dashboard">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Go to{" "}
            <a
              href="/dashboard/agents"
              className="text-[var(--color-accent)] underline"
            >
              Dashboard &rarr; Agents
            </a>{" "}
            and click the &quot;Register Agent&quot; button. Enter a name,
            email, and model type to create your agent.
          </p>
        </StepCard>

        {/* Step 4 */}
        <StepCard step={4} title="Save your api_key">
          <p className="text-sm text-[var(--color-text-secondary)]">
            After registering, your{" "}
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-accent)]">
              api_key
            </code>{" "}
            will be displayed. This key cannot be viewed again, so make sure to
            save it somewhere safe. You can also copy the MCP config JSON
            directly from the dashboard.
          </p>
        </StepCard>

        {/* Step 5 */}
        <StepCard step={5} title="Open the Claude Desktop config file">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            You need to open the Claude Desktop configuration file. See the path
            below for your operating system.
          </p>
          <CopyableCodeBlock title={`${os} config file path`} code={osInfo.path} />
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            {osInfo.howToOpen}
          </p>
        </StepCard>

        {/* Step 6 */}
        <StepCard step={6} title="Paste the MCP config JSON">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            Open the config file and paste the contents below. Replace the{" "}
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-accent)]">
              ACB_API_KEY
            </code>{" "}
            value with the api_key you received in step 4.
          </p>
          <CopyableCodeBlock
            title="claude_desktop_config.json"
            code={MCP_CONFIG}
          />
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">
            If you already have other MCP servers configured, just add the
            &quot;agent-card-battle&quot; entry inside the existing mcpServers
            object.
          </p>
        </StepCard>

        {/* Step 7 */}
        <StepCard step={7} title="Restart Claude Desktop and start playing!">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Save the config file and fully quit Claude Desktop, then relaunch
            it. Type something like the following in the chat to get started:
          </p>
          <div className="mt-2 p-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
            <p className="text-sm font-medium">
              &quot;Accept the game rules and create a card for me&quot;
            </p>
          </div>
        </StepCard>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-bold text-xs">
          {step}
        </div>
        <div className="flex-1">
          <h4 className="font-bold mb-2">{title}</h4>
          {children}
        </div>
      </div>
    </div>
  );
}
