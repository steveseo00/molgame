import { supabase } from "../db/client.js";
import { ELO } from "@molgame/shared";
import { createBattle } from "./battle.service.js";

interface QueueEntry {
  agent_id: string;
  agent_name: string;
  elo: number;
  deck: string[];
  mode: "ranked" | "casual";
  joined_at: number;
}

const matchQueue: QueueEntry[] = [];
const queuedAgents = new Set<string>();

export function joinQueue(
  agentId: string,
  agentName: string,
  elo: number,
  deck: string[],
  mode: "ranked" | "casual",
) {
  if (queuedAgents.has(agentId)) {
    throw new Error("Already in queue");
  }

  const entry: QueueEntry = {
    agent_id: agentId,
    agent_name: agentName,
    elo,
    deck,
    mode,
    joined_at: Date.now(),
  };

  matchQueue.push(entry);
  queuedAgents.add(agentId);

  // Try to find a match immediately
  return tryMatch(entry);
}

export function leaveQueue(agentId: string) {
  const idx = matchQueue.findIndex((e) => e.agent_id === agentId);
  if (idx !== -1) {
    matchQueue.splice(idx, 1);
    queuedAgents.delete(agentId);
    return true;
  }
  return false;
}

export function isInQueue(agentId: string): boolean {
  return queuedAgents.has(agentId);
}

async function tryMatch(entry: QueueEntry) {
  const now = Date.now();

  for (let i = 0; i < matchQueue.length; i++) {
    const candidate = matchQueue[i];
    if (candidate.agent_id === entry.agent_id) continue;
    if (candidate.mode !== entry.mode) continue;

    // Calculate allowed ELO range (expands over time)
    const waitTime = now - Math.min(entry.joined_at, candidate.joined_at);
    const expansions = Math.floor(waitTime / ELO.MATCHMAKING_EXPAND_INTERVAL_MS);
    const range = Math.min(
      ELO.MATCHMAKING_RANGE + expansions * ELO.MATCHMAKING_EXPAND_AMOUNT,
      ELO.MATCHMAKING_MAX_RANGE,
    );

    const eloDiff = Math.abs(entry.elo - candidate.elo);
    if (eloDiff <= range) {
      // Match found! Remove both from queue
      matchQueue.splice(i, 1);
      const entryIdx = matchQueue.findIndex((e) => e.agent_id === entry.agent_id);
      if (entryIdx !== -1) matchQueue.splice(entryIdx, 1);
      queuedAgents.delete(entry.agent_id);
      queuedAgents.delete(candidate.agent_id);

      // Create battle (UUID required by battles table)
      const battleId = crypto.randomUUID();
      const battle = await createBattle(
        battleId,
        entry.mode,
        { id: entry.agent_id, name: entry.agent_name, deckCardIds: entry.deck },
        { id: candidate.agent_id, name: candidate.agent_name, deckCardIds: candidate.deck },
      );

      return { matched: true, battle_id: battleId, battle };
    }
  }

  return { matched: false, position: matchQueue.length };
}

// Periodically retry matching for queued agents
setInterval(async () => {
  for (const entry of [...matchQueue]) {
    await tryMatch(entry);
  }
}, 5000);
