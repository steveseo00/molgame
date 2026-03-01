import { Hono } from "hono";
import { battleQueueSchema, battleActionSchema, battleChallengeSchema } from "@molgame/shared";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import { rulesMiddleware } from "../middleware/rules.js";
import * as battleService from "../services/battle.service.js";
import * as matchmaking from "../services/matchmaking.service.js";
import * as economyService from "../services/economy.service.js";
import { supabase } from "../db/client.js";

export const battleRoutes = new Hono();

// Public: List battles (active + recent finished)
battleRoutes.get("/", async (c) => {
  const status = c.req.query("status"); // "active" | "finished" | undefined (all)
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20", 10), 50);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  // Active in-memory battles
  const activeBattles: any[] = [];
  if (!status || status === "active") {
    for (const state of battleService.getActiveBattles()) {
      activeBattles.push({
        id: state.battle_id,
        mode: state.mode,
        status: state.status,
        turn: state.turn,
        agent_a_id: state.agent_a.agent_id,
        agent_a_name: state.agent_a.agent_name,
        agent_b_id: state.agent_b.agent_id,
        agent_b_name: state.agent_b.agent_name,
        winner_id: state.winner_id,
        started_at: state.started_at,
        finished_at: state.finished_at,
      });
    }
  }

  // DB battles (finished or all)
  let query = supabase
    .from("battles")
    .select(
      "id, mode, status, turns, agent_a_id, agent_b_id, winner_id, elo_change_a, elo_change_b, spark_reward_a, spark_reward_b, started_at, finished_at",
    )
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === "finished") {
    query = query.eq("status", "finished");
  } else if (status === "active") {
    query = query.eq("status", "active");
  }

  const { data: dbBattles } = await query;

  // Resolve agent names
  const agentIds = new Set<string>();
  for (const b of dbBattles ?? []) {
    if (b.agent_a_id) agentIds.add(b.agent_a_id);
    if (b.agent_b_id) agentIds.add(b.agent_b_id);
  }
  const agentNames: Record<string, string> = {};
  if (agentIds.size > 0) {
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", [...agentIds]);
    for (const a of agents ?? []) {
      agentNames[a.id] = a.name;
    }
  }

  const recentBattles = (dbBattles ?? []).map((b) => ({
    id: b.id,
    mode: b.mode,
    status: b.status,
    turns: b.turns,
    agent_a_id: b.agent_a_id,
    agent_a_name: agentNames[b.agent_a_id] ?? "Unknown",
    agent_b_id: b.agent_b_id,
    agent_b_name: agentNames[b.agent_b_id] ?? "Unknown",
    winner_id: b.winner_id,
    elo_change_a: b.elo_change_a,
    elo_change_b: b.elo_change_b,
    spark_reward_a: b.spark_reward_a,
    spark_reward_b: b.spark_reward_b,
    started_at: b.started_at,
    finished_at: b.finished_at,
  }));

  // Merge: active in-memory battles first, then DB (deduplicated)
  const activeIds = new Set(activeBattles.map((b) => b.id));
  const merged = [
    ...activeBattles,
    ...recentBattles.filter((b) => !activeIds.has(b.id)),
  ];

  return c.json({ battles: merged });
});

// Public: Get battle state (for spectators)
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

// Public: Get replay (for spectators)
battleRoutes.get("/:id/replay", async (c) => {
  const battleId = c.req.param("id");
  const replay = await battleService.getBattleReplay(battleId);
  if (!replay) {
    return c.json({ error: { code: 404, message: "Battle not found" } }, 404);
  }
  return c.json(replay);
});

// Authenticated + Rules: Join matchmaking queue
battleRoutes.post("/queue", authMiddleware, rulesMiddleware, async (c) => {
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
    const result = await matchmaking.joinQueue(
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

// Authenticated: Leave queue
battleRoutes.delete("/queue", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const left = matchmaking.leaveQueue(auth.agent_id);
  return c.json({ left });
});

// Authenticated + Rules: Submit battle action
battleRoutes.post("/:id/action", authMiddleware, rulesMiddleware, async (c) => {
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

// Authenticated + Rules: Direct challenge
battleRoutes.post("/challenge", authMiddleware, rulesMiddleware, async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = battleChallengeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  // TODO: Implement challenge system (requires opponent to accept)
  return c.json({ error: { code: 501, message: "Challenge system coming soon" } }, 501);
});
