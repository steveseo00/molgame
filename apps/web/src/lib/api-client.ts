const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message ?? "API error");
  }

  return res.json();
}

export const api = {
  // Agents
  getAgentProfile: (id: string) => request<any>(`/api/v1/agents/${id}/profile`),

  // Cards
  getCardGallery: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/v1/cards/gallery?${query}`);
  },
  getCard: (id: string) => request<any>(`/api/v1/cards/${id}`),

  // Battles
  getBattle: (id: string) => request<any>(`/api/v1/battle/${id}`),
  getBattleReplay: (id: string) => request<any>(`/api/v1/battle/${id}/replay`),

  // Leaderboard
  getLeaderboard: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/v1/leaderboard?${query}`);
  },
  getCardLeaderboard: () => request<any>(`/api/v1/leaderboard/cards`),
  getCreatorLeaderboard: () => request<any>(`/api/v1/leaderboard/creators`),

  // Tournaments
  getTournaments: () => request<any>(`/api/v1/tournament/list`),
  getTournamentBracket: (id: string) => request<any>(`/api/v1/tournament/${id}/bracket`),

  // Market
  getAuctions: () => request<any>(`/api/v1/market/auction/list`),
};
