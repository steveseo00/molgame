import { supabase } from "../db/client.js";
import { nanoid } from "nanoid";
import type { Tournament, TournamentBracket } from "@molgame/shared";

export async function listTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["upcoming", "registering", "in_progress"])
    .order("starts_at", { ascending: true });

  return data ?? [];
}

export async function registerForTournament(tournamentId: string, agentId: string, deck: string[]) {
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .in("status", ["upcoming", "registering"])
    .single();

  if (!tournament) throw new Error("Tournament not found or registration closed");

  const participants: string[] = tournament.participants ?? [];
  if (participants.includes(agentId)) {
    throw new Error("Already registered");
  }
  if (participants.length >= tournament.max_participants) {
    throw new Error("Tournament is full");
  }

  participants.push(agentId);

  await supabase
    .from("tournaments")
    .update({
      participants,
      status: participants.length >= tournament.max_participants ? "registering" : tournament.status,
    })
    .eq("id", tournamentId);

  return { registered: true, position: participants.length };
}

export async function getTournamentBracket(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("bracket, participants, status, name, type")
    .eq("id", tournamentId)
    .single();

  if (!data) throw new Error("Tournament not found");
  return data;
}

export async function createDailyBlitz() {
  const tournament = {
    name: `Daily Blitz - ${new Date().toLocaleDateString()}`,
    type: "daily_blitz",
    max_participants: 8,
    entry_fee: 0,
    prize_pool: 100,
    status: "upcoming",
    bracket: { rounds: [] },
    participants: [],
    starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  };

  const { data, error } = await supabase
    .from("tournaments")
    .insert(tournament)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function generateBracket(participantIds: string[]): TournamentBracket {
  // Shuffle participants
  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);

  const rounds = [];
  const roundCount = Math.ceil(Math.log2(shuffled.length));

  // First round
  const firstRoundMatches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    firstRoundMatches.push({
      match_id: nanoid(8),
      agent_a_id: shuffled[i],
      agent_b_id: shuffled[i + 1] ?? null,
      winner_id: shuffled[i + 1] ? null : shuffled[i], // bye
      battle_id: null,
      status: shuffled[i + 1] ? ("pending" as const) : ("bye" as const),
    });
  }
  rounds.push({ round_number: 1, matches: firstRoundMatches });

  // Subsequent rounds (placeholders)
  let matchCount = Math.ceil(firstRoundMatches.length / 2);
  for (let r = 2; r <= roundCount; r++) {
    const matches = [];
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        match_id: nanoid(8),
        agent_a_id: null,
        agent_b_id: null,
        winner_id: null,
        battle_id: null,
        status: "pending" as const,
      });
    }
    rounds.push({ round_number: r, matches });
    matchCount = Math.ceil(matchCount / 2);
  }

  return { rounds };
}
