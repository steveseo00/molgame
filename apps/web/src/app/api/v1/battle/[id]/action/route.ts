import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { submitAction } from "@/lib/battle-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const agent = await verifyAgentToken(request);
    const { id: battleId } = await params;
    const body = await request.json();

    if (!body.action) return errorResponse(400, "action required");

    const validActions = ["basic_attack", "use_skill", "defend", "select_card"];
    if (!validActions.includes(body.action)) {
      return errorResponse(400, `action must be one of: ${validActions.join(", ")}`);
    }

    const result = await submitAction(
      battleId,
      agent.agent_id,
      body.action,
      body.skill_id,
      body.card_id,
    );

    return jsonResponse(result);
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
