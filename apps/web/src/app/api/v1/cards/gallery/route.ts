import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

async function getCardWithSkills(cardId: string) {
  const { data: card, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error || !card) return null;

  const { data: skills } = await supabase
    .from("card_skills")
    .select("*")
    .eq("card_id", cardId);

  return {
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
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const element = searchParams.get("element");
  const rarity = searchParams.get("rarity");
  const sort = searchParams.get("sort");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase.from("cards").select("id", { count: "exact" });

  if (element) query = query.eq("element", element);
  if (rarity) query = query.eq("rarity", rarity);

  const sortField = sort === "win_rate" ? "win_count" : "created_at";
  query = query.order(sortField, { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return jsonResponse({ cards: [], total: 0 });

  const cards = await Promise.all((data ?? []).map((c: { id: string }) => getCardWithSkills(c.id)));

  return jsonResponse({
    cards: cards.filter((c): c is NonNullable<typeof c> => c !== null),
    total: count ?? 0,
  });
}
