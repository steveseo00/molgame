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
