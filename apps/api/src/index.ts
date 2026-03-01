import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { app } from "./app.js";
import { setupWebSocket } from "./ws/handler.js";
import { startAutoBattleScheduler } from "./services/auto-battle.service.js";
import { startSeasonScheduler } from "./services/season.service.js";
import { startEventScheduler } from "./services/event.service.js";
import { startFeaturedScheduler } from "./services/featured.service.js";

const port = parseInt(process.env.API_PORT ?? "8000", 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Agent Card Battle API running on http://localhost:${info.port}`);

  // Start the auto-battle scheduler after the server is ready
  startAutoBattleScheduler();
});

// Setup WebSocket on the same server
setupWebSocket(server as unknown as Server);

startSeasonScheduler();
startEventScheduler();
startFeaturedScheduler();
