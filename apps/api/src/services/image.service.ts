import type { Element, CardPromptSuggestion } from "@molgame/shared";

const CARD_ART_SUFFIX =
  "trading card game art style, detailed illustration, dramatic lighting, dark background, high quality, sharp details";

const ELEMENT_THEMES: Record<Element, string[]> = {
  fire: ["flames and embers", "volcanic eruption", "blazing inferno", "phoenix rising"],
  water: ["ocean waves", "frozen crystals", "underwater depths", "cascading waterfalls"],
  lightning: ["electric arcs", "thunderstorm", "neon glow", "circuit patterns"],
  nature: ["ancient forest", "blooming flowers", "twisted vines", "crystal caves"],
  shadow: ["dark shadows", "ethereal mist", "moonlit darkness", "void energy"],
  light: ["golden radiance", "celestial aura", "divine beams", "sacred geometry"],
};

export function generateCardPrompts(concept?: string): CardPromptSuggestion[] {
  const baseConcept = concept ?? "mysterious warrior";

  const elements: Element[] = suggestElements(baseConcept);

  return elements.slice(0, 3).map((element, i) => {
    const theme = ELEMENT_THEMES[element][Math.floor(Math.random() * ELEMENT_THEMES[element].length)];
    const nameBase = generateName(baseConcept, element);

    return {
      prompt_id: `p${i + 1}`,
      image_prompt: `A ${baseConcept}, surrounded by ${theme}, ${CARD_ART_SUFFIX}`,
      suggested_name: nameBase,
      suggested_element: element,
    };
  });
}

function suggestElements(concept: string): Element[] {
  const lower = concept.toLowerCase();
  const elementScores: [Element, number][] = [
    ["fire", scoreElement(lower, ["fire", "flame", "burn", "hot", "dragon", "lava", "blaze"])],
    ["water", scoreElement(lower, ["water", "ocean", "ice", "frost", "sea", "aqua", "rain"])],
    ["lightning", scoreElement(lower, ["lightning", "electric", "cyber", "neon", "tech", "robot", "mech"])],
    ["nature", scoreElement(lower, ["nature", "plant", "tree", "forest", "animal", "beast", "earth"])],
    ["shadow", scoreElement(lower, ["shadow", "dark", "ghost", "phantom", "ninja", "assassin", "death"])],
    ["light", scoreElement(lower, ["light", "holy", "angel", "divine", "pure", "sacred", "knight"])],
  ];

  // Sort by score descending, then shuffle equal scores
  elementScores.sort((a, b) => b[1] - a[1] || Math.random() - 0.5);

  // Always include at least 3 different elements
  return elementScores.map(([e]) => e).slice(0, 3);
}

function scoreElement(concept: string, keywords: string[]): number {
  return keywords.filter((k) => concept.includes(k)).length + Math.random() * 0.5;
}

function generateName(concept: string, element: Element): string {
  const prefixes: Record<Element, string[]> = {
    fire: ["Blazing", "Infernal", "Scorching", "Ember"],
    water: ["Frozen", "Tidal", "Crystal", "Aqua"],
    lightning: ["Voltaic", "Thunder", "Neon", "Circuit"],
    nature: ["Ancient", "Wild", "Verdant", "Root"],
    shadow: ["Phantom", "Dark", "Shadow", "Void"],
    light: ["Radiant", "Divine", "Celestial", "Sacred"],
  };

  const prefix = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
  const words = concept
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .slice(0, 2)
    .join(" ");

  return `${prefix} ${words}`;
}

export async function generateCardImage(prompt: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    // Return placeholder if no API key
    return `https://placehold.co/512x512/1a1a2e/e94560?text=Card`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    const data = (await response.json()) as { data?: { url: string }[] };
    return data.data?.[0]?.url ?? `https://placehold.co/512x512/1a1a2e/e94560?text=Card`;
  } catch {
    return `https://placehold.co/512x512/1a1a2e/e94560?text=Card`;
  }
}
