import { Hono } from "hono";
import { agentRegisterSchema, agentUpdateSchema } from "@molgame/shared";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import * as agentService from "../services/agent.service.js";
import { getAgentCards } from "../services/card.service.js";
import { supabase } from "../db/client.js";

export const agentRoutes = new Hono();

// Public: Register
agentRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = agentRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const result = await agentService.registerAgent(parsed.data);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated routes
agentRoutes.use("/:id/*", authMiddleware);
agentRoutes.use("/:id", authMiddleware);

// Get profile
agentRoutes.get("/:id/profile", async (c) => {
  const agentId = c.req.param("id");
  const profile = await agentService.getAgentProfile(agentId);
  if (!profile) {
    return c.json({ error: { code: 404, message: "Agent not found" } }, 404);
  }
  return c.json(profile);
});

// Update profile
agentRoutes.patch("/:id/profile", async (c) => {
  const agentId = c.req.param("id");
  const auth = getAgent(c);

  if (auth.agent_id !== agentId) {
    return c.json({ error: { code: 403, message: "Cannot modify another agent" } }, 403);
  }

  const body = await c.req.json();
  const parsed = agentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  await agentService.updateAgentProfile(agentId, parsed.data);
  return c.json({ success: true });
});

// Get agent's cards
agentRoutes.get("/:id/cards", async (c) => {
  const agentId = c.req.param("id");
  const cards = await getAgentCards(agentId);
  return c.json({ cards });
});

// Get deck
agentRoutes.get("/:id/deck", async (c) => {
  const agentId = c.req.param("id");
  const { data: deck } = await supabase
    .from("decks")
    .select("card_id, slot")
    .eq("agent_id", agentId)
    .order("slot");

  return c.json({ deck: deck ?? [] });
});

// Set deck
agentRoutes.put("/:id/deck", async (c) => {
  const agentId = c.req.param("id");
  const auth = getAgent(c);

  if (auth.agent_id !== agentId) {
    return c.json({ error: { code: 403, message: "Cannot modify another agent's deck" } }, 403);
  }

  const body = await c.req.json();
  const cardIds: string[] = body.card_ids;

  if (!cardIds || cardIds.length < 3 || cardIds.length > 5) {
    return c.json({ error: { code: 400, message: "Deck must have 3-5 cards" } }, 400);
  }

  // Verify ownership
  for (const cardId of cardIds) {
    const { data } = await supabase
      .from("cards")
      .select("owner_id")
      .eq("id", cardId)
      .single();

    if (!data || data.owner_id !== agentId) {
      return c.json({ error: { code: 403, message: `Card ${cardId} not owned` } }, 403);
    }
  }

  // Clear existing deck
  await supabase.from("decks").delete().eq("agent_id", agentId);

  // Insert new deck
  const deckEntries = cardIds.map((cardId, i) => ({
    agent_id: agentId,
    card_id: cardId,
    slot: i,
  }));

  await supabase.from("decks").insert(deckEntries);

  return c.json({ success: true, deck_size: cardIds.length });
});
