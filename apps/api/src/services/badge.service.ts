import { supabase } from "../db/client.js";
import { roomManager } from "../ws/rooms.js";

// Check and award badges after various game events
export async function checkBattleBadges(agentId: string) {
  const { data: agent } = await supabase
    .from("agents")
    .select("total_wins, total_battles, win_streak, elo_rating")
    .eq("id", agentId)
    .single();
  if (!agent) return;

  const badgesToCheck = [
    { id: "first_blood", condition: agent.total_wins >= 1 },
    { id: "streak_3", condition: agent.win_streak >= 3 },
    { id: "streak_5", condition: agent.win_streak >= 5 },
    { id: "streak_10", condition: agent.win_streak >= 10 },
    { id: "elo_1500", condition: agent.elo_rating >= 1500 },
    { id: "elo_1800", condition: agent.elo_rating >= 1800 },
    { id: "elo_2000", condition: agent.elo_rating >= 2000 },
    { id: "battle_veteran_100", condition: agent.total_battles >= 100 },
  ];

  for (const { id, condition } of badgesToCheck) {
    if (condition) await awardBadge(agentId, id);
  }
}

export async function checkCardBadges(agentId: string) {
  const { data: agent } = await supabase
    .from("agents")
    .select("cards_created, spark")
    .eq("id", agentId)
    .single();
  if (!agent) return;

  // Count owned cards
  const { count } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", agentId);

  // Count distinct elements owned
  const { data: elements } = await supabase
    .from("cards")
    .select("element")
    .eq("owner_id", agentId);
  const uniqueElements = new Set(elements?.map(e => e.element) || []);

  const badgesToCheck = [
    { id: "card_artisan", condition: (agent.cards_created || 0) >= 10 },
    { id: "card_collector_30", condition: (count || 0) >= 30 },
    { id: "element_collector", condition: uniqueElements.size >= 6 },
    { id: "spark_millionaire", condition: agent.spark >= 1000 },
  ];

  for (const { id, condition } of badgesToCheck) {
    if (condition) await awardBadge(agentId, id);
  }
}

export async function checkTradeBadges(agentId: string) {
  const { count } = await supabase
    .from("trade_offers")
    .select("*", { count: "exact", head: true })
    .eq("from_agent_id", agentId)
    .eq("status", "accepted");

  const { count: count2 } = await supabase
    .from("trade_offers")
    .select("*", { count: "exact", head: true })
    .eq("to_agent_id", agentId)
    .eq("status", "accepted");

  const totalTrades = (count || 0) + (count2 || 0);

  if (totalTrades >= 1) await awardBadge(agentId, "trader");
  if (totalTrades >= 10) await awardBadge(agentId, "market_mogul");
}

export async function checkRarityBadge(agentId: string, rarity: string) {
  if (rarity === "legendary") await awardBadge(agentId, "legendary_puller");
  if (rarity === "mythic") await awardBadge(agentId, "mythic_puller");
}

export async function checkReferralBadges(agentId: string) {
  const { data: agent } = await supabase
    .from("agents")
    .select("referral_count")
    .eq("id", agentId)
    .single();
  if (agent && (agent.referral_count || 0) >= 5) {
    await awardBadge(agentId, "recruiter");
  }
}

async function awardBadge(agentId: string, badgeId: string) {
  // Use upsert to avoid duplicate errors
  const { error } = await supabase
    .from("agent_badges")
    .upsert({ agent_id: agentId, badge_id: badgeId }, { onConflict: "agent_id,badge_id" });

  if (!error) {
    // Broadcast badge earned event
    roomManager.broadcast("global", {
      type: "badge:earned",
      payload: { agent_id: agentId, badge_id: badgeId },
    });
  }
}

export async function getAgentBadges(agentId: string) {
  const { data } = await supabase
    .from("agent_badges")
    .select("badge_id, earned_at, badges(name, description, category, rarity, icon_url)")
    .eq("agent_id", agentId)
    .order("earned_at", { ascending: false });

  return (data || []).map((row: any) => ({
    badge: {
      id: row.badge_id,
      name: row.badges?.name,
      description: row.badges?.description,
      category: row.badges?.category,
      rarity: row.badges?.rarity,
      icon_url: row.badges?.icon_url,
    },
    earned_at: row.earned_at,
  }));
}
