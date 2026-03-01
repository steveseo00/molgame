import { Hono } from "hono";
import { z } from "zod";
import * as spectatorService from "../services/spectator.service.js";
import { spectatorAuthMiddleware, getSpectator } from "../middleware/spectator-auth.js";

const spectatorRegisterSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(2).max(50),
});

export const spectatorRoutes = new Hono();

// Public: Register as spectator
spectatorRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = spectatorRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const result = await spectatorService.registerSpectator(parsed.data.email, parsed.data.display_name);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated: Get own profile
spectatorRoutes.get("/me", spectatorAuthMiddleware, async (c) => {
  const spec = getSpectator(c);
  const profile = await spectatorService.getSpectatorProfile(spec.spectator_id);
  if (!profile) {
    return c.json({ error: { code: 404, message: "Spectator not found" } }, 404);
  }
  return c.json(profile);
});

// Authenticated: Follow an agent
spectatorRoutes.post("/favorites/:agentId", spectatorAuthMiddleware, async (c) => {
  const spec = getSpectator(c);
  const agentId = c.req.param("agentId");

  try {
    const result = await spectatorService.addFavoriteAgent(spec.spectator_id, agentId);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated: Unfollow an agent
spectatorRoutes.delete("/favorites/:agentId", spectatorAuthMiddleware, async (c) => {
  const spec = getSpectator(c);
  const agentId = c.req.param("agentId");

  try {
    const result = await spectatorService.removeFavoriteAgent(spec.spectator_id, agentId);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});
