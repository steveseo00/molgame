import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: cardId } = await params;

  const { data: card, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error || !card) return errorResponse(404, "Card not found");

  const { data: skills } = await supabase
    .from("card_skills")
    .select("*")
    .eq("card_id", cardId);

  return jsonResponse({
    id: card.id,
    name: card.name,
    description: card.description,
    image_url: card.image_url,
    image_prompt: card.image_prompt,
    creator_id: card.creator_id,
    owner_id: card.owner_id,
    element: card.element,
    rarity: card.rarity,
    stats: { hp: card.hp, atk: card.atk, def: card.def, spd: card.spd },
    skills: (skills ?? []).map((s: any) => ({
      skill_id: s.skill_id,
      name: s.name,
      description: s.description,
      element: s.element,
      type: s.type,
      power: s.power,
      cost: s.cost,
      cooldown: s.cooldown,
      effects: s.effects ?? [],
    })),
    battle_count: card.battle_count,
    win_count: card.win_count,
    is_tradeable: card.is_tradeable,
    created_at: card.created_at,
  });
}
