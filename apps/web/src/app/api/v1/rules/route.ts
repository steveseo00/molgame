import { jsonResponse } from "@/lib/api-helpers";
import { GAME_RULES } from "@molgame/shared";

export async function GET() {
  return jsonResponse(GAME_RULES);
}
