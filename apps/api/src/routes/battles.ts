import { Hono } from "hono";
import { battleQueueSchema, battleActionSchema, battleChallengeSchema } from "@molgame/shared";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import * as battleService from "../services/battle.service.js";
import * as matchmaking from "../services/matchmaking.service.js";
import * as economyService from "../services/economy.service.js";
import { supabase } from "../db/client.js";

export const battleRoutes = new Hono();

// All battle routes require auth
battleRoutes.use("*", authMiddleware);

// Join matchmaking queue
battleRoutes.post("/queue", async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = battleQueueSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  // Get agent ELO
  const { data: agent } = await supabase
    .from("agents")
    .select("elo_rating")
    .eq("id", auth.agent_id)
    .single();

  if (!agent) {
    return c.json({ error: { code: 404, message: "Agent not found" } }, 404);
  }

  try {
    const result = matchmaking.joinQueue(
      auth.agent_id,
      auth.agent_name,
      agent.elo_rating,
      parsed.data.deck,
      parsed.data.mode as "ranked" | "casual",
    );
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 409, message: err.message } }, 409);
  }
});

// Leave queue
battleRoutes.delete("/queue", async (c) => {
  const auth = getAgent(c);
  const left = matchmaking.leaveQueue(auth.agent_id);
  return c.json({ left });
});

// Get battle state
battleRoutes.get("/:id", async (c) => {
  const battleId = c.req.param("id");

  // Check active battles first
  const state = battleService.getBattleState(battleId);
  if (state) return c.json(state);

  // Fall back to DB
  const replay = await battleService.getBattleReplay(battleId);
  if (!replay) {
    return c.json({ error: { code: 404, message: "Battle not found" } }, 404);
  }
  return c.json(replay);
});

// Submit battle action
battleRoutes.post("/:id/action", async (c) => {
  const auth = getAgent(c);
  const battleId = c.req.param("id");
  const body = await c.req.json();
  const parsed = battleActionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const state = await battleService.submitAction(
      battleId,
      auth.agent_id,
      parsed.data.action,
      parsed.data.skill_id,
      parsed.data.card_id,
    );

    // If battle just finished, process rewards
    if (state.status === "finished") {
      const isDraw = state.winner_id === null;
      const loserId = isDraw
        ? null
        : state.agent_a.agent_id === state.winner_id
          ? state.agent_b.agent_id
          : state.agent_a.agent_id;

      await economyService.processBattleRewards(state.winner_id, loserId, isDraw);
    }

    return c.json(state);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Get replay
battleRoutes.get("/:id/replay", async (c) => {
  const battleId = c.req.param("id");
  const replay = await battleService.getBattleReplay(battleId);
  if (!replay) {
    return c.json({ error: { code: 404, message: "Battle not found" } }, 404);
  }
  return c.json(replay);
});

// Direct challenge
battleRoutes.post("/challenge", async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = battleChallengeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  // TODO: Implement challenge system (requires opponent to accept)
  return c.json({ error: { code: 501, message: "Challenge system coming soon" } }, 501);
});
