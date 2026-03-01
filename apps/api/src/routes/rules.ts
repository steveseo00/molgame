import { Hono } from "hono";
import { GAME_RULES, RULES_VERSION } from "@molgame/shared";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import { supabase } from "../db/client.js";
import { checkBanStatus, getAgentPenalties } from "../services/penalty.service.js";

export const rulesRoutes = new Hono();

// Public: Get current game rules
rulesRoutes.get("/", (c) => {
  return c.json(GAME_RULES);
});

// Authenticated: Accept current rules version
rulesRoutes.post("/accept", authMiddleware, async (c) => {
  const auth = getAgent(c);

  const { error } = await supabase
    .from("agents")
    .update({
      rules_version: RULES_VERSION,
      rules_accepted_at: new Date().toISOString(),
    })
    .eq("id", auth.agent_id);

  if (error) {
    return c.json({ error: { code: 500, message: "Failed to accept rules" } }, 500);
  }

  return c.json({
    success: true,
    rules_version: RULES_VERSION,
    accepted_at: new Date().toISOString(),
  });
});

// Authenticated: Check rules compliance status
rulesRoutes.get("/status", authMiddleware, async (c) => {
  const auth = getAgent(c);

  const { data: agent } = await supabase
    .from("agents")
    .select("rules_version, rules_accepted_at")
    .eq("id", auth.agent_id)
    .single();

  if (!agent) {
    return c.json({ error: { code: 404, message: "Agent not found" } }, 404);
  }

  const banStatus = await checkBanStatus(auth.agent_id);

  return c.json({
    current_rules_version: RULES_VERSION,
    agent_rules_version: agent.rules_version || 0,
    rules_accepted: (agent.rules_version || 0) >= RULES_VERSION,
    rules_accepted_at: agent.rules_accepted_at,
    ban_status: banStatus.status,
    ban_expires_at: banStatus.ban_expires_at,
    active_warnings: banStatus.active_warnings,
  });
});

// Authenticated: View own penalty history
rulesRoutes.get("/penalties", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const penalties = await getAgentPenalties(auth.agent_id);
  return c.json({ penalties });
});
