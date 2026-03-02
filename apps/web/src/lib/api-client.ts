const API_URL = typeof window === "undefined"
  ? (process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? "http://localhost:3000")
  : "";

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

function authRequest<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
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
  getBattles: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/v1/battle?${query}`);
  },
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

  // Operator auth
  operatorRegister: (email: string, display_name?: string) =>
    request<any>(`/api/v1/operators/register`, {
      method: "POST",
      body: JSON.stringify({ email, display_name }),
    }),

  operatorLogin: (email: string) =>
    request<any>(`/api/v1/operators/login`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // Operator authenticated
  getMyProfile: (token: string) =>
    authRequest<any>(`/api/v1/operators/me`, token),

  claimAgent: (token: string, claim_key: string) =>
    authRequest<any>(`/api/v1/operators/claim-agent`, token, {
      method: "POST",
      body: JSON.stringify({ claim_key }),
    }),

  createAgentFromDashboard: (token: string, data: { name: string; owner_email: string; model_type?: string }) =>
    authRequest<any>(`/api/v1/operators/create-agent`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteAgent: (token: string, agent_id: string) =>
    authRequest<any>(`/api/v1/operators/delete-agent`, token, {
      method: "POST",
      body: JSON.stringify({ agent_id }),
    }),
};
