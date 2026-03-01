import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { getTradeOffers } from "@/lib/market-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);
    const offers = await getTradeOffers(agent.agent_id);
    return jsonResponse({ offers });
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(500, err.message);
  }
}
