import type { Element, CardSkill, BattleEffect } from "@molgame/shared";
import { BATTLE } from "@molgame/shared";
import { getElementMultiplier } from "./element-system.js";

export interface DamageResult {
  raw_damage: number;
  final_damage: number;
  is_critical: boolean;
  element_multiplier: number;
  random_factor: number;
}

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  skill: CardSkill | null,
  attackerElement: Element,
  defenderElement: Element,
  attackerBuffs: BattleEffect[],
  defenderDebuffs: BattleEffect[],
  isDefending: boolean,
): DamageResult {
  // Skill multiplier (basic attack = 1.0)
  const skillPower = skill ? skill.power / 50 : BATTLE.BASIC_ATTACK_POWER;

  // Apply ATK buffs
  let effectiveAtk = attackerAtk;
  for (const buff of attackerBuffs) {
    if (buff.type === "atk_up") effectiveAtk *= 1 + buff.value;
    if (buff.type === "last_stand") effectiveAtk *= buff.value;
  }

  // Apply DEF debuffs on defender
  let effectiveDef = defenderDef;
  for (const debuff of defenderDebuffs) {
    if (debuff.type === "def_down") effectiveDef *= 1 - debuff.value;
  }

  // DEF ignore from skill effects
  let defIgnore = 0;
  if (skill) {
    for (const effect of skill.effects) {
      if (effect.type === "ignore_def") defIgnore += effect.value;
    }
  }
  effectiveDef *= 1 - Math.min(defIgnore, 1);

  // Defending bonus
  if (isDefending) {
    effectiveDef *= BATTLE.DEFEND_DEF_MULTIPLIER;
  }

  // Damage taken up debuff on defender
  let damageTakenMultiplier = 1;
  for (const debuff of defenderDebuffs) {
    if (debuff.type === "damage_taken_up") damageTakenMultiplier += debuff.value;
  }

  // Base damage
  const rawDamage = effectiveAtk * skillPower - effectiveDef * BATTLE.DEF_FACTOR;

  // Element multiplier
  const skillElement = skill?.element ?? attackerElement;
  const elementMultiplier = getElementMultiplier(skillElement, defenderElement);

  // Critical hit
  const isCritical = Math.random() < BATTLE.CRITICAL_CHANCE;
  const critMultiplier = isCritical ? BATTLE.CRITICAL_MULTIPLIER : 1;

  // Random factor
  const randomFactor =
    BATTLE.DAMAGE_RANDOM_MIN +
    Math.random() * (BATTLE.DAMAGE_RANDOM_MAX - BATTLE.DAMAGE_RANDOM_MIN);

  // Final damage
  const finalDamage = Math.max(
    BATTLE.MIN_DAMAGE,
    Math.floor(rawDamage * elementMultiplier * critMultiplier * randomFactor * damageTakenMultiplier),
  );

  return {
    raw_damage: Math.max(0, Math.floor(rawDamage)),
    final_damage: finalDamage,
    is_critical: isCritical,
    element_multiplier: elementMultiplier,
    random_factor: randomFactor,
  };
}

export function calculateHeal(skill: CardSkill): number {
  for (const effect of skill.effects) {
    if (effect.type === "heal") return effect.value;
  }
  return skill.power;
}
