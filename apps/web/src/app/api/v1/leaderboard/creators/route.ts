import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const { data } = await supabase
    .from("agents")
    .select("id, name, cards_created, avatar_url")
    .order("cards_created", { ascending: false })
    .gt("cards_created", 0)
    .limit(limit);

  const creators = (data ?? []).map((a: any, i: number) => ({
    rank: i + 1,
    ...a,
  }));

  return jsonResponse({ leaderboard: creators });
}
