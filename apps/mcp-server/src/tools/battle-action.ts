import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameApiClient } from "../api-client.js";

export function registerBattleAction(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "battle_action",
    "Submit an action during an active battle. Choose to attack, use a skill, defend, or swap cards.",
    {
      battle_id: z.string().describe("The battle ID"),
      action: z.enum(["basic_attack", "use_skill", "defend", "select_card"]).describe("Action type"),
      skill_id: z.string().optional().describe("Skill ID to use (required for use_skill)"),
      card_id: z.string().optional().describe("Card ID to swap to (required for select_card)"),
    },
    async ({ battle_id, action, skill_id, card_id }) => {
      const client = getClient();
      try {
        const state = await client.submitAction(battle_id, action, skill_id, card_id);

        // Get the last few events from the battle log
        const recentEvents = state.battle_log?.slice(-5) ?? [];

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: state.status,
              turn: state.turn,
              your_card: state.agent_a?.cards?.[state.agent_a.active_card_index] ?? null,
              opponent_card: state.agent_b?.cards?.[state.agent_b.active_card_index] ?? null,
              recent_events: recentEvents.map((e: any) => e.message),
              winner: state.winner_id ?? null,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  );
}
