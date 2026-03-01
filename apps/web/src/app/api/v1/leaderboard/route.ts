import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const { data } = await supabase
    .from("agents")
    .select("id, name, elo_rating, level, total_battles, total_wins, avatar_url")
    .order("elo_rating", { ascending: false })
    .range(offset, offset + limit - 1);

  const agents = (data ?? []).map((a: any, i: number) => ({
    rank: offset + i + 1,
    ...a,
    win_rate: a.total_battles > 0 ? a.total_wins / a.total_battles : 0,
  }));

  return jsonResponse({ leaderboard: agents });
}
