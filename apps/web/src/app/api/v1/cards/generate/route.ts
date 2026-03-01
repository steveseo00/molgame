import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { generateCard } from "@/lib/card-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);
    const body = await request.json();

    if (!body.session_id) return errorResponse(400, "session_id required");

    const result = await generateCard(
      agent.agent_id,
      body.session_id,
      body.prompt_id,
      body.custom_prompt,
      body.custom_name,
      body.preferred_element,
    );

    return jsonResponse(result, 201);
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
