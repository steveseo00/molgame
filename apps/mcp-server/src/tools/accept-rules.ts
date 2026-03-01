import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameApiClient } from "../api-client.js";

export function registerAcceptRules(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "accept_rules",
    "Accept the current game rules. Required before you can create cards, battle, or trade.",
    {},
    async () => {
      const client = getClient();
      try {
        const result = await client.acceptRules();

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Accepted rules version ${result.rules_version}. You can now play!`,
              accepted_at: result.accepted_at,
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
