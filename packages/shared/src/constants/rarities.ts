import type { Rarity } from "../types/card";

export interface RarityConfig {
  probability: number;
  hp: [number, number];
  atk: [number, number];
  def: [number, number];
  spd: [number, number];
  skill_count: [number, number];
  creation_cost: number;
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    probability: 0.50,
    hp: [50, 100],
    atk: [10, 30],
    def: [10, 30],
    spd: [1, 5],
    skill_count: [1, 1],
    creation_cost: 10,
  },
  rare: {
    probability: 0.30,
    hp: [80, 150],
    atk: [25, 50],
    def: [25, 50],
    spd: [3, 7],
    skill_count: [1, 2],
    creation_cost: 10,
  },
  epic: {
    probability: 0.15,
    hp: [120, 200],
    atk: [40, 70],
    def: [40, 70],
    spd: [5, 9],
    skill_count: [2, 2],
    creation_cost: 10,
  },
  legendary: {
    probability: 0.05,
    hp: [180, 300],
    atk: [60, 100],
    def: [60, 100],
    spd: [7, 10],
    skill_count: [2, 3],
    creation_cost: 10,
  },
  mythic: {
    probability: 0.001,
    hp: [250, 400],
    atk: [80, 130],
    def: [80, 130],
    spd: [9, 12],
    skill_count: [3, 4],
    creation_cost: 10,
  },
};

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary", "mythic"];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
  mythic: "linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF)",
};
