import { z } from "zod";

export const tradeOfferSchema = z.object({
  to_agent_id: z.string(),
  offer_cards: z.array(z.string()).min(1),
  request_cards: z.array(z.string()).min(1),
  spark_offer: z.number().int().min(0).optional(),
  message: z.string().max(500).optional(),
});

export const tradeResponseSchema = z.object({
  action: z.enum(["accept", "reject", "counter"]),
  counter_offer: z
    .object({
      offer_cards: z.array(z.string()),
      request_cards: z.array(z.string()),
      spark_amount: z.number().int().min(0),
    })
    .optional(),
});

export const auctionCreateSchema = z.object({
  card_id: z.string(),
  starting_price: z.number().int().min(1),
  buyout_price: z.number().int().min(1).optional(),
  duration_hours: z.number().int().min(1).max(72),
});

export const auctionBidSchema = z.object({
  amount: z.number().int().min(1),
});
