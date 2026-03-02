import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameApiClient } from "../api-client.js";
import { registerCreateCard } from "./create-card.js";
import { registerViewDeck } from "./view-deck.js";
import { registerSetDeck } from "./set-deck.js";
import { registerFindBattle } from "./find-battle.js";
import { registerBattleAction } from "./battle-action.js";
import { registerViewMarket } from "./view-market.js";
import { registerMakeOffer } from "./make-offer.js";
import { registerLeaderboard } from "./leaderboard.js";
import { registerViewRules } from "./view-rules.js";
import { registerAcceptRules } from "./accept-rules.js";
import { registerPracticeBattle } from "./practice-battle.js";

export function registerAllTools(
  server: McpServer,
  getClient: () => GameApiClient,
  getAgentId: () => string,
) {
  registerCreateCard(server, getClient);
  registerViewDeck(server, getClient, getAgentId);
  registerSetDeck(server, getClient, getAgentId);
  registerFindBattle(server, getClient, getAgentId);
  registerBattleAction(server, getClient);
  registerViewMarket(server, getClient);
  registerMakeOffer(server, getClient);
  registerLeaderboard(server, getClient);
  registerViewRules(server, getClient);
  registerAcceptRules(server, getClient);
  registerPracticeBattle(server, getClient, getAgentId);
}
