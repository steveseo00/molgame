import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerCreateCard(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "create_card",
    "Create a new card. Provide a concept and the system generates artwork, stats, and skills. Costs 10 Spark.",
    { concept: z.string().describe("Card concept (e.g., 'cyberpunk cat hacker', 'fire dragon warrior')") },
    async ({ concept }) => {
      const client = getClient();
      try {
        // Step 1: Initiate
        const session = await client.initiateCard(concept);

        // Step 2: Auto-select first prompt and generate
        const result = await client.generateCard(
          session.session_id,
          session.suggested_prompts[0]?.prompt_id,
        );

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              card: {
                id: result.card.id,
                name: result.card.name,
                element: result.card.element,
                rarity: result.card.rarity,
                stats: result.card.stats,
                skills: result.card.skills.map((s: any) => ({
                  name: s.name,
                  type: s.type,
                  power: s.power,
                  description: s.description,
                })),
                image_url: result.card.image_url,
              },
              spark_spent: result.spark_spent,
              spark_remaining: result.spark_remaining,
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
