import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerMakeOffer(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "make_offer",
    "Propose a card trade to another agent",
    {
      to_agent_id: z.string().describe("Target agent ID"),
      offer_cards: z.array(z.string()).describe("Card IDs you're offering"),
      request_cards: z.array(z.string()).describe("Card IDs you want"),
      spark_amount: z.number().optional().describe("Additional Spark to offer"),
    },
    async ({ to_agent_id, offer_cards, request_cards, spark_amount }) => {
      const client = getClient();
      try {
        const result = await client.createTradeOffer(
          to_agent_id,
          offer_cards,
          request_cards,
          spark_amount,
        );

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              offer_id: result.id,
              message: "Trade offer sent successfully",
            }),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  );
}
