import { supabase } from "../db/client.js";
import { nanoid } from "nanoid";
import * as argon2 from "argon2";
import type { AgentRegisterRequest, AgentProfile } from "@molgame/shared";
import { ECONOMY } from "@molgame/shared";

export async function registerAgent(data: AgentRegisterRequest) {
  // Generate API key and referral code
  const apiKey = `acb_sk_${nanoid(48)}`;
  const apiKeyHash = await argon2.hash(apiKey);
  const referralCode = nanoid(10);

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      name: data.name,
      api_key_hash: apiKeyHash,
      description: data.description ?? null,
      model_type: data.model_type ?? null,
      avatar_url: data.avatar_url ?? null,
      webhook_url: data.webhook_url ?? null,
      owner_email: data.owner_email,
      spark: ECONOMY.INITIAL_SPARK,
      referral_code: referralCode,
    })
    .select("id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Agent name already taken");
    }
    throw error;
  }

  // Process referral if provided
  if (data.referral_code) {
    try {
      const { processReferral } = await import("./referral.service.js");
      await processReferral(agent.id, data.referral_code);
    } catch {
      // Silently ignore invalid referral codes
    }
  }

  return {
    agent_id: agent.id,
    api_key: apiKey,
    referral_code: referralCode,
    created_at: agent.created_at,
  };
}

export async function getAgentProfile(agentId: string): Promise<AgentProfile | null> {
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error || !agent) return null;

  // Count owned cards
  const { count: cardsOwned } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", agentId);

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model_type: agent.model_type,
    avatar_url: agent.avatar_url,
    elo_rating: agent.elo_rating,
    level: agent.level,
    xp: agent.xp,
    spark: agent.spark,
    owner_email: agent.owner_email,
    referral_code: agent.referral_code,
    referral_count: agent.referral_count ?? 0,
    auto_battle: agent.auto_battle ?? false,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
    total_battles: agent.total_battles,
    win_rate: agent.total_battles > 0 ? agent.total_wins / agent.total_battles : 0,
    cards_created: agent.cards_created,
    cards_owned: cardsOwned ?? 0,
    badges: [],
  };
}

export async function updateAgentProfile(
  agentId: string,
  data: { description?: string; avatar_url?: string },
) {
  const { error } = await supabase
    .from("agents")
    .update(data)
    .eq("id", agentId);

  if (error) throw error;
}

export async function updateSpark(agentId: string, amount: number) {
  const { data, error } = await supabase.rpc("update_spark", {
    p_agent_id: agentId,
    p_amount: amount,
  });

  // Fallback if RPC not set up: manual update
  if (error) {
    const { data: agent } = await supabase
      .from("agents")
      .select("spark")
      .eq("id", agentId)
      .single();

    if (!agent) throw new Error("Agent not found");

    const newSpark = agent.spark + amount;
    if (newSpark < 0) throw new Error("Insufficient Spark");

    await supabase
      .from("agents")
      .update({ spark: newSpark })
      .eq("id", agentId);

    return newSpark;
  }

  return data;
}

export async function getAgentSpark(agentId: string): Promise<number> {
  const { data, error } = await supabase
    .from("agents")
    .select("spark")
    .eq("id", agentId)
    .single();

  if (error || !data) throw new Error("Agent not found");
  return data.spark;
}
