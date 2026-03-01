import { supabase } from "../db/client.js";
import { nanoid } from "nanoid";
import type { Card, CardSkill, Element, Rarity } from "@molgame/shared";
import { ECONOMY, RARITY_CONFIG } from "@molgame/shared";
import { rollRarity, generateStats, assignSkills } from "../engine/card-generator.js";
import { inferElementFromKeywords, getRandomElement } from "../engine/element-system.js";
import { generateCardPrompts } from "./image.service.js";
import { updateSpark, getAgentSpark } from "./agent.service.js";
import { checkCardBadges, checkRarityBadge } from "./badge.service.js";
import { getLegendaryRainProbability } from "./event.service.js";
import { AppError } from "../middleware/error-handler.js";
import { ERROR_CODES } from "@molgame/shared";
import { issueWarning } from "./penalty.service.js";

// Content filter for card concepts (Rule R5)
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
      // Issue warning asynchronously (don't block card creation rejection)
      issueWarning(agentId, "R5", `Harmful content in card concept: "${concept.slice(0, 100)}"`).catch(() => {});
      return false;
    }
  }
  return true;
}

// --- Secret Card Recipes ---
// Hidden concept keywords that boost rarity chances. Community discovers and shares these.
const SECRET_RECIPES: Array<{
  pattern: RegExp;
  effect: { mythicBoost?: number; legendaryBoost?: number; guaranteedElement?: Element };
}> = [
  // Primordial concepts → 10% Mythic chance
  { pattern: /primordial\s+(shadow|flame|storm|void)/i, effect: { mythicBoost: 0.10 } },
  { pattern: /ancient\s+(guardian|titan|behemoth)/i, effect: { mythicBoost: 0.05 } },
  { pattern: /celestial\s+(dragon|phoenix|serpent)/i, effect: { mythicBoost: 0.08 } },
  // AI model name concepts → guaranteed legendary
  { pattern: /\b(claude|anthropic)\s+(warrior|knight|mage|phoenix)/i, effect: { legendaryBoost: 1.0 } },
  { pattern: /\b(gpt|openai)\s+(warrior|knight|mage|phoenix)/i, effect: { legendaryBoost: 1.0 } },
  { pattern: /\b(gemini|deepmind)\s+(warrior|knight|mage|phoenix)/i, effect: { legendaryBoost: 1.0 } },
  // Elemental purity → guaranteed element
  { pattern: /pure\s+fire|inferno\s+lord/i, effect: { guaranteedElement: "fire" } },
  { pattern: /pure\s+water|ocean\s+lord/i, effect: { guaranteedElement: "water" } },
  { pattern: /pure\s+lightning|thunder\s+lord/i, effect: { guaranteedElement: "lightning" } },
  { pattern: /pure\s+nature|forest\s+lord/i, effect: { guaranteedElement: "nature" } },
  { pattern: /pure\s+shadow|void\s+lord/i, effect: { guaranteedElement: "shadow" } },
  { pattern: /pure\s+light|radiant\s+lord/i, effect: { guaranteedElement: "light" } },
  // Easter eggs
  { pattern: /\bmolgame\b/i, effect: { mythicBoost: 0.15 } },
  { pattern: /\bworld\s+eater\b/i, effect: { mythicBoost: 0.05, guaranteedElement: "shadow" } },
];

function applySecretRecipes(concept: string): {
  mythicOverride?: number;
  legendaryOverride?: number;
  elementOverride?: Element;
} {
  let mythicOverride: number | undefined;
  let legendaryOverride: number | undefined;
  let elementOverride: Element | undefined;

  for (const recipe of SECRET_RECIPES) {
    if (recipe.pattern.test(concept)) {
      if (recipe.effect.mythicBoost) {
        mythicOverride = Math.max(mythicOverride ?? 0, recipe.effect.mythicBoost);
      }
      if (recipe.effect.legendaryBoost) {
        legendaryOverride = Math.max(legendaryOverride ?? 0, recipe.effect.legendaryBoost);
      }
      if (recipe.effect.guaranteedElement) {
        elementOverride = recipe.effect.guaranteedElement;
      }
    }
  }

  return { mythicOverride, legendaryOverride, elementOverride };
}

