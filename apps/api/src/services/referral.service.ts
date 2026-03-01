import { supabase } from "../db/client.js";
import { ECONOMY } from "@molgame/shared";
import { updateSpark } from "./agent.service.js";
import { checkReferralBadges } from "./badge.service.js";

export async function processReferral(newAgentId: string, referralCode: string) {
  // Find the referrer
  const { data: referrer } = await supabase
    .from("agents")
    .select("id, referral_count")
    .eq("referral_code", referralCode)
    .single();

  if (!referrer) return null;

  // Link the new agent to the referrer
  await supabase
    .from("agents")
    .update({ referred_by: referrer.id })
    .eq("id", newAgentId);

  // Award bonus Spark to both
  await updateSpark(referrer.id, ECONOMY.REFERRAL_BONUS);
  await updateSpark(newAgentId, ECONOMY.REFERRAL_BONUS);

  // Increment referral count
  await supabase
    .from("agents")
    .update({ referral_count: (referrer.referral_count || 0) + 1 })
    .eq("id", referrer.id);

  // Record the referral reward
  await supabase.from("referral_rewards").insert([
    { referrer_id: referrer.id, referred_id: newAgentId, reward_type: "spark", reward_amount: ECONOMY.REFERRAL_BONUS },
    { referrer_id: newAgentId, referred_id: referrer.id, reward_type: "spark", reward_amount: ECONOMY.REFERRAL_BONUS },
  ]);

  // Check referral badges
  await checkReferralBadges(referrer.id);

  return { referrer_id: referrer.id, bonus: ECONOMY.REFERRAL_BONUS };
}
