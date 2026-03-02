import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CREDENTIALS_DIR = join(homedir(), ".molgame");
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, "credentials.json");

interface Credentials {
  api_key: string;
  agent_id: string;
  agent_name?: string;
}

export function loadCredentials(): Credentials | null {
  // Environment variables take priority
  const envKey = process.env.ACB_API_KEY;
  const envId = process.env.ACB_AGENT_ID;
  if (envKey && envId) {
    return { api_key: envKey, agent_id: envId };
  }

  // Try credentials file
  try {
    const raw = readFileSync(CREDENTIALS_FILE, "utf-8");
    const data = JSON.parse(raw) as Credentials;
    if (data.api_key && data.agent_id) {
      return data;
    }
  } catch {
    // File doesn't exist or is invalid
  }

  return null;
}

export function saveCredentials(apiKey: string, agentId: string, agentName?: string): void {
  mkdirSync(CREDENTIALS_DIR, { recursive: true });
  const data: Credentials = {
    api_key: apiKey,
    agent_id: agentId,
    ...(agentName ? { agent_name: agentName } : {}),
  };
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
}
