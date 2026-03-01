import { supabase } from "../db/client.js";

export async function selectCardOfTheDay() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find card with highest win count in the last 24 hours
  // We use battle log to find recently active cards
  const { data: topCards } = await supabase
    .from("cards")
    .select("id, name, element, rarity, win_count, battle_count, image_url, owner_id")
    .gt("battle_count", 0)
    .order("win_count", { ascending: false })
    .limit(1);

  if (!topCards || topCards.length === 0) return null;

  const card = topCards[0];

  // Insert/update featured card
  await supabase.from("featured_cards").insert({
    card_id: card.id,
    feature_type: "card_of_day",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  return card;
}

export async function getFeaturedCards() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("featured_cards")
    .select("card_id, feature_type, featured_at, cards(id, name, element, rarity, image_url, hp, atk, def, spd, win_count, battle_count)")
    .gte("expires_at", now)
    .order("featured_at", { ascending: false })
    .limit(5);

  return (data || []).map((row: any) => ({
    type: row.feature_type,
    featured_at: row.featured_at,
    card: row.cards,
  }));
}

export function startFeaturedScheduler() {
  // Select card of the day every 24 hours
  selectCardOfTheDay();
  setInterval(selectCardOfTheDay, 24 * 60 * 60 * 1000);
}
