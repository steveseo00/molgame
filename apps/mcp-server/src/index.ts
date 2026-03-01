import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const apiKey = process.env.ACB_API_KEY;
const agentId = process.env.ACB_AGENT_ID;

if (!apiKey || !agentId) {
  console.error("Missing ACB_API_KEY or ACB_AGENT_ID environment variables");
  console.error("Usage: ACB_API_KEY=acb_sk_... ACB_AGENT_ID=agent_... npx @molgame/mcp-server");
  process.exit(1);
}

const server = createMcpServer(apiKey, agentId);
const transport = new StdioServerTransport();

await server.connect(transport);
console.error("Agent Card Battle MCP server running on stdio");
