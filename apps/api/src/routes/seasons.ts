import { Hono } from "hono";
import * as seasonService from "../services/season.service.js";
import { getActiveEvents } from "../services/event.service.js";

export const seasonRoutes = new Hono();

// List all seasons
seasonRoutes.get("/", async (c) => {
  const seasons = await seasonService.listSeasons();
  return c.json({ seasons });
});

// Get active season
seasonRoutes.get("/active", async (c) => {
  const season = await seasonService.getActiveSeason();
  if (!season) return c.json({ season: null, message: "No active season" });
  return c.json({ season });
});

// Get season leaderboard
seasonRoutes.get("/:id/leaderboard", async (c) => {
  const seasonId = parseInt(c.req.param("id"));
  const leaderboard = await seasonService.getSeasonLeaderboard(seasonId);
  return c.json({ leaderboard });
});

// Active events
seasonRoutes.get("/events", async (c) => {
  const events = getActiveEvents();
  return c.json({ events });
});
