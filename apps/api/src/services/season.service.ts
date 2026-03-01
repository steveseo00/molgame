import { supabase } from "../db/client.js";
import { ECONOMY } from "@molgame/shared";
import { roomManager } from "../ws/rooms.js";

export async function getActiveSeason() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .single();
  return data;
}

export async function getSeasonElement(): Promise<string | null> {
  const season = await getActiveSeason();
  return season?.temp_element || null;
}

export async function addSeasonXP(agentId: string, xp: number) {
  const { data: agent } = await supabase
    .from("agents")
    .select("season_xp")
    .eq("id", agentId)
    .single();
  if (!agent) return;

  await supabase
    .from("agents")
    .update({ season_xp: (agent.season_xp || 0) + xp })
    .eq("id", agentId);
}

export async function processSeasonEnd(seasonId: number) {
  // Get all agents with their season XP
  const { data: agents } = await supabase
    .from("agents")
    .select("id, elo_rating, spark, season_xp")
    .order("season_xp", { ascending: false });

  if (!agents) return;

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];

    // Determine tier based on ranking
    let tier: string;
    if (i < 3) tier = "champion";
    else if (i < agents.length * 0.1) tier = "gold";
    else if (i < agents.length * 0.3) tier = "silver";
    else tier = "bronze";

    // Record season reward
    await supabase.from("season_rewards").insert({
      season_id: seasonId,
      agent_id: agent.id,
      tier,
      rewards: {
        rank: i + 1,
        season_xp: agent.season_xp || 0,
        tier,
      },
    });

    // Soft ELO reset: pull 20% toward 1200
    const newElo = Math.round(agent.elo_rating * 0.8 + 1200 * 0.2);

    // Spark decay: 20% of amount above 200
    let newSpark = agent.spark;
    if (agent.spark > ECONOMY.SEASON_SPARK_DECAY_THRESHOLD) {
      const excess = agent.spark - ECONOMY.SEASON_SPARK_DECAY_THRESHOLD;
      const decay = Math.round(excess * ECONOMY.SEASON_SPARK_DECAY_RATE);
      newSpark = agent.spark - decay;
    }

    await supabase
      .from("agents")
      .update({
        elo_rating: newElo,
        spark: newSpark,
        season_xp: 0, // Reset for next season
      })
      .eq("id", agent.id);
  }

  // Mark season as completed
  await supabase.from("seasons").update({ status: "completed" }).eq("id", seasonId);

  // Broadcast season end
  roomManager.broadcast("global", {
    type: "season:ended",
    payload: { season_id: seasonId },
  });
}

export async function createSeason(name: string, theme: string, tempElement: string, durationDays: number = 28) {
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase.from("seasons").insert({
    name,
    theme,
    temp_element: tempElement,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: "active",
  }).select().single();

  if (error) throw error;

  roomManager.broadcast("global", {
    type: "season:started",
    payload: { season_id: data.id, name, theme, temp_element: tempElement, ends_at: endsAt.toISOString() },
  });

  return data;
}

export async function listSeasons() {
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .order("starts_at", { ascending: false });
  return data || [];
}

export async function getSeasonLeaderboard(seasonId: number) {
  const { data } = await supabase
    .from("season_rewards")
    .select("agent_id, tier, rewards, agents(name, elo_rating)")
    .eq("season_id", seasonId)
    .order("tier", { ascending: true });
  return data || [];
}

// Check for season transitions periodically
export function startSeasonScheduler() {
  setInterval(async () => {
    const now = new Date().toISOString();

    // Check if active season has ended
    const { data: expiredSeasons } = await supabase
      .from("seasons")
      .select("id")
      .eq("status", "active")
      .lte("ends_at", now);

    for (const season of expiredSeasons || []) {
      await processSeasonEnd(season.id);
    }
  }, 60000); // Check every minute
}
