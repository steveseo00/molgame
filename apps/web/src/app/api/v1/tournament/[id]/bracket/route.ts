import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("tournaments")
    .select("bracket, participants, status, name, type")
    .eq("id", id)
    .single();

  if (error || !data) return errorResponse(404, "Tournament not found");

  return jsonResponse(data);
}
