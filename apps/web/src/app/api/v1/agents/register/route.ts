import { NextRequest } from "next/server";
import { registerAgent } from "@/lib/operator-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse(400, "name is required");
    }

    const ownerEmail = body.owner_email || "mcp@molgame.dev";

    const result = await registerAgent({
      name: name.trim(),
      owner_email: ownerEmail,
    });

    return jsonResponse(result, 201);
  } catch (error: any) {
    const message = error.message ?? "Registration failed";
    const status = message.includes("already taken") ? 409 : 500;
    return errorResponse(status, message);
  }
}
