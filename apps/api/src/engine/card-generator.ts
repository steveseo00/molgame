import type { Element, Rarity, CardSkill, CardStats, SkillPoolEntry } from "@molgame/shared";
import { RARITY_CONFIG, RARITY_ORDER } from "@molgame/shared";
import { SKILL_POOL } from "../db/seed.js";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rollRarity(): Rarity {
  const roll = Math.random();
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += RARITY_CONFIG[rarity].probability;
    if (roll < cumulative) return rarity;
  }
  return "common";
}

export function generateStats(rarity: Rarity): CardStats {
  const config = RARITY_CONFIG[rarity];
  return {
    hp: randomInt(config.hp[0], config.hp[1]),
    atk: randomInt(config.atk[0], config.atk[1]),
    def: randomInt(config.def[0], config.def[1]),
    spd: randomInt(config.spd[0], config.spd[1]),
  };
}

export function assignSkills(element: Element, rarity: Rarity): CardSkill[] {
  const config = RARITY_CONFIG[rarity];
  const count = randomInt(config.skill_count[0], config.skill_count[1]);

  // Get eligible skills: same element or universal, meeting rarity minimum
  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  const eligible = SKILL_POOL.filter((skill) => {
    const skillRarityIndex = RARITY_ORDER.indexOf(skill.rarity_min);
    if (skillRarityIndex > rarityIndex) return false;
    return skill.element === element || skill.element === null;
  });

  // Weighted selection: prefer element-specific skills (80%) over universal (20%)
  const elementSkills = eligible.filter((s) => s.element === element);
  const universalSkills = eligible.filter((s) => s.element === null);

  const selected: SkillPoolEntry[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const pool =
      Math.random() < 0.8 && elementSkills.length > 0
        ? elementSkills
        : universalSkills.length > 0
          ? universalSkills
          : elementSkills;

    const available = pool.filter((s) => !usedIds.has(s.skill_id));
    if (available.length === 0) break;

    const skill = available[Math.floor(Math.random() * available.length)];
    usedIds.add(skill.skill_id);
    selected.push(skill);
  }

  return selected.map((s) => ({
    skill_id: s.skill_id,
    name: s.name,
    description: s.description,
    element: s.element,
    type: s.type,
    power: s.power,
    cost: s.cost,
    cooldown: s.cooldown,
    effects: s.effects,
  }));
}
