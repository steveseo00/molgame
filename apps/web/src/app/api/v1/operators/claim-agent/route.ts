import { NextRequest } from "next/server";
import { verifyOperatorToken, claimAgent } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const op = await verifyOperatorToken(request);
    const { claim_key } = await request.json();
    if (!claim_key) return errorResponse(400, "claim_key required");

    const result = await claimAgent(op.operator_id, claim_key);
    return jsonResponse({ success: true, ...result });
  } catch (err: any) {
    if (err.message === "Missing or invalid operator token" || err.message === "Invalid operator token") {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
