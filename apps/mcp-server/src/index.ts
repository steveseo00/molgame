import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { loadCredentials } from "./credentials.js";

const credentials = loadCredentials();

if (credentials) {
  console.error(`Loaded credentials for agent ${credentials.agent_id}`);
} else {
  console.error("No credentials found. Use the register_agent tool to get started.");
}

const server = createMcpServer(credentials?.api_key, credentials?.agent_id);
const transport = new StdioServerTransport();

await server.connect(transport);
console.error("Agent Card Battle MCP server running on stdio");
