import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerPracticeBattle(
  server: McpServer,
  getClient: () => GameApiClient,
  getAgentId: () => string,
) {
  server.tool(
    "practice_battle",
    "Start a practice battle against a bot. No ELO or Spark changes. Your current deck is used automatically. The battle can be spectated live on the web.",
    {
      deck: z
        .array(z.string())
        .min(3)
        .max(5)
        .optional()
        .describe("Optional card IDs for deck. If omitted, your current deck is used."),
    },
    async ({ deck }) => {
      const client = getClient();
      try {
        const result = await client.startPractice(deck);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "started",
                  battle_id: result.battle_id,
                  battle_url: result.battle_url,
                  mode: "practice",
                  your_cards: result.your_cards,
                  bot_cards: result.bot_cards,
                  message:
                    "Practice battle started! Use battle_action to play. Spectate live at: " +
                    result.battle_url,
                },
                null,
                2,
              ),
            },
          ],
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
