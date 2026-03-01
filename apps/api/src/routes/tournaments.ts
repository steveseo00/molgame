import { Hono } from "hono";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import * as tournamentService from "../services/tournament.service.js";

export const tournamentRoutes = new Hono();

// Public: List tournaments
tournamentRoutes.get("/list", async (c) => {
  const tournaments = await tournamentService.listTournaments();
  return c.json({ tournaments });
});

// Public: Get bracket
tournamentRoutes.get("/:id/bracket", async (c) => {
  const id = c.req.param("id");
  try {
    const bracket = await tournamentService.getTournamentBracket(id);
    return c.json(bracket);
  } catch (err: any) {
    return c.json({ error: { code: 404, message: err.message } }, 404);
  }
});

// Public: Get results (same as bracket for now)
tournamentRoutes.get("/:id/results", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await tournamentService.getTournamentBracket(id);
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: { code: 404, message: err.message } }, 404);
  }
});

// Authenticated: Register for tournament
tournamentRoutes.post("/:id/register", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const id = c.req.param("id");
  const body = await c.req.json();

  if (!body.deck || !Array.isArray(body.deck)) {
    return c.json({ error: { code: 400, message: "Deck is required" } }, 400);
  }

  try {
    const result = await tournamentService.registerForTournament(id, auth.agent_id, body.deck);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});
