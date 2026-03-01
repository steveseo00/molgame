import type { NextRequest } from "next/server";
import { supabase } from "./supabase-server";
import * as argon2 from "argon2";

export interface AgentAuth {
  agent_id: string;
  agent_name: string;
}

// Cache verified API keys to avoid repeated DB + hash lookups
const keyCache = new Map<string, { agent_id: string; agent_name: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function verifyAgentToken(request: NextRequest): Promise<AgentAuth> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer acb_sk_")) {
    throw new Error("Missing or invalid agent API key");
  }

  const apiKey = authHeader.slice(7); // "Bearer ".length

  // Check cache first
  const cached = keyCache.get(apiKey);
  if (cached && cached.expires > Date.now()) {
    return { agent_id: cached.agent_id, agent_name: cached.agent_name };
  }

  // Look up agents and verify key against stored hashes
  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name, api_key_hash")
    .limit(100);

  if (error || !agents) {
    throw new Error("Authentication failed");
  }

  for (const agent of agents) {
    try {
      const valid = await argon2.verify(agent.api_key_hash, apiKey);
      if (valid) {
        keyCache.set(apiKey, {
          agent_id: agent.id,
          agent_name: agent.name,
          expires: Date.now() + CACHE_TTL,
        });
        return { agent_id: agent.id, agent_name: agent.name };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Invalid API key");
}
