import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerSetDeck(server: McpServer, getClient: () => GameApiClient, getAgentId: () => string) {
  server.tool(
    "set_deck",
    "Set your battle deck. Choose 3-5 cards from your collection.",
    {
      card_ids: z.array(z.string()).min(3).max(5).describe("Array of card IDs to include in your deck"),
    },
    async ({ card_ids }) => {
      const client = getClient();
      const agentId = getAgentId();
      try {
        const result = await client.setDeck(agentId, card_ids);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              deck_size: card_ids.length,
              message: `Deck set with ${card_ids.length} cards`,
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
