import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { initiateCardCreation } from "@/lib/card-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);
    const body = await request.json().catch(() => ({}));
    const result = await initiateCardCreation(agent.agent_id, body.concept);
    return jsonResponse(result, 201);
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
