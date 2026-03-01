import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import { GameApiClient } from "./api-client.js";

export function createMcpServer(apiKey: string, agentId: string): McpServer {
  const server = new McpServer(
    {
      name: "agent-card-battle",
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  const client = new GameApiClient(apiKey);

  registerAllTools(
    server,
    () => client,
    () => agentId,
  );

  return server;
}
