import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);

    const { data, error } = await supabase
      .from("agent_penalties")
      .select("*")
      .eq("agent_id", agent.agent_id)
      .order("issued_at", { ascending: false });

    if (error) return errorResponse(500, error.message);

    return jsonResponse({ penalties: data ?? [] });
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(500, err.message);
  }
}
