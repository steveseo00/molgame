import { type Element, getElementMultiplier, ELEMENTS } from "@molgame/shared";

export { getElementMultiplier };

export function getRandomElement(): Element {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

export function inferElementFromKeywords(text: string): Element | null {
  const lower = text.toLowerCase();
  const keywords: Record<Element, string[]> = {
    fire: ["fire", "flame", "blaze", "burn", "inferno", "lava", "magma", "ember", "phoenix", "dragon"],
    water: ["water", "ocean", "sea", "ice", "frost", "rain", "aqua", "tide", "wave", "frozen"],
    lightning: ["lightning", "thunder", "electric", "volt", "shock", "spark", "storm", "cyber", "neon", "circuit"],
    nature: ["nature", "plant", "tree", "forest", "vine", "leaf", "flower", "earth", "moss", "root"],
    shadow: ["shadow", "dark", "night", "phantom", "ghost", "void", "death", "skull", "demon", "abyss"],
    light: ["light", "holy", "divine", "angel", "celestial", "radiant", "sun", "star", "bright", "sacred"],
  };

  let bestElement: Element | null = null;
  let bestScore = 0;

  for (const [element, words] of Object.entries(keywords) as [Element, string[]][]) {
    const score = words.filter((w) => lower.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestElement = element;
    }
  }

  return bestElement;
}
