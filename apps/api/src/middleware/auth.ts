import type { Context, Next } from "hono";
import { supabase } from "../db/client.js";
import { AppError } from "./error-handler.js";
import { ERROR_CODES } from "@molgame/shared";
import * as argon2 from "argon2";

export interface AuthContext {
  agent_id: string;
  agent_name: string;
}

// Cache verified API keys to avoid repeated DB + hash lookups
const keyCache = new Map<string, { agent_id: string; agent_name: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(401, ERROR_CODES.AUTH_FAILED, "Missing or invalid Authorization header");
  }

  const apiKey = authHeader.slice(7);

  // Check cache first
  const cached = keyCache.get(apiKey);
  if (cached && cached.expires > Date.now()) {
    c.set("agent", { agent_id: cached.agent_id, agent_name: cached.agent_name });
    await next();
    return;
  }

  // Look up all agents and verify the key against stored hashes
  // For efficiency, we use a prefix-based lookup
  const prefix = apiKey.slice(0, 8);
  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name, api_key_hash")
    .limit(100);

  if (error || !agents) {
    throw new AppError(401, ERROR_CODES.AUTH_FAILED, "Authentication failed");
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
        c.set("agent", { agent_id: agent.id, agent_name: agent.name });
        await next();
        return;
      }
    } catch {
      continue;
    }
  }

  throw new AppError(401, ERROR_CODES.AUTH_FAILED, "Invalid API key");
}

export function getAgent(c: Context): AuthContext {
  return c.get("agent") as AuthContext;
}
