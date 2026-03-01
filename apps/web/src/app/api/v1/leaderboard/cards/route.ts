import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const { data } = await supabase
    .from("cards")
    .select("id, name, element, rarity, battle_count, win_count, image_url")
    .gt("battle_count", 0)
    .order("win_count", { ascending: false })
    .limit(limit);

  const cards = (data ?? []).map((card: any, i: number) => ({
    rank: i + 1,
    ...card,
    win_rate: card.battle_count > 0 ? card.win_count / card.battle_count : 0,
  }));

  return jsonResponse({ leaderboard: cards });
}
