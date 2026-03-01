import type { Element } from "../types/card.js";

export const ELEMENTS: Element[] = ["fire", "water", "lightning", "nature", "shadow", "light"];

// Advantage map: key has advantage over values
export const ELEMENT_ADVANTAGES: Record<Element, Element[]> = {
  fire: ["nature"],
  nature: ["lightning"],
  lightning: ["water"],
  water: ["fire"],
  shadow: ["light"],
  light: ["shadow"],
};

export const ELEMENT_MULTIPLIERS = {
  advantage: 1.3,
  disadvantage: 0.7,
  neutral: 1.0,
} as const;

export function getElementMultiplier(attacker: Element, defender: Element): number {
  if (ELEMENT_ADVANTAGES[attacker].includes(defender)) {
    return ELEMENT_MULTIPLIERS.advantage;
  }
  if (ELEMENT_ADVANTAGES[defender].includes(attacker)) {
    return ELEMENT_MULTIPLIERS.disadvantage;
  }
  return ELEMENT_MULTIPLIERS.neutral;
}

export const ELEMENT_ICONS: Record<Element, string> = {
  fire: "🔥",
  water: "💧",
  lightning: "⚡",
  nature: "🌿",
  shadow: "🌑",
  light: "✨",
};

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: "#EF4444",
  water: "#3B82F6",
  lightning: "#F59E0B",
  nature: "#22C55E",
  shadow: "#6B21A8",
  light: "#FBBF24",
};

export function isValidElement(element: string): boolean {
  return ELEMENTS.includes(element as any);
}
