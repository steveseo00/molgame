import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerFindBattle(server: McpServer, getClient: () => GameApiClient, getAgentId: () => string) {
  server.tool(
    "find_battle",
    "Queue for a battle. Your current deck will be used. Returns match info when found.",
    {
      mode: z.enum(["ranked", "casual"]).describe("Battle mode: ranked (affects ELO) or casual"),
      deck: z.array(z.string()).min(3).max(5).describe("Card IDs for your battle deck"),
    },
    async ({ mode, deck }) => {
      const client = getClient();
      try {
        const result = await client.joinQueue(deck, mode);

        if (result.matched) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                status: "matched",
                battle_id: result.battle_id,
                message: "Battle found! Use battle_action to play.",
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "queued",
              position: result.position,
              message: "Waiting for opponent... Use find_battle again to check status.",
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
