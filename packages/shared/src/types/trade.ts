export type TradeOfferStatus = "pending" | "accepted" | "rejected" | "countered" | "expired";

export interface TradeOffer {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  offer_cards: string[];
  request_cards: string[];
  spark_amount: number;
  message: string | null;
  status: TradeOfferStatus;
  created_at: string;
  responded_at: string | null;
}

export interface CreateTradeOfferRequest {
  to_agent_id: string;
  offer_cards: string[];
  request_cards: string[];
  spark_offer?: number;
  message?: string;
}

export interface TradeOfferResponse {
  action: "accept" | "reject" | "counter";
  counter_offer?: {
    offer_cards: string[];
    request_cards: string[];
    spark_amount: number;
  };
}

export type AuctionStatus = "active" | "completed" | "cancelled";

export interface Auction {
  id: string;
  seller_id: string;
  card_id: string;
  starting_price: number;
  buyout_price: number | null;
  current_bid: number;
  current_bidder: string | null;
  ends_at: string;
  status: AuctionStatus;
  created_at: string;
}

export interface CreateAuctionRequest {
  card_id: string;
  starting_price: number;
  buyout_price?: number;
  duration_hours: number;
}

export interface AuctionBidRequest {
  amount: number;
}
