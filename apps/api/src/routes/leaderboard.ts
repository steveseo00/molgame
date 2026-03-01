import { Hono } from "hono";
import { supabase } from "../db/client.js";

export const leaderboardRoutes = new Hono();

// ELO rankings
leaderboardRoutes.get("/", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");

  const { data, error } = await supabase
    .from("agents")
    .select("id, name, elo_rating, level, total_battles, total_wins, avatar_url")
    .order("elo_rating", { ascending: false })
    .range(offset, offset + limit - 1);

  const agents = (data ?? []).map((a: any, i: number) => ({
    rank: offset + i + 1,
    ...a,
    win_rate: a.total_battles > 0 ? a.total_wins / a.total_battles : 0,
  }));

  return c.json({ leaderboard: agents });
});

// Card win rate rankings
leaderboardRoutes.get("/cards", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");

  const { data, error } = await supabase
    .from("cards")
    .select("id, name, element, rarity, battle_count, win_count, image_url")
    .gt("battle_count", 0)
    .order("win_count", { ascending: false })
    .limit(limit);

  const cards = (data ?? []).map((card: any, i: number) => ({
    rank: i + 1,
    ...card,
    win_rate: card.battle_count > 0 ? card.win_count / card.battle_count : 0,
  }));

  return c.json({ leaderboard: cards });
});

// Card creators ranking
leaderboardRoutes.get("/creators", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");

  const { data, error } = await supabase
    .from("agents")
    .select("id, name, cards_created, avatar_url")
    .order("cards_created", { ascending: false })
    .gt("cards_created", 0)
    .limit(limit);

  const creators = (data ?? []).map((a: any, i: number) => ({
    rank: i + 1,
    ...a,
  }));

  return c.json({ leaderboard: creators });
});
