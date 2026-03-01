import { supabase } from "./supabase-server";
import { nanoid } from "nanoid";
import type { Card, CardSkill, Element, Rarity, CardStats, SkillPoolEntry, CardPromptSuggestion } from "@molgame/shared";
import { ECONOMY, RARITY_CONFIG, RARITY_ORDER, ELEMENTS } from "@molgame/shared";

// ─── Content Filter (Rule R5) ────────────────────────────────────────────────

const HARMFUL_CONTENT_PATTERNS = [
  /\b(kill|murder|assassinate|suicide|genocide)\b/i,
  /\b(terrorist|terrorism|bomb|explosive)\b/i,
  /\b(racial|racist|nazi|white\s*supremac)/i,
  /\b(child\s*(abuse|porn|exploitation))\b/i,
  /\b(drug\s*(deal|traffic|cartel))\b/i,
];

function checkContentFilter(concept: string, agentId: string): boolean {
  for (const pattern of HARMFUL_CONTENT_PATTERNS) {
    if (pattern.test(concept)) {
      issueWarning(agentId, "R5", `Harmful content in card concept: "${concept.slice(0, 100)}"`).catch(() => {});
      return false;
    }
  }
  return true;
}

// ─── Secret Card Recipes ─────────────────────────────────────────────────────

const SECRET_RECIPES: Array<{
  pattern: RegExp;
  effect: { mythicBoost?: number; legendaryBoost?: number; guaranteedElement?: Element };
}> = [
  { pattern: /primordial\s+(shadow|flame|storm|void)/i, effect: { mythicBoost: 0.10 } },
  { pattern: /ancient\s+(guardian|titan|behemoth)/i, effect: { mythicBoost: 0.05 } },
  { pattern: /celestial\s+(dragon|phoenix|serpent)/i, effect: { mythicBoost: 0.08 } },
  { pattern: /\b(claude|anthropic)\s+(warrior|knight|mage|phoenix)/i, effect: { legendaryBoost: 1.0 } },
  { pattern: /\b(gpt|openai)\s+(warrior|knight|mage|phoenix)/i, effect: { legendaryBoost: 1.0 } },
  { pattern: /\b(gemini|deepmind)\s+(warrior|knight|mage|phoenix)/i, effect: { legendaryBoost: 1.0 } },
  { pattern: /pure\s+fire|inferno\s+lord/i, effect: { guaranteedElement: "fire" } },
  { pattern: /pure\s+water|ocean\s+lord/i, effect: { guaranteedElement: "water" } },
  { pattern: /pure\s+lightning|thunder\s+lord/i, effect: { guaranteedElement: "lightning" } },
  { pattern: /pure\s+nature|forest\s+lord/i, effect: { guaranteedElement: "nature" } },
  { pattern: /pure\s+shadow|void\s+lord/i, effect: { guaranteedElement: "shadow" } },
  { pattern: /pure\s+light|radiant\s+lord/i, effect: { guaranteedElement: "light" } },
  { pattern: /\bmolgame\b/i, effect: { mythicBoost: 0.15 } },
  { pattern: /\bworld\s+eater\b/i, effect: { mythicBoost: 0.05, guaranteedElement: "shadow" } },
];

function applySecretRecipes(concept: string) {
  let mythicOverride: number | undefined;
  let legendaryOverride: number | undefined;
  let elementOverride: Element | undefined;

  for (const recipe of SECRET_RECIPES) {
    if (recipe.pattern.test(concept)) {
      if (recipe.effect.mythicBoost) mythicOverride = Math.max(mythicOverride ?? 0, recipe.effect.mythicBoost);
      if (recipe.effect.legendaryBoost) legendaryOverride = Math.max(legendaryOverride ?? 0, recipe.effect.legendaryBoost);
      if (recipe.effect.guaranteedElement) elementOverride = recipe.effect.guaranteedElement;
    }
  }
  return { mythicOverride, legendaryOverride, elementOverride };
}

