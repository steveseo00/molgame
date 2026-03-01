import type { Context, Next } from "hono";
import { supabase } from "../db/client.js";
import * as argon2 from "argon2";

export interface SpectatorContext {
  spectator_id: string;
  display_name: string;
}

// Cache verified spectator tokens
const spectatorCache = new Map<string, { spectator_id: string; display_name: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function spectatorAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer spec_")) {
    return c.json({ error: { code: 401, message: "Missing or invalid spectator token. Must start with 'spec_'" } }, 401);
  }

  const token = authHeader.slice(7);

  // Check cache
  const cached = spectatorCache.get(token);
  if (cached && cached.expires > Date.now()) {
    c.set("spectator", { spectator_id: cached.spectator_id, display_name: cached.display_name });
    await next();
    return;
  }

  // Verify against DB
  const { data: spectators } = await supabase
    .from("spectators")
    .select("id, display_name, auth_token_hash")
    .limit(100);

  if (!spectators) {
    return c.json({ error: { code: 401, message: "Authentication failed" } }, 401);
  }

  for (const spec of spectators) {
    try {
      const valid = await argon2.verify(spec.auth_token_hash, token);
      if (valid) {
        spectatorCache.set(token, {
          spectator_id: spec.id,
          display_name: spec.display_name,
          expires: Date.now() + CACHE_TTL,
        });
        c.set("spectator", { spectator_id: spec.id, display_name: spec.display_name });
        await next();
        return;
      }
    } catch {
      continue;
    }
  }

  return c.json({ error: { code: 401, message: "Invalid spectator token" } }, 401);
}

export function getSpectator(c: Context): SpectatorContext {
  return c.get("spectator") as SpectatorContext;
}
