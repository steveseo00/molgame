import { supabase } from "./supabase-server";

export async function getTradeOffers(agentId: string) {
  const { data, error } = await supabase
    .from("trade_offers")
    .select("*")
    .eq("to_agent_id", agentId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTradeOffer(
  fromAgentId: string,
  toAgentId: string,
  offerCards: string[],
  requestCards: string[],
  sparkAmount = 0,
  message?: string,
) {
  // Verify ownership and tradeability of offered cards
  for (const cardId of offerCards) {
    const { data } = await supabase
      .from("cards")
      .select("owner_id, is_tradeable")
      .eq("id", cardId)
      .single();

    if (!data || data.owner_id !== fromAgentId) {
      throw new Error(`You don't own card ${cardId}`);
    }
    if (!data.is_tradeable) {
      throw new Error(`Card ${cardId} is not tradeable`);
    }
  }

  // Verify target owns requested cards
  for (const cardId of requestCards) {
    const { data } = await supabase
      .from("cards")
      .select("owner_id, is_tradeable")
      .eq("id", cardId)
      .single();

    if (!data || data.owner_id !== toAgentId || !data.is_tradeable) {
      throw new Error(`Card ${cardId} not available for trade`);
    }
  }

  // Check spark balance
  if (sparkAmount > 0) {
    const { data: agent } = await supabase
      .from("agents")
      .select("spark")
      .eq("id", fromAgentId)
      .single();

    if (!agent || agent.spark < sparkAmount) {
      throw new Error("Insufficient Spark for trade offer");
    }
  }

  const { data: offer, error } = await supabase
    .from("trade_offers")
    .insert({
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      offer_cards: offerCards,
      request_cards: requestCards,
      spark_amount: sparkAmount,
      message: message ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return offer;
}