export async function initiateCardCreation(agentId: string, concept?: string) {
  // Check daily limit and cooldown
  const { data: agent } = await supabase
    .from("agents")
    .select("last_card_created_at, cards_created_today, spark")
    .eq("id", agentId)
    .single();

  if (!agent) throw new Error("Agent not found");

  if (agent.spark < ECONOMY.CARD_CREATION_COST) {
    throw new AppError(400, ERROR_CODES.INSUFFICIENT_SPARK, "Insufficient Spark");
  }

  // Content filter (Rule R5)
  if (concept && !checkContentFilter(concept, agentId)) {
    throw new AppError(400, 1010, "Card concept contains prohibited content. A warning has been issued.");
  }

  if (agent.cards_created_today >= ECONOMY.CARD_CREATION_DAILY_LIMIT) {
    throw new AppError(400, 1004, "Daily card creation limit reached");
  }

  if (agent.last_card_created_at) {
    const lastCreated = new Date(agent.last_card_created_at).getTime();
    if (Date.now() - lastCreated < ECONOMY.CARD_CREATION_COOLDOWN_MS) {
      throw new AppError(400, 1005, "Card creation on cooldown");
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
  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from("card_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .single();

  if (sessionError || !session) {
    throw new AppError(400, 1006, "Invalid or expired card creation session");
  }

  // Deduct Spark
  const sparkRemaining = await updateSpark(agentId, -ECONOMY.CARD_CREATION_COST);

  // Determine prompt and name
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
    if (!p) throw new AppError(400, 1007, "Invalid prompt_id");
    selectedPrompt = p.image_prompt;
    cardName = customName ?? p.suggested_name;
    suggestedElement = suggestedElement ?? p.suggested_element;
  } else if (customPrompt) {
    selectedPrompt = customPrompt;
    cardName = customName ?? `Card ${nanoid(6)}`;
  } else {
    // Use first suggestion
    selectedPrompt = prompts[0].image_prompt;
    cardName = customName ?? prompts[0].suggested_name;
    suggestedElement = suggestedElement ?? prompts[0].suggested_element;
  }

  // Apply secret card recipes if concept has hidden keywords
  const fullText = (session.concept ?? "") + " " + selectedPrompt + " " + cardName;
  const recipes = applySecretRecipes(fullText);

  // Recipe can override element
  if (recipes.elementOverride) {
    suggestedElement = recipes.elementOverride;
  }

  // Determine element
  const element: Element =
    suggestedElement ??
    inferElementFromKeywords(selectedPrompt + " " + cardName) ??
    getRandomElement();

  // Roll rarity with event + recipe overrides
  const eventLegendary = getLegendaryRainProbability() || undefined;
  const rarity = rollRarity({
    legendary: recipes.legendaryOverride ?? eventLegendary,
    mythic: recipes.mythicOverride,
  });
  const stats = generateStats(rarity);
  const skills = assignSkills(element, rarity);

  // TODO: Generate image via DALL-E 3 (for now, use placeholder)
  const imageUrl = `https://placehold.co/512x512/1a1a2e/e94560?text=${encodeURIComponent(cardName)}`;

  // Create card in DB
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

  // Insert skills
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

  // Mark session as used
  await supabase
    .from("card_sessions")
    .update({ status: "completed", selected_prompt_id: promptId })
    .eq("id", sessionId);

  // Update agent stats
  const { data: agentData } = await supabase
    .from("agents")
    .select("cards_created")
    .eq("id", agentId)
    .single();

  await supabase
    .from("agents")
    .update({
      last_card_created_at: new Date().toISOString(),
      cards_created: (agentData?.cards_created ?? 0) + 1,
    })
    .eq("id", agentId);

  // Check badges after card creation
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
  const { data: card, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error || !card) return null;

  const { data: skills } = await supabase
    .from("card_skills")
    .select("*")
    .eq("card_id", cardId);

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
    stats: {
      hp: card.hp,
      atk: card.atk,
      def: card.def,
      spd: card.spd,
    },
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

export async function getAgentCards(agentId: string) {
  const { data: cards, error } = await supabase
    .from("cards")
    .select("id")
    .eq("owner_id", agentId);

  if (error || !cards) return [];

  const results = await Promise.all(cards.map((c: { id: string }) => getCardById(c.id)));
  return results.filter((c): c is Card => c !== null);
}

export async function getCardGallery(params: {
  element?: string;
  rarity?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase.from("cards").select("id", { count: "exact" });

  if (params.element) query = query.eq("element", params.element);
  if (params.rarity) query = query.eq("rarity", params.rarity);

  const sortField = params.sort === "win_rate" ? "win_count" : "created_at";
  query = query.order(sortField, { ascending: false });
  query = query.range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 20) - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const cards = await Promise.all((data ?? []).map((c: { id: string }) => getCardById(c.id)));

  return {
    cards: cards.filter((c): c is Card => c !== null),
    total: count ?? 0,
  };
}

// --- Spark Sink: Card Evolution ---
// Combine 3 same-rarity + same-element cards → next rarity tier
const RARITY_UPGRADE: Record<string, Rarity> = {
  common: "rare",
  rare: "epic",
  epic: "legendary",
  legendary: "mythic",
};

export async function evolveCard(agentId: string, cardIds: string[]) {
  if (cardIds.length !== 3) {
    throw new AppError(400, 1020, "Evolution requires exactly 3 cards");
  }

  // Fetch all 3 cards
  const cards = await Promise.all(cardIds.map((id) => getCardById(id)));
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i]) throw new AppError(404, 1021, `Card ${cardIds[i]} not found`);
  }

  const validCards = cards as Card[];

  // Verify ownership
  for (const card of validCards) {
    if (card.owner_id !== agentId) {
      throw new AppError(403, 1022, `Card ${card.id} not owned by you`);
    }
  }

  // Verify same rarity and element
  const rarity = validCards[0].rarity;
  const element = validCards[0].element;
  if (rarity === "mythic") {
    throw new AppError(400, 1023, "Mythic cards cannot be evolved further");
  }
  for (const card of validCards) {
    if (card.rarity !== rarity) {
      throw new AppError(400, 1024, "All cards must have the same rarity");
    }
    if (card.element !== element) {
      throw new AppError(400, 1025, "All cards must have the same element");
    }
  }

  // Deduct Spark
  const sparkRemaining = await updateSpark(agentId, -ECONOMY.CARD_EVOLUTION_COST);

  // Delete the 3 source cards
  for (const cardId of cardIds) {
    await supabase.from("card_skills").delete().eq("card_id", cardId);
    await supabase.from("cards").delete().eq("id", cardId);
  }

  // Create evolved card at next rarity
  const newRarity = RARITY_UPGRADE[rarity];
  const stats = generateStats(newRarity);
  const skills = assignSkills(element, newRarity);
  const evolvedName = `Evolved ${validCards[0].name}`;
  const imageUrl = `https://placehold.co/512x512/1a1a2e/e94560?text=${encodeURIComponent(evolvedName)}`;

  const { data: newCard, error } = await supabase
    .from("cards")
    .insert({
      name: evolvedName,
      description: `Evolved from 3 ${rarity} ${element} cards`,
      image_url: imageUrl,
      image_prompt: validCards[0].image_prompt,
      creator_id: agentId,
      owner_id: agentId,
      element,
      rarity: newRarity,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
    })
    .select()
    .single();

  if (error) throw error;

  if (skills.length > 0) {
    await supabase.from("card_skills").insert(
      skills.map((s) => ({ card_id: newCard.id, ...s })),
    );
  }

  await checkRarityBadge(agentId, newRarity);

  const fullCard = await getCardById(newCard.id);
  return { card: fullCard, spark_spent: ECONOMY.CARD_EVOLUTION_COST, spark_remaining: sparkRemaining };
}

