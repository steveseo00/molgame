import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["upcoming", "registering", "in_progress"])
    .order("starts_at", { ascending: true });

  return jsonResponse({ tournaments: data ?? [] });
}
