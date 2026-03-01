import { NextRequest } from "next/server";
import { verifyOperatorToken, getOperatorProfile } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const op = await verifyOperatorToken(request);
    const profile = await getOperatorProfile(op.operator_id);
    if (!profile) return errorResponse(404, "Operator not found");
    return jsonResponse(profile);
  } catch (err: any) {
    return errorResponse(401, err.message);
  }
}