// ─── Inline Engine: Card Generator ───────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollRarity(overrides?: { legendary?: number; mythic?: number }): Rarity {
  const roll = Math.random();
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    let probability = RARITY_CONFIG[rarity].probability;
    if (overrides?.legendary && rarity === "legendary") probability = overrides.legendary;
    if (overrides?.mythic && rarity === "mythic") probability = overrides.mythic;
    cumulative += probability;
    if (roll < cumulative) return rarity;
  }
  return "common";
}

function generateStats(rarity: Rarity): CardStats {
  const config = RARITY_CONFIG[rarity];
  return {
    hp: randomInt(config.hp[0], config.hp[1]),
    atk: randomInt(config.atk[0], config.atk[1]),
    def: randomInt(config.def[0], config.def[1]),
    spd: randomInt(config.spd[0], config.spd[1]),
  };
}

async function getSkillPool(): Promise<SkillPoolEntry[]> {
  const { data } = await supabase.from("skill_pool").select("*");
  return (data ?? []) as SkillPoolEntry[];
}

async function assignSkills(element: Element, rarity: Rarity): Promise<CardSkill[]> {
  const config = RARITY_CONFIG[rarity];
  const count = randomInt(config.skill_count[0], config.skill_count[1]);
  const pool = await getSkillPool();

  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  const eligible = pool.filter((skill) => {
    const skillRarityIndex = RARITY_ORDER.indexOf(skill.rarity_min);
    if (skillRarityIndex > rarityIndex) return false;
    return skill.element === element || skill.element === null;
  });

  const elementSkills = eligible.filter((s) => s.element === element);
  const universalSkills = eligible.filter((s) => s.element === null);

  const selected: SkillPoolEntry[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const pickPool =
      Math.random() < 0.8 && elementSkills.length > 0
        ? elementSkills
        : universalSkills.length > 0
          ? universalSkills
          : elementSkills;

    const available = pickPool.filter((s) => !usedIds.has(s.skill_id));
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

// ─── Inline Engine: Element System ───────────────────────────────────────────

function getRandomElement(): Element {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

function inferElementFromKeywords(text: string): Element | null {
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
    if (score > bestScore) { bestScore = score; bestElement = element; }
  }
  return bestElement;
}

// ─── Inline: Image Service (prompt generation) ──────────────────────────────

const CARD_ART_SUFFIX = "trading card game art style, detailed illustration, dramatic lighting, dark background, high quality, sharp details";

const ELEMENT_THEMES: Record<Element, string[]> = {
  fire: ["flames and embers", "volcanic eruption", "blazing inferno", "phoenix rising"],
  water: ["ocean waves", "frozen crystals", "underwater depths", "cascading waterfalls"],
  lightning: ["electric arcs", "thunderstorm", "neon glow", "circuit patterns"],
  nature: ["ancient forest", "blooming flowers", "twisted vines", "crystal caves"],
  shadow: ["dark shadows", "ethereal mist", "moonlit darkness", "void energy"],
  light: ["golden radiance", "celestial aura", "divine beams", "sacred geometry"],
};

function generateCardPrompts(concept?: string): CardPromptSuggestion[] {
  const baseConcept = concept ?? "mysterious warrior";
  const elements = suggestElements(baseConcept);

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
  elementScores.sort((a, b) => b[1] - a[1] || Math.random() - 0.5);
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
  const words = concept.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).slice(0, 2).join(" ");
  return `${prefix} ${words}`;
}

// ─── Inline: Badge helpers ───────────────────────────────────────────────────

async function checkRarityBadge(agentId: string, rarity: string) {
  if (rarity === "legendary") await awardBadge(agentId, "legendary_puller");
  if (rarity === "mythic") await awardBadge(agentId, "mythic_puller");
}

async function checkCardBadges(agentId: string) {
  const { data: agent } = await supabase.from("agents").select("cards_created, spark").eq("id", agentId).single();
  if (!agent) return;

  const { count } = await supabase.from("cards").select("*", { count: "exact", head: true }).eq("owner_id", agentId);
  const { data: elements } = await supabase.from("cards").select("element").eq("owner_id", agentId);
  const uniqueElements = new Set(elements?.map((e: { element: string }) => e.element) || []);

  const badges = [
    { id: "card_artisan", condition: (agent.cards_created || 0) >= 10 },
    { id: "card_collector_30", condition: (count || 0) >= 30 },
    { id: "element_collector", condition: uniqueElements.size >= 6 },
    { id: "spark_millionaire", condition: agent.spark >= 1000 },
  ];
  for (const { id, condition } of badges) {
    if (condition) await awardBadge(agentId, id);
  }
}

async function awardBadge(agentId: string, badgeId: string) {
  await supabase.from("agent_badges").upsert(
    { agent_id: agentId, badge_id: badgeId },
    { onConflict: "agent_id,badge_id" },
  );
}

// ─── Inline: Penalty helpers ─────────────────────────────────────────────────

async function issueWarning(agentId: string, ruleId: string, reason: string) {
  await supabase.from("agent_penalties").insert({
    agent_id: agentId,
    penalty_type: "warning",
    rule_id: ruleId,
    reason,
  });
}

// ─── Inline: Spark helpers ───────────────────────────────────────────────────

async function updateSpark(agentId: string, delta: number): Promise<number> {
  const { data: agent } = await supabase.from("agents").select("spark").eq("id", agentId).single();
  if (!agent) throw new Error("Agent not found");

  const newSpark = agent.spark + delta;
  if (newSpark < 0) throw new Error("Insufficient Spark");

  await supabase.from("agents").update({ spark: newSpark }).eq("id", agentId);
  return newSpark;
}

// ─── Inline: Event helpers ───────────────────────────────────────────────────

async function getLegendaryRainProbability(): Promise<number> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("type", "legendary_rain")
    .eq("status", "active")
    .gte("ends_at", now)
    .limit(1);
  return data && data.length > 0 ? ECONOMY.LEGENDARY_RAIN_PROBABILITY : 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function initiateCardCreation(agentId: string, concept?: string) {
  const { data: agent } = await supabase
    .from("agents")
    .select("last_card_created_at, cards_created_today, spark")
    .eq("id", agentId)
    .single();

  if (!agent) throw new Error("Agent not found");
  if (agent.spark < ECONOMY.CARD_CREATION_COST) throw new Error("Insufficient Spark");

  if (concept && !checkContentFilter(concept, agentId)) {
    throw new Error("Card concept contains prohibited content. A warning has been issued.");
  }

  if (agent.cards_created_today >= ECONOMY.CARD_CREATION_DAILY_LIMIT) {
    throw new Error("Daily card creation limit reached");
  }

  if (agent.last_card_created_at) {
    const lastCreated = new Date(agent.last_card_created_at).getTime();
    if (Date.now() - lastCreated < ECONOMY.CARD_CREATION_COOLDOWN_MS) {
      throw new Error("Card creation on cooldown");
    }
  }

  const sessionId = crypto.randomUUID();
  const prompts = generateCardPrompts(concept);

  const { error } = await supabase.from("card_sessions").insert({
    id: sessionId,
    agent_id: agentId,
    concept: concept ?? null,
    suggested_prompts: prompts,
    status: "pending",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });

  if (error) throw error;

  return {
    session_id: sessionId,
    suggested_prompts: prompts,
    cost: ECONOMY.CARD_CREATION_COST,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export async function generateCard(
  agentId: string,
  sessionId: string,
  promptId?: string,
  customPrompt?: string,
  customName?: string,
  preferredElement?: Element,
) {
  const { data: session, error: sessionError } = await supabase
    .from("card_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .single();

  if (sessionError || !session) throw new Error("Invalid or expired card creation session");

  const sparkRemaining = await updateSpark(agentId, -ECONOMY.CARD_CREATION_COST);

  const prompts = session.suggested_prompts as Array<{
    prompt_id: string;
    image_prompt: string;
    suggested_name: string;
    suggested_element: Element;
  }>;

  let selectedPrompt: string;
  let cardName: string;
  let suggestedElement: Element | null = preferredElement ?? null;

  if (promptId) {
    const p = prompts.find((pr) => pr.prompt_id === promptId);
    if (!p) throw new Error("Invalid prompt_id");
    selectedPrompt = p.image_prompt;
    cardName = customName ?? p.suggested_name;
    suggestedElement = suggestedElement ?? p.suggested_element;
  } else if (customPrompt) {
    selectedPrompt = customPrompt;
    cardName = customName ?? `Card ${nanoid(6)}`;
  } else {
    selectedPrompt = prompts[0].image_prompt;
    cardName = customName ?? prompts[0].suggested_name;
    suggestedElement = suggestedElement ?? prompts[0].suggested_element;
  }

  const fullText = (session.concept ?? "") + " " + selectedPrompt + " " + cardName;
  const recipes = applySecretRecipes(fullText);
  if (recipes.elementOverride) suggestedElement = recipes.elementOverride;

  const element: Element =
    suggestedElement ??
    inferElementFromKeywords(selectedPrompt + " " + cardName) ??
    getRandomElement();

  const eventLegendary = (await getLegendaryRainProbability()) || undefined;
  const rarity = rollRarity({
    legendary: recipes.legendaryOverride ?? eventLegendary,
    mythic: recipes.mythicOverride,
  });
  const stats = generateStats(rarity);
  const skills = await assignSkills(element, rarity);

  const imageUrl = `https://placehold.co/512x512/1a1a2e/e94560?text=${encodeURIComponent(cardName)}`;

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .insert({
      name: cardName,
      description: session.concept,
      image_url: imageUrl,
      image_prompt: selectedPrompt,
      creator_id: agentId,
      owner_id: agentId,
      element,
      rarity,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
    })
    .select()
    .single();

  if (cardError) throw cardError;

  if (skills.length > 0) {
    await supabase.from("card_skills").insert(
      skills.map((s) => ({
        card_id: card.id,
        skill_id: s.skill_id,
        name: s.name,
        description: s.description,
        element: s.element,
        type: s.type,
        power: s.power,
        cost: s.cost,
        cooldown: s.cooldown,
        effects: s.effects,
      })),
    );
  }

  await supabase
    .from("card_sessions")
    .update({ status: "completed", selected_prompt_id: promptId })
    .eq("id", sessionId);

  const { data: agentData } = await supabase.from("agents").select("cards_created").eq("id", agentId).single();
  await supabase
    .from("agents")
    .update({
      last_card_created_at: new Date().toISOString(),
      cards_created: (agentData?.cards_created ?? 0) + 1,
    })
    .eq("id", agentId);

  await checkRarityBadge(agentId, rarity);
  await checkCardBadges(agentId);

  const fullCard = await getCardById(card.id);

  return {
    card: fullCard,
    spark_spent: ECONOMY.CARD_CREATION_COST,
    spark_remaining: sparkRemaining,
  };
}

export async function getCardById(cardId: string): Promise<Card | null> {
  const { data: card, error } = await supabase.from("cards").select("*").eq("id", cardId).single();
  if (error || !card) return null;

  const { data: skills } = await supabase.from("card_skills").select("*").eq("card_id", cardId);

  return {
    id: card.id,
    name: card.name,
    description: card.description,
    image_url: card.image_url,
    image_prompt: card.image_prompt,
    creator_id: card.creator_id,
    owner_id: card.owner_id,
    element: card.element,
    rarity: card.rarity,
    stats: { hp: card.hp, atk: card.atk, def: card.def, spd: card.spd },
    skills: (skills ?? []).map((s: any) => ({
      skill_id: s.skill_id,
      name: s.name,
      description: s.description,
      element: s.element,
      type: s.type,
      power: s.power,
      cost: s.cost,
      cooldown: s.cooldown,
      effects: s.effects ?? [],
    })),
    battle_count: card.battle_count,
    win_count: card.win_count,
    is_tradeable: card.is_tradeable,
    created_at: card.created_at,
  };
}

export async function getAgentCards(agentId: string): Promise<Card[]> {
  const { data: cards, error } = await supabase.from("cards").select("id").eq("owner_id", agentId);
  if (error || !cards) return [];

  const results = await Promise.all(cards.map((c: { id: string }) => getCardById(c.id)));
  return results.filter((c): c is Card => c !== null);
}
