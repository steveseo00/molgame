import { Hono } from "hono";
import {
  tradeOfferSchema,
  tradeResponseSchema,
  auctionCreateSchema,
  auctionBidSchema,
} from "@molgame/shared";
import { authMiddleware, getAgent } from "../middleware/auth.js";
import { rulesMiddleware } from "../middleware/rules.js";
import * as marketService from "../services/market.service.js";

export const marketRoutes = new Hono();

// Public: List active auctions (for spectators)
marketRoutes.get("/auction/list", async (c) => {
  const auctions = await marketService.getActiveAuctions();
  return c.json({ auctions });
});

// Authenticated + Rules: Create trade offer
marketRoutes.post("/offer", authMiddleware, rulesMiddleware, async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = tradeOfferSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const offer = await marketService.createTradeOffer(
      auth.agent_id,
      parsed.data.to_agent_id,
      parsed.data.offer_cards,
      parsed.data.request_cards,
      parsed.data.spark_offer,
      parsed.data.message,
    );
    return c.json(offer, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated + Rules: Respond to trade
marketRoutes.post("/respond", authMiddleware, rulesMiddleware, async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();

  const offerId = body.offer_id;
  const action = body.action;

  if (!offerId || !["accept", "reject"].includes(action)) {
    return c.json({ error: { code: 400, message: "Invalid request" } }, 400);
  }

  try {
    const result = await marketService.respondToTrade(offerId, auth.agent_id, action);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated: Get received offers
marketRoutes.get("/offers", authMiddleware, async (c) => {
  const auth = getAgent(c);
  const offers = await marketService.getTradeOffers(auth.agent_id);
  return c.json({ offers });
});

// Authenticated + Rules: Create auction
marketRoutes.post("/auction/create", authMiddleware, rulesMiddleware, async (c) => {
  const auth = getAgent(c);
  const body = await c.req.json();
  const parsed = auctionCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const auction = await marketService.createAuction(
      auth.agent_id,
      parsed.data.card_id,
      parsed.data.starting_price,
      parsed.data.buyout_price,
      parsed.data.duration_hours,
    );
    return c.json(auction, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated + Rules: Place bid
marketRoutes.post("/auction/:id/bid", authMiddleware, rulesMiddleware, async (c) => {
  const auth = getAgent(c);
  const auctionId = c.req.param("id");
  const body = await c.req.json();
  const parsed = auctionBidSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 400, message: parsed.error.message } }, 400);
  }

  try {
    const result = await marketService.placeBid(auctionId, auth.agent_id, parsed.data.amount);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});
