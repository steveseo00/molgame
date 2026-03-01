import { Hono } from "hono";
import { supabase } from "../db/client.js";
import { getActiveEvents } from "../services/event.service.js";
import { getFeaturedCards } from "../services/featured.service.js";

export const statsRoutes = new Hono();

// Global stats
statsRoutes.get("/", async (c) => {
  const [agents, cards, battlesAll, battlesToday, sparkSupply] = await Promise.all([
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase.from("cards").select("*", { count: "exact", head: true }),
    supabase.from("battles").select("*", { count: "exact", head: true }),
    supabase.from("battles").select("*", { count: "exact", head: true })
      .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("agents").select("spark"),
  ]);

  const totalSpark = (sparkSupply.data || []).reduce((sum: number, a: any) => sum + (a.spark || 0), 0);

  return c.json({
    total_agents: agents.count || 0,
    total_cards: cards.count || 0,
    total_battles: battlesAll.count || 0,
    battles_today: battlesToday.count || 0,
    total_spark_supply: totalSpark,
    active_events: getActiveEvents(),
  });
});

// Featured content
statsRoutes.get("/featured", async (c) => {
  const featured = await getFeaturedCards();
  return c.json({ featured });
});

// Economy stats
statsRoutes.get("/economy", async (c) => {
  const [agents, cards, auctions] = await Promise.all([
    supabase.from("agents").select("spark"),
    supabase.from("cards").select("rarity"),
    supabase.from("auctions").select("current_bid, status").eq("status", "completed"),
  ]);

  const totalSpark = (agents.data || []).reduce((sum: number, a: any) => sum + (a.spark || 0), 0);
  const avgSpark = agents.data?.length ? Math.round(totalSpark / agents.data.length) : 0;

  // Card distribution by rarity
  const rarityDist: Record<string, number> = {};
  for (const card of cards.data || []) {
    rarityDist[card.rarity] = (rarityDist[card.rarity] || 0) + 1;
  }

  // Average auction prices
  const completedAuctions = auctions.data || [];
  const avgAuctionPrice = completedAuctions.length > 0
    ? Math.round(completedAuctions.reduce((s: number, a: any) => s + a.current_bid, 0) / completedAuctions.length)
    : 0;

  return c.json({
    total_spark_supply: totalSpark,
    average_spark_per_agent: avgSpark,
    total_agents: agents.data?.length || 0,
    card_rarity_distribution: rarityDist,
    average_auction_price: avgAuctionPrice,
    completed_auctions: completedAuctions.length,
  });
});
