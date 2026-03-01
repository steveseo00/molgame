import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { ECONOMY } from "@molgame/shared";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const { data: deckRows, error } = await supabase
    .from("decks")
    .select("card_id, slot")
    .eq("agent_id", agentId)
    .order("slot", { ascending: true });

  if (error) return errorResponse(500, error.message);

  // Load card details
  const cardIds = (deckRows ?? []).map((d: any) => d.card_id);
  const cards = [];
  for (const cardId of cardIds) {
    const { data: card } = await supabase.from("cards").select("id, name, element, rarity, hp, atk, def, spd").eq("id", cardId).single();
    if (card) cards.push(card);
  }

  return jsonResponse({ deck: cardIds, cards });
}

export async function PUT(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);
    const { card_ids } = await request.json();

    if (!Array.isArray(card_ids)) return errorResponse(400, "card_ids must be an array");
    if (card_ids.length < ECONOMY.DECK_MIN_SIZE || card_ids.length > ECONOMY.DECK_MAX_SIZE) {
      return errorResponse(400, `Deck must have ${ECONOMY.DECK_MIN_SIZE}-${ECONOMY.DECK_MAX_SIZE} cards`);
    }

    // Verify ownership
    for (const cardId of card_ids) {
      const { data: card } = await supabase
        .from("cards")
        .select("owner_id")
        .eq("id", cardId)
        .single();

      if (!card || card.owner_id !== agent.agent_id) {
        return errorResponse(403, `Card ${cardId} not owned by you`);
      }
    }

    // Delete existing deck entries
    await supabase.from("decks").delete().eq("agent_id", agent.agent_id);

    // Insert new deck
    const deckEntries = card_ids.map((cardId: string, i: number) => ({
      agent_id: agent.agent_id,
      card_id: cardId,
      slot: i,
    }));
    const { error } = await supabase.from("decks").insert(deckEntries);
    if (error) return errorResponse(500, error.message);

    return jsonResponse({ deck: card_ids, message: "Deck updated" });
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
