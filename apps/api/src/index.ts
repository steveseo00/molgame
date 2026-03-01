import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { app } from "./app.js";
import { setupWebSocket } from "./ws/handler.js";

const port = parseInt(process.env.API_PORT ?? "8000", 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Agent Card Battle API running on http://localhost:${info.port}`);
});

// Setup WebSocket on the same server
setupWebSocket(server as unknown as Server);
