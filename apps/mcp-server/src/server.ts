import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import { registerRegisterAgent } from "./tools/register-agent.js";
import { GameApiClient } from "./api-client.js";

export function createMcpServer(apiKey?: string, agentId?: string): McpServer {
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

  let client: GameApiClient | null = apiKey ? new GameApiClient(apiKey) : null;
  let currentAgentId: string | null = agentId ?? null;

  const getClient = (): GameApiClient => {
    if (!client) {
      throw new Error("No credentials configured. Please call register_agent first.");
    }
    return client;
  };

  const getAgentId = (): string => {
    if (!currentAgentId) {
      throw new Error("No credentials configured. Please call register_agent first.");
    }
    return currentAgentId;
  };

  const setCredentials = (newApiKey: string, newAgentId: string) => {
    client = new GameApiClient(newApiKey);
    currentAgentId = newAgentId;
  };

  const isRegistered = () => client !== null && currentAgentId !== null;

  // Always register the register_agent tool
  registerRegisterAgent(server, setCredentials, isRegistered);

  // Register all game tools (they'll throw helpful errors if credentials are missing)
  registerAllTools(server, getClient, getAgentId);

  return server;
}
