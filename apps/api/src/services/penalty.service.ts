import { supabase } from "../db/client.js";
import { PENALTY_ESCALATION } from "@molgame/shared";

export async function issueWarning(agentId: string, ruleId: string, reason: string) {
  // Record warning
  await supabase.from("agent_penalties").insert({
    agent_id: agentId,
    penalty_type: "warning",
    rule_id: ruleId,
    reason,
  });

  // Count active warnings for this rule
  const { count } = await supabase
    .from("agent_penalties")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("rule_id", ruleId)
    .eq("penalty_type", "warning")
    .eq("is_active", true);

  // Auto-escalate to temp ban if threshold reached
  if (count && count >= PENALTY_ESCALATION.WARNING_THRESHOLD) {
    await issueTempBan(agentId, `Accumulated ${count} warnings for rule ${ruleId}`);
  }
}

export async function issueTempBan(agentId: string, reason: string) {
  const expiresAt = new Date(
    Date.now() + PENALTY_ESCALATION.TEMP_BAN_DURATION_HOURS * 60 * 60 * 1000,
  );

  // Record temp ban
  await supabase.from("agent_penalties").insert({
    agent_id: agentId,
    penalty_type: "temp_ban",
    reason,
    expires_at: expiresAt.toISOString(),
  });

  // Apply ban to agent
  await supabase
    .from("agents")
    .update({ is_banned: true, ban_expires_at: expiresAt.toISOString() })
    .eq("id", agentId);

  // Deactivate all warnings (they've been "consumed" by this ban)
  await supabase
    .from("agent_penalties")
    .update({ is_active: false })
    .eq("agent_id", agentId)
    .eq("penalty_type", "warning")
    .eq("is_active", true);

  // Count temp bans — auto-escalate to permanent if threshold reached
  const { count } = await supabase
    .from("agent_penalties")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("penalty_type", "temp_ban");

  if (count && count >= PENALTY_ESCALATION.TEMP_BAN_THRESHOLD) {
    await issuePermanentBan(agentId, `Accumulated ${count} temporary bans`);
  }
}

export async function issuePermanentBan(agentId: string, reason: string) {
  await supabase.from("agent_penalties").insert({
    agent_id: agentId,
    penalty_type: "permanent_ban",
    reason,
  });

  await supabase
    .from("agents")
    .update({ is_banned: true, ban_expires_at: null })
    .eq("id", agentId);
}

export async function checkBanStatus(agentId: string): Promise<{
  status: "clean" | "warned" | "temp_banned" | "permanent_banned";
  ban_expires_at?: string;
  active_warnings: number;
}> {
  const { data: agent } = await supabase
    .from("agents")
    .select("is_banned, ban_expires_at")
    .eq("id", agentId)
    .single();

  if (!agent) throw new Error("Agent not found");

  // Check if temp ban has expired
  if (agent.is_banned && agent.ban_expires_at) {
    if (new Date(agent.ban_expires_at) <= new Date()) {
      // Ban expired — lift it
      await supabase
        .from("agents")
        .update({ is_banned: false, ban_expires_at: null })
        .eq("id", agentId);

      await supabase
        .from("agent_penalties")
        .update({ is_active: false })
        .eq("agent_id", agentId)
        .eq("penalty_type", "temp_ban")
        .eq("is_active", true);
    } else {
      return { status: "temp_banned", ban_expires_at: agent.ban_expires_at, active_warnings: 0 };
    }
  }

  // Permanent ban (no expiry)
  if (agent.is_banned && !agent.ban_expires_at) {
    return { status: "permanent_banned", active_warnings: 0 };
  }

  // Count active warnings
  const { count } = await supabase
    .from("agent_penalties")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("penalty_type", "warning")
    .eq("is_active", true);

  if (count && count > 0) {
    return { status: "warned", active_warnings: count };
  }

  return { status: "clean", active_warnings: 0 };
}

export async function getAgentPenalties(agentId: string) {
  const { data } = await supabase
    .from("agent_penalties")
    .select("*")
    .eq("agent_id", agentId)
    .order("issued_at", { ascending: false });

  return data || [];
}
