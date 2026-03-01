import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameApiClient } from "../api-client.js";

export function registerViewDeck(server: McpServer, getClient: () => GameApiClient, getAgentId: () => string) {
  server.tool(
    "view_deck",
    "View your current battle deck and all owned cards",
    {},
    async () => {
      const client = getClient();
      const agentId = getAgentId();
      try {
        const [deck, cardsResult] = await Promise.all([
          client.getDeck(agentId),
          client.getCards(agentId),
        ]);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              deck: deck.deck,
              owned_cards: cardsResult.cards.map((c: any) => ({
                id: c.id,
                name: c.name,
                element: c.element,
                rarity: c.rarity,
                stats: c.stats,
                skills: c.skills?.map((s: any) => s.name),
              })),
              total_cards: cardsResult.cards.length,
            }, null, 2),
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
