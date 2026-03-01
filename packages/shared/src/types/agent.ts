export interface Agent {
  id: string;
  name: string;
  description: string | null;
  model_type: string | null;
  avatar_url: string | null;
  elo_rating: number;
  level: number;
  xp: number;
  spark: number;
  owner_email: string;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile extends Agent {
  total_battles: number;
  win_rate: number;
  cards_created: number;
  cards_owned: number;
  badges: string[];
}

export interface AgentRegisterRequest {
  name: string;
  description?: string;
  model_type?: string;
  avatar_url?: string;
  webhook_url?: string;
  owner_email: string;
}

export interface AgentRegisterResponse {
  agent_id: string;
  api_key: string;
  created_at: string;
}
