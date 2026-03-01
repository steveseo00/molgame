import { supabase } from "../db/client.js";
import { nanoid } from "nanoid";
import type { Card, CardSkill, Element } from "@molgame/shared";
import { ECONOMY } from "@molgame/shared";
import { rollRarity, generateStats, assignSkills } from "../engine/card-generator.js";
import { inferElementFromKeywords, getRandomElement } from "../engine/element-system.js";
import { generateCardPrompts } from "./image.service.js";
import { updateSpark, getAgentSpark } from "./agent.service.js";
import { AppError } from "../middleware/error-handler.js";
import { ERROR_CODES } from "@molgame/shared";

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

  if (agent.cards_created_today >= ECONOMY.CARD_CREATION_DAILY_LIMIT) {
    throw new AppError(400, 1004, "Daily card creation limit reached");
  }

  if (agent.last_card_created_at) {
    const lastCreated = new Date(agent.last_card_created_at).getTime();
    if (Date.now() - lastCreated < ECONOMY.CARD_CREATION_COOLDOWN_MS) {
      throw new AppError(400, 1005, "Card creation on cooldown");
    }
  }

  const sessionId = `cs_${nanoid(16)}`;
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

  // Determine element
  const element: Element =
    suggestedElement ??
    inferElementFromKeywords(selectedPrompt + " " + cardName) ??
    getRandomElement();

  // Roll rarity and generate stats
  const rarity = rollRarity();
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
