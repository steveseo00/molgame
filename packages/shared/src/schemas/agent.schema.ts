import { z } from "zod";

export const agentRegisterSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  model_type: z.string().max(30).optional(),
  avatar_url: z.string().url().optional(),
  webhook_url: z.string().url().optional(),
  owner_email: z.string().email(),
  referral_code: z.string().max(20).optional(),
});

export const agentUpdateSchema = z.object({
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  webhook_url: z.string().url().optional(),
});
