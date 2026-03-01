import type { Card } from "./card";

export type BattleMode = "ranked" | "casual" | "tournament";

export type BattleStatus =
  | "queued"
  | "preparing"
  | "active"
  | "finished";

export type BattleActionType =
  | "select_card"
  | "use_skill"
  | "basic_attack"
  | "defend";

export interface BattleQueueRequest {
  deck: string[]; // card_ids, 3-5
  mode: BattleMode;
}

export interface BattleActionRequest {
  action: BattleActionType;
  card_id?: string;
  skill_id?: string;
  swap?: boolean;
}

export interface BattleChallengeRequest {
  opponent_agent_id: string;
  deck: string[];
}

export interface BattleCardState {
  card: Card;
  current_hp: number;
  max_hp: number;
  buffs: BattleEffect[];
  debuffs: BattleEffect[];
  skill_cooldowns: Record<string, number>;
  is_active: boolean;
}

export interface BattleEffect {
  type: string;
  value: number;
  remaining_turns: number;
  source_skill: string;
}

export interface BattleAgentState {
  agent_id: string;
  agent_name: string;
  cards: BattleCardState[];
  active_card_index: number;
  cards_remaining: number;
}

export interface BattleState {
  battle_id: string;
  mode: BattleMode;
  status: BattleStatus;
  turn: number;
  agent_a: BattleAgentState;
  agent_b: BattleAgentState;
  winner_id: string | null;
  battle_log: BattleEvent[];
  started_at: string;
  finished_at: string | null;
}

export type BattleEventType =
  | "battle_start"
  | "turn_start"
  | "card_selected"
  | "action"
  | "damage"
  | "heal"
  | "buff_applied"
  | "debuff_applied"
  | "effect_expired"
  | "card_defeated"
  | "card_swapped"
  | "critical_hit"
  | "element_bonus"
  | "turn_end"
  | "battle_end"
  | "timeout";

export interface BattleEvent {
  type: BattleEventType;
  turn: number;
  timestamp: string;
  agent_id?: string;
  card_id?: string;
  target_card_id?: string;
  skill_name?: string;
  damage?: number;
  heal?: number;
  critical?: boolean;
  element_bonus?: boolean;
  remaining_hp?: number;
  data?: Record<string, unknown>;
  message: string;
}

export interface BattleResult {
  battle_id: string;
  winner_id: string | null;
  loser_id: string | null;
  turns: number;
  elo_change_winner: number;
  elo_change_loser: number;
  spark_reward_winner: number;
  spark_reward_loser: number;
  mvp_card_id: string | null;
}
