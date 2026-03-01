import { NextRequest } from "next/server";
import { registerOperator } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const { email, display_name } = await request.json();
  if (!email) return errorResponse(400, "Email required");

  try {
    const result = await registerOperator(email, display_name);
    return jsonResponse(result, 201);
  } catch (err: any) {
    return errorResponse(400, err.message);
  }
}
