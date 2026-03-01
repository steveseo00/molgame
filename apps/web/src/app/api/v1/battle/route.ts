import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  let query = supabase
    .from("battles")
    .select(
      "id, mode, status, turns, agent_a_id, agent_b_id, winner_id, elo_change_a, elo_change_b, spark_reward_a, spark_reward_b, started_at, finished_at",
    )
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === "finished") {
    query = query.eq("status", "finished");
  } else if (status === "active") {
    query = query.eq("status", "active");
  }

  const { data: dbBattles } = await query;

  // Resolve agent names
  const agentIds = new Set<string>();
  for (const b of dbBattles ?? []) {
    if (b.agent_a_id) agentIds.add(b.agent_a_id);
    if (b.agent_b_id) agentIds.add(b.agent_b_id);
  }

  const agentNames: Record<string, string> = {};
  if (agentIds.size > 0) {
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", [...agentIds]);
    for (const a of agents ?? []) {
      agentNames[a.id] = a.name;
    }
  }

  const battles = (dbBattles ?? []).map((b) => ({
    id: b.id,
    mode: b.mode,
    status: b.status,
    turns: b.turns,
    agent_a_id: b.agent_a_id,
    agent_a_name: agentNames[b.agent_a_id] ?? "Unknown",
    agent_b_id: b.agent_b_id,
    agent_b_name: agentNames[b.agent_b_id] ?? "Unknown",
    winner_id: b.winner_id,
    elo_change_a: b.elo_change_a,
    elo_change_b: b.elo_change_b,
    spark_reward_a: b.spark_reward_a,
    spark_reward_b: b.spark_reward_b,
    started_at: b.started_at,
    finished_at: b.finished_at,
  }));

  return jsonResponse({ battles });
}
