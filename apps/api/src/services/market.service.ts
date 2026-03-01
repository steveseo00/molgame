import { supabase } from "../db/client.js";
import { ECONOMY } from "@molgame/shared";
import { AppError } from "../middleware/error-handler.js";
import { ERROR_CODES } from "@molgame/shared";

export async function createTradeOffer(
  fromAgentId: string,
  toAgentId: string,
  offerCards: string[],
  requestCards: string[],
  sparkAmount = 0,
  message?: string,
) {
  // Verify ownership of offered cards
  for (const cardId of offerCards) {
    const { data } = await supabase
      .from("cards")
      .select("owner_id, is_tradeable")
      .eq("id", cardId)
      .single();

    if (!data || data.owner_id !== fromAgentId) {
      throw new AppError(403, ERROR_CODES.CARD_NOT_OWNED, `You don't own card ${cardId}`);
    }
    if (!data.is_tradeable) {
      throw new AppError(400, ERROR_CODES.CARD_NOT_TRADEABLE, `Card ${cardId} is not tradeable`);
    }
  }

  // Verify target owns requested cards
  for (const cardId of requestCards) {
    const { data } = await supabase
      .from("cards")
      .select("owner_id, is_tradeable")
      .eq("id", cardId)
      .single();

    if (!data || data.owner_id !== toAgentId || !data.is_tradeable) {
      throw new AppError(400, ERROR_CODES.CARD_NOT_TRADEABLE, `Card ${cardId} not available for trade`);
    }
  }

  // Check spark balance
  if (sparkAmount > 0) {
    const { data: agent } = await supabase
      .from("agents")
      .select("spark")
      .eq("id", fromAgentId)
      .single();

    if (!agent || agent.spark < sparkAmount) {
      throw new AppError(400, ERROR_CODES.INSUFFICIENT_SPARK, "Insufficient Spark for trade offer");
    }
  }

  const { data: offer, error } = await supabase
    .from("trade_offers")
    .insert({
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      offer_cards: offerCards,
      request_cards: requestCards,
      spark_amount: sparkAmount,
      message: message ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return offer;
}

export async function respondToTrade(
  offerId: string,
  agentId: string,
  action: "accept" | "reject",
) {
  const { data: offer, error } = await supabase
    .from("trade_offers")
    .select("*")
    .eq("id", offerId)
    .eq("to_agent_id", agentId)
    .eq("status", "pending")
    .single();

  if (error || !offer) throw new Error("Trade offer not found");

  if (action === "reject") {
    await supabase
      .from("trade_offers")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("id", offerId);
    return { status: "rejected" };
  }

  // Accept: transfer cards and spark
  // Transfer offered cards to receiver
  for (const cardId of offer.offer_cards) {
    await supabase.from("cards").update({ owner_id: agentId }).eq("id", cardId);
  }

  // Transfer requested cards to sender
  for (const cardId of offer.request_cards) {
    await supabase.from("cards").update({ owner_id: offer.from_agent_id }).eq("id", cardId);
  }

  // Transfer spark
  if (offer.spark_amount > 0) {
    const { data: sender } = await supabase
      .from("agents")
      .select("spark")
      .eq("id", offer.from_agent_id)
      .single();

    const { data: receiver } = await supabase
      .from("agents")
      .select("spark")
      .eq("id", agentId)
      .single();

    if (sender && receiver) {
      await supabase
        .from("agents")
        .update({ spark: sender.spark - offer.spark_amount })
        .eq("id", offer.from_agent_id);
      await supabase
        .from("agents")
        .update({ spark: receiver.spark + offer.spark_amount })
        .eq("id", agentId);
    }
  }

  await supabase
    .from("trade_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId);

  return { status: "accepted" };
}

export async function getTradeOffers(agentId: string) {
  const { data, error } = await supabase
    .from("trade_offers")
    .select("*")
    .eq("to_agent_id", agentId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// Auction functions
export async function createAuction(
  sellerId: string,
  cardId: string,
  startingPrice: number,
  buyoutPrice: number | undefined,
  durationHours: number,
) {
  // Verify ownership
  const { data: card } = await supabase
    .from("cards")
    .select("owner_id, is_tradeable")
    .eq("id", cardId)
    .single();

  if (!card || card.owner_id !== sellerId) {
    throw new AppError(403, ERROR_CODES.CARD_NOT_OWNED, "You don't own this card");
  }
  if (!card.is_tradeable) {
    throw new AppError(400, ERROR_CODES.CARD_NOT_TRADEABLE, "Card is not tradeable");
  }

  // Mark card as not tradeable during auction
  await supabase.from("cards").update({ is_tradeable: false }).eq("id", cardId);

  const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const { data: auction, error } = await supabase
    .from("auctions")
    .insert({
      seller_id: sellerId,
      card_id: cardId,
      starting_price: startingPrice,
      buyout_price: buyoutPrice ?? null,
      ends_at: endsAt,
    })
    .select()
    .single();

  if (error) throw error;
  return auction;
}

export async function placeBid(auctionId: string, bidderId: string, amount: number) {
  const { data: auction } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", auctionId)
    .eq("status", "active")
    .single();

  if (!auction) throw new AppError(400, ERROR_CODES.AUCTION_ENDED, "Auction not found or ended");

  if (new Date(auction.ends_at) < new Date()) {
    throw new AppError(400, ERROR_CODES.AUCTION_ENDED, "Auction has ended");
  }

  if (amount <= auction.current_bid) {
    throw new Error("Bid must be higher than current bid");
  }

  if (amount < auction.starting_price) {
    throw new Error("Bid must be at least the starting price");
  }

  // Check bidder balance
  const { data: bidder } = await supabase
    .from("agents")
    .select("spark")
    .eq("id", bidderId)
    .single();

  if (!bidder || bidder.spark < amount) {
    throw new AppError(400, ERROR_CODES.INSUFFICIENT_SPARK, "Insufficient Spark");
  }

  // Check for buyout
  const isBuyout = auction.buyout_price && amount >= auction.buyout_price;

  await supabase
    .from("auctions")
    .update({
      current_bid: amount,
      current_bidder: bidderId,
      status: isBuyout ? "completed" : "active",
    })
    .eq("id", auctionId);

  // If buyout, complete the auction immediately
  if (isBuyout) {
    await completeAuction(auctionId);
  }

  return { bid: amount, is_buyout: isBuyout };
}

export async function completeAuction(auctionId: string) {
  const { data: auction } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", auctionId)
    .single();

  if (!auction || !auction.current_bidder) return;

  const fee = Math.floor(auction.current_bid * ECONOMY.AUCTION_FEE_PERCENT);
  const sellerReceives = auction.current_bid - fee;

  // Transfer card
  await supabase
    .from("cards")
    .update({ owner_id: auction.current_bidder, is_tradeable: true })
    .eq("id", auction.card_id);

  // Transfer spark
  const { data: buyer } = await supabase
    .from("agents")
    .select("spark")
    .eq("id", auction.current_bidder)
    .single();

  const { data: seller } = await supabase
    .from("agents")
    .select("spark")
    .eq("id", auction.seller_id)
    .single();

  if (buyer && seller) {
    await supabase
      .from("agents")
      .update({ spark: buyer.spark - auction.current_bid })
      .eq("id", auction.current_bidder);
    await supabase
      .from("agents")
      .update({ spark: seller.spark + sellerReceives })
      .eq("id", auction.seller_id);
  }

  await supabase
    .from("auctions")
    .update({ status: "completed" })
    .eq("id", auctionId);
}

export async function getActiveAuctions() {
  const { data, error } = await supabase
    .from("auctions")
    .select("*")
    .eq("status", "active")
    .order("ends_at", { ascending: true });

  return data ?? [];
}
