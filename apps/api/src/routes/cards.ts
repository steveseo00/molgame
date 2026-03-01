import { Hono } from "hono";
import { cardInitiateSchema, cardGenerateSchema } from "@molgame/shared";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import * as cardService from "../services/card.service.js";

export const cardRoutes = new Hono();

// Public: Gallery
cardRoutes.get("/gallery", async (c) => {
  const element = c.req.query("element");
  const rarity = c.req.query("rarity");
  const sort = c.req.query("sort");
  const limit = parseInt(c.req.query("limit") ?? "20");
  const offset = parseInt(c.req.query("offset") ?? "0");

  const result = await cardService.getCardGallery({ element, rarity, sort, limit, offset });
  return c.json(result);
});

// Public: Card detail
cardRoutes.get("/:id", async (c) => {
  const cardId = c.req.param("id");
  const card = await cardService.getCardById(cardId);
  if (!card) {
    return c.json({ error: { code: 404, message: "Card not found" } }, 404);
  }
  return c.json(card);
});

// Authenticated: Initiate card creation
cardRoutes.post("/initiate", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = cardInitiateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const result = await cardService.initiateCardCreation(auth.agent_id, parsed.data.concept);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated: Generate card
cardRoutes.post("/generate", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = cardGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const result = await cardService.generateCard(
      auth.agent_id,
      parsed.data.session_id,
      parsed.data.prompt_id,
      parsed.data.custom_prompt ?? undefined,
      parsed.data.custom_name ?? undefined,
      parsed.data.preferred_element ?? undefined,
    );
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated: Delete card (burn for Spark)
cardRoutes.delete("/:id", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const cardId = c.req.param("id");

  const card = await cardService.getCardById(cardId);
  if (!card || card.owner_id !== auth.agent_id) {
    return c.json({ error: { code: 403, message: "Card not owned" } }, 403);
  }

  // TODO: Implement card burning with partial Spark refund
  return c.json({ error: { code: 501, message: "Not implemented yet" } }, 501);
});
