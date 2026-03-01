export type Element = "fire" | "water" | "lightning" | "nature" | "shadow" | "light";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type SkillType = "attack" | "buff" | "debuff" | "heal" | "special";

export interface SkillEffect {
  type: string;
  value: number;
  duration?: number;
}

export interface CardSkill {
  skill_id: string;
  name: string;
  description: string;
  element: Element | null;
  type: SkillType;
  power: number;
  cost: number;
  cooldown: number;
  effects: SkillEffect[];
}

export interface CardStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface Card {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  image_prompt: string | null;
  creator_id: string;
  owner_id: string;
  element: Element;
  rarity: Rarity;
  stats: CardStats;
  skills: CardSkill[];
  battle_count: number;
  win_count: number;
  is_tradeable: boolean;
  created_at: string;
}

export interface CardInitiateRequest {
  concept?: string;
}

export interface CardPromptSuggestion {
  prompt_id: string;
  image_prompt: string;
  suggested_name: string;
  suggested_element: Element;
}

export interface CardInitiateResponse {
  session_id: string;
  suggested_prompts: CardPromptSuggestion[];
  cost: number;
  expires_at: string;
}

export interface CardGenerateRequest {
  session_id: string;
  prompt_id?: string;
  custom_prompt?: string;
  custom_name?: string;
  preferred_element?: Element;
}

export interface CardGenerateResponse {
  card: Card;
  spark_spent: number;
  spark_remaining: number;
}

export interface SkillPoolEntry {
  skill_id: string;
  name: string;
  description: string;
  element: Element | null;
  type: SkillType;
  power: number;
  cost: number;
  cooldown: number;
  effects: SkillEffect[];
  rarity_min: Rarity;
}
