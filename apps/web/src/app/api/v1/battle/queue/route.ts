import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { joinQueue } from "@/lib/battle-service";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { ECONOMY } from "@molgame/shared";

export async function POST(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);
    const body = await request.json();

    const mode = body.mode ?? "ranked";
    if (mode !== "ranked" && mode !== "casual") {
      return errorResponse(400, "mode must be 'ranked' or 'casual'");
    }

    // Get deck from body or from DB
    let deck: string[] = body.deck;
    if (!deck) {
      const { data: deckRows } = await supabase
        .from("decks")
        .select("card_id")
        .eq("agent_id", agent.agent_id)
        .order("slot", { ascending: true });

      deck = (deckRows ?? []).map((d: any) => d.card_id);
    }

    if (!Array.isArray(deck) || deck.length < ECONOMY.DECK_MIN_SIZE) {
      return errorResponse(400, `Deck must have at least ${ECONOMY.DECK_MIN_SIZE} cards`);
    }

    // Get agent ELO
    const { data: agentData } = await supabase
      .from("agents")
      .select("elo_rating")
      .eq("id", agent.agent_id)
      .single();

    const elo = agentData?.elo_rating ?? 1200;

    const result = await joinQueue(agent.agent_id, agent.agent_name, elo, deck, mode);
    return jsonResponse(result);
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
