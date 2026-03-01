import { supabase } from "../db/client.js";
import { createBattle, submitAction } from "./battle.service.js";
import { processBattleRewards } from "./economy.service.js";
import type { BattleState, BattleActionType, BattleAgentState, BattleCardState } from "@molgame/shared";
import { getElementMultiplier } from "@molgame/shared";

const AUTO_BATTLE_INTERVAL_MS = 120_000; // 2 minutes

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// ── Scheduler ───────────────────────────────────────────────────────────────

export function startAutoBattleScheduler() {
  if (schedulerTimer) {
    console.log("[AutoBattle] Scheduler already running");
    return;
  }

  console.log("[AutoBattle] Scheduler started – cycle every 2 minutes");
  schedulerTimer = setInterval(() => {
    runAutoBattleCycle().catch((err) => {
      console.error("[AutoBattle] Cycle error:", err);
    });
  }, AUTO_BATTLE_INTERVAL_MS);
}

// ── Cycle ───────────────────────────────────────────────────────────────────

interface AutoBattleAgent {
  id: string;
  name: string;
  deckCardIds: string[];
}

async function runAutoBattleCycle() {
  console.log("[AutoBattle] Running cycle…");

  // 1. Query all agents opted into auto-battle
  const { data: agents, error: agentsErr } = await supabase
    .from("agents")
    .select("id, name")
    .eq("auto_battle", true);

  if (agentsErr || !agents || agents.length === 0) {
    console.log("[AutoBattle] No agents opted in – skipping");
    return;
  }

  // 2. For each agent, fetch their deck
  const eligible: AutoBattleAgent[] = [];

  for (const agent of agents) {
    const { data: deckRows } = await supabase
      .from("decks")
      .select("card_id")
      .eq("agent_id", agent.id)
      .order("slot");

    if (!deckRows || deckRows.length < 3) continue; // need at least 3 cards

    eligible.push({
      id: agent.id,
      name: agent.name,
      deckCardIds: deckRows.map((r: { card_id: string }) => r.card_id),
    });
  }

  if (eligible.length < 2) {
    console.log(`[AutoBattle] Only ${eligible.length} eligible agent(s) – need at least 2`);
    return;
  }

  // 3. Shuffle eligible agents (Fisher-Yates)
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  // 4. Pair them up
  const pairs: [AutoBattleAgent, AutoBattleAgent][] = [];
  for (let i = 0; i + 1 < eligible.length; i += 2) {
    pairs.push([eligible[i], eligible[i + 1]]);
  }

  console.log(`[AutoBattle] ${pairs.length} match(es) to run`);

  // 5. Run each battle
  for (const [agentA, agentB] of pairs) {
    try {
      await runAutoBattle(agentA, agentB);
    } catch (err) {
      console.error(`[AutoBattle] Battle failed (${agentA.name} vs ${agentB.name}):`, err);
    }
  }
}

// ── Single auto-battle simulation ───────────────────────────────────────────

async function runAutoBattle(agentA: AutoBattleAgent, agentB: AutoBattleAgent) {
  const battleId = crypto.randomUUID();
  console.log(`[AutoBattle] ${agentA.name} vs ${agentB.name} – battle ${battleId}`);

  // Create the battle via the standard service (inserts into DB, sets up in-memory state)
  let state = await createBattle(battleId, "casual", agentA, agentB);

  const MAX_TURNS = 30;

  // Simulate turn by turn
  while (state.status === "active" && state.turn < MAX_TURNS) {
    const actionA = getAutoAction(state, state.agent_a.agent_id);
    const actionB = getAutoAction(state, state.agent_b.agent_id);

    // Submit both actions – the second call triggers processTurn internally
    await submitAction(battleId, state.agent_a.agent_id, actionA.action, actionA.skill_id, actionA.card_id);
    state = (await submitAction(battleId, state.agent_b.agent_id, actionB.action, actionB.skill_id, actionB.card_id)) as BattleState;

    if (!state) break;
  }

  // Determine winner / draw and distribute rewards
  const winnerId = state.winner_id;
  const isDraw = state.status === "finished" && winnerId === null;
  const agentAId = state.agent_a.agent_id;
  const agentBId = state.agent_b.agent_id;

  const loserId = winnerId
    ? winnerId === agentAId
      ? agentBId
      : agentAId
    : null;

  await processBattleRewards(winnerId, loserId, isDraw);

  console.log(
    `[AutoBattle] Finished ${battleId} – ` +
      (isDraw
        ? "Draw"
        : `Winner: ${winnerId === agentAId ? agentA.name : agentB.name}`) +
      ` (${state.turn} turns)`,
  );
}

// ── Auto-action AI strategy ─────────────────────────────────────────────────

function getAutoAction(
  state: BattleState,
  agentId: string,
): { action: BattleActionType; skill_id?: string; card_id?: string } {
  const isA = state.agent_a.agent_id === agentId;
  const self: BattleAgentState = isA ? state.agent_a : state.agent_b;
  const opponent: BattleAgentState = isA ? state.agent_b : state.agent_a;

  const activeCard: BattleCardState = self.cards[self.active_card_index];
  const opponentActive: BattleCardState = opponent.cards[opponent.active_card_index];

  // Rule 5: Defend every 5th turn (turn % 5 === 4)
  if (state.turn % 5 === 4) {
    return { action: "defend" };
  }

  // Rule 3: If we have element disadvantage and a card with advantage is available, swap
  const myElement = activeCard.card.element;
  const theirElement = opponentActive.card.element;
  const multiplier = getElementMultiplier(myElement, theirElement);

  if (multiplier < 1) {
    // We are at a disadvantage – look for a card with advantage
    const betterCardIndex = self.cards.findIndex((c, idx) => {
      if (idx === self.active_card_index) return false;
      if (c.current_hp <= 0) return false;
      return getElementMultiplier(c.card.element, theirElement) > 1;
    });

    if (betterCardIndex !== -1) {
      return { action: "select_card", card_id: self.cards[betterCardIndex].card.id };
    }
  }

  // Rule 2: If active card HP < 30% of max and there's a heal skill off cooldown, use heal
  const hpPercent = activeCard.current_hp / activeCard.max_hp;
  if (hpPercent < 0.3) {
    const healSkill = activeCard.card.skills.find(
      (s) =>
        s.type === "heal" &&
        (activeCard.skill_cooldowns[s.skill_id] ?? 0) === 0,
    );
    if (healSkill) {
      return { action: "use_skill", skill_id: healSkill.skill_id };
    }
  }

  // Rule 1: If a powerful attack skill (power > 50) is off cooldown, use it
  const strongAttack = activeCard.card.skills.find(
    (s) =>
      s.type === "attack" &&
      s.power > 50 &&
      (activeCard.skill_cooldowns[s.skill_id] ?? 0) === 0,
  );
  if (strongAttack) {
    return { action: "use_skill", skill_id: strongAttack.skill_id };
  }

  // Rule 4: Default to basic_attack
  return { action: "basic_attack" };
}
