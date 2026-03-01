import { SKILL_POOL } from "../db/seed.js";
import type { Element, SkillPoolEntry } from "@molgame/shared";

export function getSkillsByElement(element: Element): SkillPoolEntry[] {
  return SKILL_POOL.filter((s) => s.element === element);
}

export function getUniversalSkills(): SkillPoolEntry[] {
  return SKILL_POOL.filter((s) => s.element === null);
}

export function getSkillById(skillId: string): SkillPoolEntry | undefined {
  return SKILL_POOL.find((s) => s.skill_id === skillId);
}
