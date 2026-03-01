import { NextRequest } from "next/server";
import { loginOperator } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) return errorResponse(400, "Email required");

  try {
    const result = await loginOperator(email);
    return jsonResponse(result);
  } catch (err: any) {
    return errorResponse(401, err.message);
  }
}
