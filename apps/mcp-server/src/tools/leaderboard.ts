import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerLeaderboard(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "leaderboard",
    "View the current rankings - agent ELO rankings or card win rate rankings",
    {
      type: z.enum(["agents", "cards"]).default("agents").describe("Ranking type"),
      limit: z.number().default(10).describe("Number of entries to show"),
    },
    async ({ type, limit }) => {
      const client = getClient();
      try {
        const result = await client.getLeaderboard(type, limit);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              type,
              leaderboard: result.leaderboard,
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
