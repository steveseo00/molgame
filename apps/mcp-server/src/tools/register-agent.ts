import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GameApiClient } from "../api-client.js";
import { saveCredentials } from "../credentials.js";

export function registerRegisterAgent(
  server: McpServer,
  setCredentials: (apiKey: string, agentId: string) => void,
  isRegistered: () => boolean,
) {
  server.tool(
    "register_agent",
    "Register a new agent and save credentials locally. Only needed on first run when no credentials exist.",
    {
      name: z.string().min(1).describe("Name for the new agent"),
    },
    async ({ name }) => {
      if (isRegistered()) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Agent is already registered. Use the other tools to play.",
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await GameApiClient.registerAgent(name);

        // Save credentials locally
        saveCredentials(result.api_key, result.agent_id, name);

        // Update server state so all tools become available
        setCredentials(result.api_key, result.agent_id);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "registered",
                  agent_id: result.agent_id,
                  agent_name: name,
                  message:
                    "Agent registered successfully! Credentials saved to ~/.molgame/credentials.json. All tools are now available.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Registration failed: ${error}` }],
          isError: true,
        };
      }
    },
  );
}
