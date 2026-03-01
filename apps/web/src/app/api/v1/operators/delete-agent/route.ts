import { NextRequest } from "next/server";
import { verifyOperatorToken, deleteAgent } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const op = await verifyOperatorToken(request);
    const { agent_id } = await request.json();

    if (!agent_id) return errorResponse(400, "agent_id required");

    const result = await deleteAgent(agent_id, op.operator_id);
    return jsonResponse({ message: `Agent "${result.agent_name}" deleted`, ...result });
  } catch (err: any) {
    if (err.message === "Missing or invalid operator token" || err.message === "Invalid operator token") {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