// --- Spark Sink: Card Reforging ---
// Re-roll one stat within rarity range
export async function reforgeCard(agentId: string, cardId: string, stat: "hp" | "atk" | "def" | "spd") {
  const card = await getCardById(cardId);
  if (!card) throw new AppError(404, 1030, "Card not found");
  if (card.owner_id !== agentId) throw new AppError(403, 1031, "Card not owned by you");

  const sparkRemaining = await updateSpark(agentId, -ECONOMY.CARD_REFORGE_COST);

  const config = RARITY_CONFIG[card.rarity];
  const range = config[stat];
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const newValue = randomInt(range[0], range[1]);

  await supabase
    .from("cards")
    .update({ [stat]: newValue })
    .eq("id", cardId);

  return {
    card_id: cardId,
    stat,
    old_value: card.stats[stat],
    new_value: newValue,
    spark_spent: ECONOMY.CARD_REFORGE_COST,
    spark_remaining: sparkRemaining,
  };
}

// --- Spark Sink: Card Boosting ---
// +10% stats for next 5 battles
export async function boostCard(agentId: string, cardId: string) {
  const card = await getCardById(cardId);
  if (!card) throw new AppError(404, 1040, "Card not found");
  if (card.owner_id !== agentId) throw new AppError(403, 1041, "Card not owned by you");

  const sparkRemaining = await updateSpark(agentId, -ECONOMY.CARD_BOOST_COST);

  await supabase
    .from("cards")
    .update({ boost_remaining: ECONOMY.CARD_BOOST_BATTLES })
    .eq("id", cardId);

  return {
    card_id: cardId,
    boost_remaining: ECONOMY.CARD_BOOST_BATTLES,
    boost_multiplier: ECONOMY.CARD_BOOST_MULTIPLIER,
    spark_spent: ECONOMY.CARD_BOOST_COST,
    spark_remaining: sparkRemaining,
  };
}
