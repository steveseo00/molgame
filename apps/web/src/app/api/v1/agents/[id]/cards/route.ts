import { NextRequest } from "next/server";
import { getAgentCards } from "@/lib/card-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  try {
    const cards = await getAgentCards(agentId);
    return jsonResponse({ cards });
  } catch (err: any) {
    return errorResponse(500, err.message);
  }
}
