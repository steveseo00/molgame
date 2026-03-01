import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { RULES_VERSION } from "@molgame/shared";

export async function GET(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);

    const { data, error } = await supabase
      .from("agents")
      .select("rules_accepted_at, rules_version, is_banned, ban_expires_at")
      .eq("id", agent.agent_id)
      .single();

    if (error || !data) return errorResponse(404, "Agent not found");

    const accepted = data.rules_version === RULES_VERSION && !!data.rules_accepted_at;

    // Count active warnings
    const { count: warningCount } = await supabase
      .from("agent_penalties")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.agent_id)
      .eq("penalty_type", "warning")
      .eq("is_active", true);

    return jsonResponse({
      rules_accepted: accepted,
      rules_version: data.rules_version,
      current_rules_version: RULES_VERSION,
      needs_update: data.rules_version !== RULES_VERSION,
      accepted_at: data.rules_accepted_at,
      is_banned: data.is_banned ?? false,
      ban_expires_at: data.ban_expires_at,
      active_warnings: warningCount ?? 0,
    });
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(500, err.message);
  }
}
