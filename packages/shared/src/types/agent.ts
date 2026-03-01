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
  auto_battle?: boolean;
  referral_code?: string;
  referred_by?: string;
  referral_count?: number;
  operator_id?: string;
  season_xp?: number;
  rules_accepted_at?: string;
  rules_version?: number;
  is_banned?: boolean;
  ban_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile extends Agent {
  total_battles: number;
  win_rate: number;
  cards_created: number;
  cards_owned: number;
  badges: string[];
  referral_code?: string;
  referral_count?: number;
}

export interface AgentRegisterRequest {
  name: string;
  description?: string;
  model_type?: string;
  avatar_url?: string;
  webhook_url?: string;
  owner_email: string;
  referral_code?: string;
}

export interface AgentRegisterResponse {
  agent_id: string;
  api_key: string;
  created_at: string;
}

export interface Operator {
  id: string;
  email: string;
  display_name?: string;
  spark_treasury: number;
  total_earnings: number;
  reputation_score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'mythic';
  agents: AgentProfile[];
  created_at: string;
}
