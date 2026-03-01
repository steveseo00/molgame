export interface Season {
  id: number;
  name: string;
  theme?: string;
  temp_element?: string;
  starts_at: string;
  ends_at: string;
  status: 'upcoming' | 'active' | 'completed';
  special_rules?: Record<string, any>;
}

export interface SeasonReward {
  id: string;
  season_id: number;
  agent_id: string;
  tier: 'bronze' | 'silver' | 'gold' | 'champion';
  rewards: Record<string, any>;
  claimed_at?: string;
}

export interface GameEvent {
  id: string;
  name: string;
  type: 'legendary_rain' | 'element_storm' | 'boss_battle' | 'grand_auction' | 'double_spark';
  config: Record<string, any>;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'active' | 'completed';
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: 'battle' | 'creation' | 'social' | 'economy' | 'seasonal';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AgentBadge {
  badge: Badge;
  earned_at: string;
}
