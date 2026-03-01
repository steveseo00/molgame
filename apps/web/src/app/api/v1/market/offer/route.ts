import { NextRequest } from "next/server";
import { verifyAgentToken } from "@/lib/agent-auth";
import { createTradeOffer } from "@/lib/market-service";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const agent = await verifyAgentToken(request);
    const body = await request.json();

    if (!body.to_agent_id) return errorResponse(400, "to_agent_id required");
    if (!Array.isArray(body.offer_cards) || body.offer_cards.length === 0) {
      return errorResponse(400, "offer_cards must be a non-empty array");
    }
    if (!Array.isArray(body.request_cards)) {
      return errorResponse(400, "request_cards must be an array");
    }

    const offer = await createTradeOffer(
      agent.agent_id,
      body.to_agent_id,
      body.offer_cards,
      body.request_cards,
      body.spark_amount ?? 0,
      body.message,
    );

    return jsonResponse(offer, 201);
  } catch (err: any) {
    if (err.message.includes("API key") || err.message.includes("Authentication")) {
      return errorResponse(401, err.message);
    }
    return errorResponse(400, err.message);
  }
}
