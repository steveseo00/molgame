import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameApiClient } from "../api-client.js";

export function registerViewRules(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "view_rules",
    "View the game rules and your current compliance status. Must accept rules before playing.",
    {},
    async () => {
      const client = getClient();
      try {
        const [rules, status] = await Promise.all([
          client.getRules(),
          client.getRulesStatus().catch(() => null),
        ]);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              rules: rules.rules,
              rules_version: rules.version,
              your_status: status || "Not yet registered",
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
