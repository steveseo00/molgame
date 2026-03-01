import { supabase } from "../db/client.js";
import { nanoid } from "nanoid";
import * as argon2 from "argon2";

export async function registerOperator(email: string, displayName?: string) {
  const authToken = `op_${nanoid(48)}`;
  const authTokenHash = await argon2.hash(authToken);

  const { data, error } = await supabase
    .from("operators")
    .insert({
      email,
      display_name: displayName || email.split("@")[0],
      auth_token_hash: authTokenHash,
    })
    .select("id, email, display_name, tier, created_at")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Operator email already registered");
    throw error;
  }

  return { operator_id: data.id, ...data, auth_token: authToken };
}

export async function getOperatorProfile(operatorId: string) {
  const { data: operator } = await supabase
    .from("operators")
    .select("*")
    .eq("id", operatorId)
    .single();

  if (!operator) return null;

  // Get linked agents
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, elo_rating, total_battles, total_wins, spark, model_type")
    .eq("operator_id", operatorId);

  return {
    ...operator,
    agents: agents || [],
  };
}

export async function linkAgentToOperator(agentId: string, operatorId: string) {
  const { error } = await supabase
    .from("agents")
    .update({ operator_id: operatorId })
    .eq("id", agentId);

  if (error) throw error;
}

export async function creditOperatorTreasury(operatorId: string, amount: number, reason: string) {
  const { data: op } = await supabase
    .from("operators")
    .select("spark_treasury, total_earnings")
    .eq("id", operatorId)
    .single();

  if (!op) return;

  await supabase
    .from("operators")
    .update({
      spark_treasury: op.spark_treasury + amount,
      total_earnings: op.total_earnings + amount,
    })
    .eq("id", operatorId);
}

export async function getOperatorForAgent(agentId: string): Promise<string | null> {
  const { data } = await supabase
    .from("agents")
    .select("operator_id")
    .eq("id", agentId)
    .single();
  return data?.operator_id || null;
}

export async function getOperatorLeaderboard(limit: number = 20) {
  const { data } = await supabase
    .from("operators")
    .select("id, display_name, email, reputation_score, tier, total_earnings, spark_treasury")
    .order("reputation_score", { ascending: false })
    .limit(limit);
  return data || [];
}

// Calculate and update operator reputation scores
export async function updateOperatorReputation(operatorId: string) {
  const { data: agents } = await supabase
    .from("agents")
    .select("elo_rating, total_battles, total_wins, cards_created")
    .eq("operator_id", operatorId);

  if (!agents || agents.length === 0) return;

  // Reputation = sum of (agent ELO weighted by battle count) + badges + creation quality
  let score = 0;
  for (const agent of agents) {
    const weight = Math.min(agent.total_battles / 10, 10); // max 10x weight
    score += agent.elo_rating * weight / 10;
    score += agent.total_wins * 2;
    score += agent.cards_created * 5;
  }

  const tier = score >= 50000 ? "mythic"
    : score >= 20000 ? "diamond"
    : score >= 10000 ? "gold"
    : score >= 5000 ? "silver"
    : "bronze";

  await supabase
    .from("operators")
    .update({ reputation_score: Math.round(score), tier })
    .eq("id", operatorId);
}
