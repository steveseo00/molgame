import { supabase } from "./supabase-server";
import { nanoid } from "nanoid";
import * as argon2 from "argon2";
import { ECONOMY } from "@molgame/shared";
import type { NextRequest } from "next/server";

// --- Operator Auth ---

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

export async function loginOperator(email: string) {
  const { data: operator, error } = await supabase
    .from("operators")
    .select("id, email, display_name, tier, created_at")
    .eq("email", email)
    .single();

  if (error || !operator) throw new Error("Operator not found");

  const authToken = `op_${nanoid(48)}`;
  const authTokenHash = await argon2.hash(authToken);

  await supabase
    .from("operators")
    .update({ auth_token_hash: authTokenHash })
    .eq("id", operator.id);

  return { operator_id: operator.id, ...operator, auth_token: authToken };
}

export async function verifyOperatorToken(request: NextRequest): Promise<{ operator_id: string; email: string; display_name: string }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer op_")) {
    throw new Error("Missing or invalid operator token");
  }

  const token = authHeader.slice(7); // "Bearer ".length

  const { data: operators, error } = await supabase
    .from("operators")
    .select("id, email, display_name, auth_token_hash");

  if (error || !operators) throw new Error("Auth verification failed");

  for (const op of operators) {
    if (!op.auth_token_hash) continue;
    try {
      const valid = await argon2.verify(op.auth_token_hash, token);
      if (valid) {
        return { operator_id: op.id, email: op.email, display_name: op.display_name };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Invalid operator token");
}

export async function getOperatorProfile(operatorId: string) {
  const { data: operator } = await supabase
    .from("operators")
    .select("*")
    .eq("id", operatorId)
    .single();

  if (!operator) return null;

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, elo_rating, total_battles, total_wins, spark, model_type")
    .eq("operator_id", operatorId);

  return { ...operator, agents: agents || [] };
}

export async function claimAgent(operatorId: string, claimKey: string) {
  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name, claim_key_hash")
    .eq("is_claimed", false)
    .not("claim_key_hash", "is", null);

  if (error || !agents || agents.length === 0) {
    throw new Error("No claimable agents found");
  }

  for (const agent of agents) {
    try {
      const valid = await argon2.verify(agent.claim_key_hash, claimKey);
      if (valid) {
        const { error: updateError } = await supabase
          .from("agents")
          .update({
            operator_id: operatorId,
            is_claimed: true,
            claim_key_hash: null,
          })
          .eq("id", agent.id);

        if (updateError) throw updateError;
        return { agent_id: agent.id, agent_name: agent.name };
      }
    } catch (e: any) {
      if (e.message?.includes("operator_id") || e.message?.includes("update")) throw e;
      continue;
    }
  }

  throw new Error("Invalid claim key");
}

export async function linkAgentToOperator(agentId: string, operatorId: string) {
  const { error } = await supabase
    .from("agents")
    .update({ operator_id: operatorId })
    .eq("id", agentId);

  if (error) throw error;
}

// --- Agent Deletion ---

export async function deleteAgent(agentId: string, operatorId: string) {
  // Verify the agent belongs to this operator
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, name, operator_id")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) throw new Error("Agent not found");
  if (agent.operator_id !== operatorId) throw new Error("Agent does not belong to this operator");

  // Clean up related data in order to avoid FK violations
  // 1. matchmaking_queue, battle_pending_actions
  await supabase.from("matchmaking_queue").delete().eq("agent_id", agentId);
  await supabase.from("battle_pending_actions").delete().eq("agent_id", agentId);

  // 2. card_sessions
  await supabase.from("card_sessions").delete().eq("agent_id", agentId);

  // 3. agent_badges, agent_penalties
  await supabase.from("agent_badges").delete().eq("agent_id", agentId);
  await supabase.from("agent_penalties").delete().eq("agent_id", agentId);

  // 4. Cancel pending trade offers
  await supabase.from("trade_offers").update({ status: "cancelled" }).eq("from_agent_id", agentId).eq("status", "pending");
  await supabase.from("trade_offers").update({ status: "cancelled" }).eq("to_agent_id", agentId).eq("status", "pending");

  // 5. Cancel active auctions and re-enable card tradeability
  const { data: auctions } = await supabase.from("auctions").select("id, card_id").eq("seller_id", agentId).eq("status", "active");
  for (const auction of auctions ?? []) {
    await supabase.from("cards").update({ is_tradeable: true }).eq("id", auction.card_id);
  }
  await supabase.from("auctions").update({ status: "cancelled" }).eq("seller_id", agentId).eq("status", "active");

  // 6. Nullify battle references (preserve history)
  await supabase.from("battles").update({ agent_a_id: null }).eq("agent_a_id", agentId);
  await supabase.from("battles").update({ agent_b_id: null }).eq("agent_b_id", agentId);
  await supabase.from("battles").update({ winner_id: null }).eq("winner_id", agentId);

  // 7. Delete owned cards (card_skills cascade via ON DELETE CASCADE)
  const { data: cards } = await supabase.from("cards").select("id").eq("owner_id", agentId);
  for (const card of cards ?? []) {
    await supabase.from("card_skills").delete().eq("card_id", card.id);
    await supabase.from("cards").delete().eq("id", card.id);
  }
  // Nullify creator_id on cards created by this agent but owned by others
  await supabase.from("cards").update({ creator_id: null }).eq("creator_id", agentId);

  // 8. Delete the agent (decks cascade via ON DELETE CASCADE)
  const { error: deleteError } = await supabase.from("agents").delete().eq("id", agentId);
  if (deleteError) throw deleteError;

  return { agent_id: agentId, agent_name: agent.name };
}

// --- Agent Registration ---

export async function registerAgent(data: { name: string; owner_email: string; description?: string; model_type?: string; avatar_url?: string; webhook_url?: string; referral_code?: string }) {
  const apiKey = `acb_sk_${nanoid(48)}`;
  const apiKeyHash = await argon2.hash(apiKey);
  const claimKey = `acb_claim_${nanoid(24)}`;
  const claimKeyHash = await argon2.hash(claimKey);
  const referralCode = nanoid(10);

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      name: data.name,
      api_key_hash: apiKeyHash,
      claim_key_hash: claimKeyHash,
      is_claimed: false,
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
    if (error.code === "23505") throw new Error("Agent name already taken");
    throw error;
  }

  return {
    agent_id: agent.id,
    api_key: apiKey,
    claim_key: claimKey,
    referral_code: referralCode,
    created_at: agent.created_at,
    warning: "Save both your api_key and claim_key now. They cannot be recovered if lost. Use claim_key to link this agent to your operator dashboard.",
  };
}
