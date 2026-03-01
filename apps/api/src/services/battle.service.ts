import { supabase } from "../db/client.js";
import type { BattleState, BattleActionType, Card } from "@molgame/shared";
import { createBattleState, processTurn } from "../engine/battle-engine.js";
import { getCardById } from "./card.service.js";
import { roomManager } from "../ws/rooms.js";

// In-memory battle states for active battles
const activeBattles = new Map<string, BattleState>();

// Pending actions per battle
const pendingActions = new Map<
  string,
  {
    [agentId: string]: { action: BattleActionType; skill_id?: string; card_id?: string };
  }
>();

export async function createBattle(
  battleId: string,
  mode: "ranked" | "casual" | "tournament",
  agentA: { id: string; name: string; deckCardIds: string[] },
  agentB: { id: string; name: string; deckCardIds: string[] },
): Promise<BattleState> {
  // Load cards
  const cardsA = await Promise.all(agentA.deckCardIds.map((id) => getCardById(id)));
  const cardsB = await Promise.all(agentB.deckCardIds.map((id) => getCardById(id)));

  const validCardsA = cardsA.filter((c): c is Card => c !== null);
  const validCardsB = cardsB.filter((c): c is Card => c !== null);

  const state = createBattleState(
    battleId,
    mode,
    { id: agentA.id, name: agentA.name, cards: validCardsA },
    { id: agentB.id, name: agentB.name, cards: validCardsB },
  );

  activeBattles.set(battleId, state);

  // Save to DB
  await supabase.from("battles").insert({
    id: battleId,
    agent_a_id: agentA.id,
    agent_b_id: agentB.id,
    mode,
    status: "active",
    battle_state: state,
  });

  // Broadcast battle start
  roomManager.broadcast(`battle:${battleId}`, {
    type: "battle:state",
    payload: sanitizeBattleState(state),
  });

  roomManager.broadcast("global", {
    type: "battle:started",
    payload: {
      battle_id: battleId,
      agent_a: agentA.name,
      agent_b: agentB.name,
      mode,
    },
  });

  return state;
}

export function getBattleState(battleId: string): BattleState | undefined {
  return activeBattles.get(battleId);
}

export async function submitAction(
  battleId: string,
  agentId: string,
  action: BattleActionType,
  skillId?: string,
  cardId?: string,
) {
  const state = activeBattles.get(battleId);
  if (!state || state.status !== "active") {
    throw new Error("Battle not found or not active");
  }

  // Validate agent is in this battle
  if (state.agent_a.agent_id !== agentId && state.agent_b.agent_id !== agentId) {
    throw new Error("Agent is not in this battle");
  }

  // Store pending action
  if (!pendingActions.has(battleId)) {
    pendingActions.set(battleId, {});
  }
  const actions = pendingActions.get(battleId)!;
  actions[agentId] = { action, skill_id: skillId, card_id: cardId };

  // Check if both agents have submitted
  const agentAId = state.agent_a.agent_id;
  const agentBId = state.agent_b.agent_id;

  if (actions[agentAId] && actions[agentBId]) {
    // Process turn
    const updatedState = processTurn(state, actions[agentAId], actions[agentBId]);
    activeBattles.set(battleId, updatedState);
    pendingActions.delete(battleId);

    // Broadcast events
    const newEvents = updatedState.battle_log.slice(-10); // last events from this turn
    roomManager.broadcast(`battle:${battleId}`, {
      type: "battle:events",
      payload: { turn: updatedState.turn, events: newEvents },
    });

    // Update DB
    await supabase
      .from("battles")
      .update({
        status: updatedState.status,
        turns: updatedState.turn,
        battle_state: updatedState,
        battle_log: updatedState.battle_log,
        winner_id: updatedState.winner_id,
        finished_at: updatedState.finished_at,
      })
      .eq("id", battleId);

    if (updatedState.status === "finished") {
      activeBattles.delete(battleId);
      roomManager.broadcast("global", {
        type: "battle:finished",
        payload: {
          battle_id: battleId,
          winner_id: updatedState.winner_id,
          turns: updatedState.turn,
        },
      });
    }

    return updatedState;
  }

  return state;
}

export async function getBattleReplay(battleId: string) {
  const { data, error } = await supabase
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .single();

  if (error || !data) return null;
  return data;
}

function sanitizeBattleState(state: BattleState) {
  return {
    battle_id: state.battle_id,
    mode: state.mode,
    status: state.status,
    turn: state.turn,
    agent_a: {
      agent_id: state.agent_a.agent_id,
      agent_name: state.agent_a.agent_name,
      active_card: state.agent_a.cards[state.agent_a.active_card_index],
      cards_remaining: state.agent_a.cards_remaining,
    },
    agent_b: {
      agent_id: state.agent_b.agent_id,
      agent_name: state.agent_b.agent_name,
      active_card: state.agent_b.cards[state.agent_b.active_card_index],
      cards_remaining: state.agent_b.cards_remaining,
    },
    winner_id: state.winner_id,
  };
}
