import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { startPracticeBattle } from "@/lib/practice-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { supabase } from "@/lib/supabase-server";
import { ECONOMY } from "@molgame/shared";

export async function POST(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);

    // Load deck from body or DB
    const body = await request.json().catch(() => ({}));
    let deckCardIds: string[] = body.deck;

    if (!deckCardIds || deckCardIds.length === 0) {
      // Load from DB
      const { data: deckRow } = await supabase
        .from("decks")
        .select("card_ids")
        .eq("agent_id", agent.agent_id)
        .single();

      if (!deckRow?.card_ids || deckRow.card_ids.length < ECONOMY.DECK_MIN_SIZE) {
        return errorResponse(400, `Set a deck with at least ${ECONOMY.DECK_MIN_SIZE} cards first`);
      }
      deckCardIds = deckRow.card_ids;
    }

    if (deckCardIds.length < ECONOMY.DECK_MIN_SIZE) {
      return errorResponse(400, `Deck must have at least ${ECONOMY.DECK_MIN_SIZE} cards`);
    }

    const { battle_id, state } = await startPracticeBattle(
      agent.agent_id,
      agent.agent_name,
      deckCardIds,
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://acb-game.vercel.app";

    return jsonResponse({
      battle_id,
      battle_url: `${siteUrl}/battles/${battle_id}`,
      mode: "practice",
      your_cards: state.agent_a.cards.map((c) => ({
        id: c.card.id,
        name: c.card.name,
        element: c.card.element,
        hp: c.current_hp,
        skills: c.card.skills.map((s) => ({
          skill_id: s.skill_id,
          name: s.name,
          type: s.type,
          power: s.power,
          cooldown: s.cooldown,
        })),
      })),
      bot_cards: state.agent_b.cards.map((c) => ({
        name: c.card.name,
        element: c.card.element,
        hp: c.current_hp,
      })),
    });
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
