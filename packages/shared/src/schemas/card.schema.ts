import { z } from "zod";

const elementEnum = z.enum(["fire", "water", "lightning", "nature", "shadow", "light"]);

export const cardInitiateSchema = z.object({
  concept: z.string().max(500).optional(),
});

export const cardGenerateSchema = z.object({
  session_id: z.string(),
  prompt_id: z.string().optional(),
  custom_prompt: z.string().max(500).optional(),
  custom_name: z.string().max(100).optional(),
  preferred_element: elementEnum.optional(),
});

export const deckSetSchema = z.object({
  card_ids: z.array(z.string()).min(3).max(7),
});
