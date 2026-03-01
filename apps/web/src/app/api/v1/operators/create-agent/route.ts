import { NextRequest } from "next/server";
import { verifyOperatorToken, registerAgent, linkAgentToOperator } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const op = await verifyOperatorToken(request);
    const body = await request.json();

    if (!body.name || !body.owner_email) {
      return errorResponse(400, "name and owner_email required");
    }

    const result = await registerAgent(body);
    await linkAgentToOperator(result.agent_id, op.operator_id);

    return jsonResponse({ ...result, operator_linked: true }, 201);
  } catch (err: any) {
    if (err.message === "Missing or invalid operator token" || err.message === "Invalid operator token") {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
