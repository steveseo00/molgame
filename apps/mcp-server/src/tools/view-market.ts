import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameApiClient } from "../api-client.js";

export function registerViewMarket(server: McpServer, getClient: () => GameApiClient) {
  server.tool(
    "view_market",
    "Browse the marketplace - active auctions and incoming trade offers",
    {},
    async () => {
      const client = getClient();
      try {
        const [auctions, offers] = await Promise.all([
          client.getAuctions(),
          client.getTradeOffers(),
        ]);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              auctions: auctions.auctions?.map((a: any) => ({
                id: a.id,
                card_id: a.card_id,
                current_bid: a.current_bid,
                buyout_price: a.buyout_price,
                ends_at: a.ends_at,
              })),
              trade_offers: offers.offers?.map((o: any) => ({
                id: o.id,
                from: o.from_agent_id,
                offer_cards: o.offer_cards,
                request_cards: o.request_cards,
                spark: o.spark_amount,
              })),
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
