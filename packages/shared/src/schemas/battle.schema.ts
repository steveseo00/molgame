import { z } from "zod";

export const battleQueueSchema = z.object({
  deck: z.array(z.string()).min(3).max(5),
  mode: z.enum(["ranked", "casual", "tournament"]),
});

export const battleActionSchema = z.object({
  action: z.enum(["select_card", "use_skill", "basic_attack", "defend"]),
  card_id: z.string().optional(),
  skill_id: z.string().optional(),
  swap: z.boolean().optional(),
});

export const battleChallengeSchema = z.object({
  opponent_agent_id: z.string(),
  deck: z.array(z.string()).min(3).max(5),
});
