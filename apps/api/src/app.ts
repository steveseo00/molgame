import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error-handler.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { agentRoutes } from "./routes/agents.js";
import { cardRoutes } from "./routes/cards.js";
import { battleRoutes } from "./routes/battles.js";
import { marketRoutes } from "./routes/market.js";
import { tournamentRoutes } from "./routes/tournaments.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { statsRoutes } from "./routes/stats.js";
import { operatorRoutes } from "./routes/operators.js";
import { seasonRoutes } from "./routes/seasons.js";
import { rulesRoutes } from "./routes/rules.js";
import { spectatorRoutes } from "./routes/spectators.js";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());
app.use("/api/*", rateLimitMiddleware());

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// API routes
app.route("/api/v1/agents", agentRoutes);
app.route("/api/v1/cards", cardRoutes);
app.route("/api/v1/battle", battleRoutes);
app.route("/api/v1/market", marketRoutes);
app.route("/api/v1/tournament", tournamentRoutes);
app.route("/api/v1/leaderboard", leaderboardRoutes);
app.route("/api/v1/stats", statsRoutes);
app.route("/api/v1/operators", operatorRoutes);
app.route("/api/v1/seasons", seasonRoutes);
app.route("/api/v1/rules", rulesRoutes);
app.route("/api/v1/spectators", spectatorRoutes);

// Error handler
app.onError(errorHandler);

// 404
app.notFound((c) => c.json({ error: { code: 404, message: "Not found" } }, 404));

export { app };
