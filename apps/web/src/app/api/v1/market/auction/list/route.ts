import { supabase } from "@/lib/supabase-server";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  const { data } = await supabase
    .from("auctions")
    .select("*")
    .eq("status", "active")
    .order("ends_at", { ascending: true });

  return jsonResponse({ auctions: data ?? [] });
}
