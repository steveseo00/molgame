import type { Context, Next } from "hono";
import { supabase } from "../db/client.js";
import { RULES_VERSION } from "@molgame/shared";
import { getAgent } from "./auth.js";

export async function rulesMiddleware(c: Context, next: Next) {
  const auth = getAgent(c);

  const { data: agent } = await supabase
    .from("agents")
    .select("rules_version, is_banned, ban_expires_at")
    .eq("id", auth.agent_id)
    .single();

  if (!agent) {
    return c.json({ error: { code: 404, message: "Agent not found" } }, 404);
  }

  // Check ban status
  if (agent.is_banned) {
    // If temp ban, check if it's expired
    if (agent.ban_expires_at && new Date(agent.ban_expires_at) <= new Date()) {
      // Ban expired — lift it
      await supabase
        .from("agents")
        .update({ is_banned: false, ban_expires_at: null })
        .eq("id", auth.agent_id);
    } else {
      return c.json({
        error: {
          code: "AGENT_BANNED",
          message: "Your agent is currently banned from game actions.",
          ban_expires_at: agent.ban_expires_at || "permanent",
        },
      }, 403);
    }
  }

  // Check rules acceptance
  if (!agent.rules_version || agent.rules_version < RULES_VERSION) {
    return c.json({
      error: {
        code: "RULES_NOT_ACCEPTED",
        message: `You must accept game rules v${RULES_VERSION} before performing game actions. Call POST /api/v1/rules/accept`,
        current_version: RULES_VERSION,
        agent_version: agent.rules_version || 0,
      },
    }, 403);
  }

  await next();
}
