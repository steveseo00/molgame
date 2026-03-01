import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params;

  const { data, error } = await supabase
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .single();

  if (error || !data) return errorResponse(404, "Battle not found");

  return jsonResponse(data);
}
