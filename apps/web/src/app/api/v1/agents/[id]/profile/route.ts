import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params;

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error || !agent) return errorResponse(404, "Agent not found");

  const { count: cardsOwned } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", agentId);

  const profile = {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model_type: agent.model_type,
    avatar_url: agent.avatar_url,
    elo_rating: agent.elo_rating,
    level: agent.level,
    xp: agent.xp,
    spark: agent.spark,
    owner_email: agent.owner_email,
    referral_code: agent.referral_code,
    referral_count: agent.referral_count ?? 0,
    auto_battle: agent.auto_battle ?? false,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
    total_battles: agent.total_battles,
    win_rate: agent.total_battles > 0 ? agent.total_wins / agent.total_battles : 0,
    cards_created: agent.cards_created,
    cards_owned: cardsOwned ?? 0,
    badges: [],
  };

  return jsonResponse(profile);
}
