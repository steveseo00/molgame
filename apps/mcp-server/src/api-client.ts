const API_URL = process.env.GAME_API_URL ?? "http://localhost:8000";

export class GameApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: { message: res.statusText } }))) as {
        error?: { message?: string };
      };
      throw new Error(body.error?.message ?? `API error ${res.status}`);
    }

    return (await res.json()) as T;
  }

  // Agent
  getProfile(agentId: string) {
    return this.request<any>(`/api/v1/agents/${agentId}/profile`);
  }

  // Cards
  getCards(agentId: string) {
    return this.request<any>(`/api/v1/agents/${agentId}/cards`);
  }

  initiateCard(concept?: string) {
    return this.request<any>(`/api/v1/cards/initiate`, {
      method: "POST",
      body: JSON.stringify({ concept }),
    });
  }

  generateCard(sessionId: string, promptId?: string, customName?: string) {
    return this.request<any>(`/api/v1/cards/generate`, {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        prompt_id: promptId,
        custom_name: customName,
      }),
    });
  }

  // Deck
  getDeck(agentId: string) {
    return this.request<any>(`/api/v1/agents/${agentId}/deck`);
  }

  setDeck(agentId: string, cardIds: string[]) {
    return this.request<any>(`/api/v1/agents/${agentId}/deck`, {
      method: "PUT",
      body: JSON.stringify({ card_ids: cardIds }),
    });
  }

  // Battle
  joinQueue(deck: string[], mode: string) {
    return this.request<any>(`/api/v1/battle/queue`, {
      method: "POST",
      body: JSON.stringify({ deck, mode }),
    });
  }

  getBattle(battleId: string) {
    return this.request<any>(`/api/v1/battle/${battleId}`);
  }

  submitAction(battleId: string, action: string, skillId?: string, cardId?: string) {
    return this.request<any>(`/api/v1/battle/${battleId}/action`, {
      method: "POST",
      body: JSON.stringify({ action, skill_id: skillId, card_id: cardId }),
    });
  }

  // Practice
  startPractice(deck?: string[]) {
    return this.request<any>(`/api/v1/battle/practice`, {
      method: "POST",
      body: JSON.stringify({ deck }),
    });
  }

  // Market
  getAuctions() {
    return this.request<any>(`/api/v1/market/auction/list`);
  }

  getTradeOffers() {
    return this.request<any>(`/api/v1/market/offers`);
  }

  createTradeOffer(toAgentId: string, offerCards: string[], requestCards: string[], sparkAmount?: number) {
    return this.request<any>(`/api/v1/market/offer`, {
      method: "POST",
      body: JSON.stringify({
        to_agent_id: toAgentId,
        offer_cards: offerCards,
        request_cards: requestCards,
        spark_offer: sparkAmount,
      }),
    });
  }

  // Leaderboard
  getLeaderboard(type: "agents" | "cards" = "agents", limit = 20) {
    const path = type === "cards" ? "/api/v1/leaderboard/cards" : "/api/v1/leaderboard";
    return this.request<any>(`${path}?limit=${limit}`);
  }

  // Rules
  getRules() {
    return this.request<any>(`/api/v1/rules`);
  }

  acceptRules() {
    return this.request<any>(`/api/v1/rules/accept`, { method: "POST" });
  }

  getRulesStatus() {
    return this.request<any>(`/api/v1/rules/status`);
  }
}
