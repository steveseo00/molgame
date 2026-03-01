import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { RULES_VERSION } from "@molgame/shared";

export async function POST(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);

    const { error } = await supabase
      .from("agents")
      .update({
        rules_accepted_at: new Date().toISOString(),
        rules_version: RULES_VERSION,
      })
      .eq("id", agent.agent_id);

    if (error) return errorResponse(500, error.message);

    return jsonResponse({
      message: "Rules accepted",
      rules_version: RULES_VERSION,
      accepted_at: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
