import { supabase } from "./supabase-server";
import { getCardById } from "./card-service";
import { createBattle } from "./battle-service";
import type {
  Card,
  CardSkill,
  Element,
  BattleState,
  BattleAgentState,
  BattleCardState,
  BattleActionType,
  SkillPoolEntry,
} from "@molgame/shared";
import { ELEMENTS, ECONOMY } from "@molgame/shared";

// ─── Bot Card Generation ────────────────────────────────────────────────────

const BOT_NAMES = [
  "Training Dummy Alpha",
  "Practice Golem",
  "Sparring Phantom",
  "Bot Sentinel",
  "Drill Automaton",
  "Arena Mimic",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getSkillPool(): Promise<SkillPoolEntry[]> {
  const { data } = await supabase.from("skill_pool").select("*");
  return (data ?? []) as SkillPoolEntry[];
}

function pickSkillsForElement(
  pool: SkillPoolEntry[],
  element: Element,
  count: number,
): CardSkill[] {
  const eligible = pool.filter(
    (s) => s.element === element || s.element === null,
  );
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((s) => ({
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

export async function generateBotCards(playerCards: Card[]): Promise<Card[]> {
  // Calculate average stats from player cards
  const avgHp = Math.round(
    playerCards.reduce((sum, c) => sum + c.stats.hp, 0) / playerCards.length,
  );
  const avgAtk = Math.round(
    playerCards.reduce((sum, c) => sum + c.stats.atk, 0) / playerCards.length,
  );
  const avgDef = Math.round(
    playerCards.reduce((sum, c) => sum + c.stats.def, 0) / playerCards.length,
  );
  const avgSpd = Math.round(
    playerCards.reduce((sum, c) => sum + c.stats.spd, 0) / playerCards.length,
  );

  const pool = await getSkillPool();
  const botCards: Card[] = [];

  for (let i = 0; i < 3; i++) {
    const element = pickRandom(ELEMENTS);
    const variance = 0.15; // +/- 15% from player average
    const hp = randomInt(
      Math.round(avgHp * (1 - variance)),
      Math.round(avgHp * (1 + variance)),
    );
    const atk = randomInt(
      Math.round(avgAtk * (1 - variance)),
      Math.round(avgAtk * (1 + variance)),
    );
    const def = randomInt(
      Math.round(avgDef * (1 - variance)),
      Math.round(avgDef * (1 + variance)),
    );
    const spd = randomInt(
      Math.round(avgSpd * (1 - variance)),
      Math.round(avgSpd * (1 + variance)),
    );

    const skillCount = randomInt(2, 3);
    const skills = pickSkillsForElement(pool, element, skillCount);

    botCards.push({
      id: `bot-card-${i}-${Date.now()}`,
      name: `${pickRandom(BOT_NAMES)} #${i + 1}`,
      description: "A practice bot card",
      image_url: `https://placehold.co/512x512/2a2a3e/e94560?text=BOT+${i + 1}`,
      image_prompt: null,
      creator_id: "system",
      owner_id: "system",
      element,
      rarity: "rare",
      stats: { hp, atk, def, spd },
      skills,
      battle_count: 0,
      win_count: 0,
      is_tradeable: false,
      created_at: new Date().toISOString(),
    });
  }

  return botCards;
}

// ─── Bot AI ─────────────────────────────────────────────────────────────────

export function generateBotAction(
  state: BattleState,
  botAgentId: string,
): { action: BattleActionType; skill_id?: string; card_id?: string } {
  const botAgent =
    state.agent_a.agent_id === botAgentId ? state.agent_a : state.agent_b;
  const activeCard = botAgent.cards[botAgent.active_card_index];

  if (!activeCard || activeCard.current_hp <= 0) {
    // Try to swap to a living card
    const aliveCard = botAgent.cards.find((c) => c.current_hp > 0);
    if (aliveCard) {
      return { action: "select_card", card_id: aliveCard.card.id };
    }
    return { action: "defend" };
  }

  const hpPercent = activeCard.current_hp / activeCard.max_hp;

  // Priority 1: HP < 20% → defend
  if (hpPercent < 0.2) {
    return { action: "defend" };
  }

  // Priority 2: Has heal skill and HP < 50% → heal
  if (hpPercent < 0.5) {
    const healSkill = activeCard.card.skills.find(
      (s) =>
        s.type === "heal" &&
        (activeCard.skill_cooldowns[s.skill_id] ?? 0) === 0,
    );
    if (healSkill) {
      return { action: "use_skill", skill_id: healSkill.skill_id };
    }
  }

  // Priority 3: Use strongest available attack skill
  const attackSkills = activeCard.card.skills
    .filter(
      (s) =>
        s.type === "attack" &&
        (activeCard.skill_cooldowns[s.skill_id] ?? 0) === 0,
    )
    .sort((a, b) => b.power - a.power);

  if (attackSkills.length > 0) {
    return { action: "use_skill", skill_id: attackSkills[0].skill_id };
  }

  // Priority 4: Use any available non-heal skill
  const otherSkills = activeCard.card.skills.filter(
    (s) =>
      s.type !== "heal" &&
      (activeCard.skill_cooldowns[s.skill_id] ?? 0) === 0,
  );
  if (otherSkills.length > 0) {
    return { action: "use_skill", skill_id: otherSkills[0].skill_id };
  }

  // Fallback: basic attack
  return { action: "basic_attack" };
}

// ─── Start Practice Battle ──────────────────────────────────────────────────

// Fixed UUID for the practice bot (deterministic, not a real agent)
const BOT_AGENT_ID = "00000000-0000-0000-0000-000000000000";
const BOT_AGENT_NAME = "Practice Bot";

export { BOT_AGENT_ID };

export async function startPracticeBattle(
  agentId: string,
  agentName: string,
  deckCardIds: string[],
): Promise<{ battle_id: string; state: BattleState }> {
  // Load player cards
  const playerCards = await Promise.all(deckCardIds.map((id) => getCardById(id)));
  const validPlayerCards = playerCards.filter((c): c is Card => c !== null);

  if (validPlayerCards.length < ECONOMY.DECK_MIN_SIZE) {
    throw new Error(
      `Need at least ${ECONOMY.DECK_MIN_SIZE} valid cards in deck`,
    );
  }

  // Generate bot cards matching player power level
  const botCards = await generateBotCards(validPlayerCards);

  const battleId = crypto.randomUUID();

  // Create battle using a modified flow: we pass bot cards directly
  // instead of loading from DB
  const state = createPracticeBattleState(
    battleId,
    { id: agentId, name: agentName, cards: validPlayerCards },
    { id: BOT_AGENT_ID, name: BOT_AGENT_NAME, cards: botCards },
  );

  // Save to DB
  await supabase.from("battles").insert({
    id: battleId,
    agent_a_id: agentId,
    agent_b_id: BOT_AGENT_ID,
    mode: "practice",
    status: "active",
    battle_state: state,
  });

  return { battle_id: battleId, state };
}

function createPracticeBattleState(
  battleId: string,
  agentA: { id: string; name: string; cards: Card[] },
  agentB: { id: string; name: string; cards: Card[] },
): BattleState {
  return {
    battle_id: battleId,
    mode: "practice",
    status: "active",
    turn: 0,
    agent_a: createAgentState(agentA),
    agent_b: createAgentState(agentB),
    winner_id: null,
    battle_log: [
      {
        type: "battle_start",
        turn: 0,
        timestamp: new Date().toISOString(),
        message: `Practice battle started: ${agentA.name} vs ${agentB.name}`,
      },
    ],
    started_at: new Date().toISOString(),
    finished_at: null,
  };
}

function createAgentState(agent: {
  id: string;
  name: string;
  cards: Card[];
}): BattleAgentState {
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    cards: agent.cards.map((card, i) => ({
      card,
      current_hp: card.stats.hp,
      max_hp: card.stats.hp,
      buffs: [],
      debuffs: [],
      skill_cooldowns: {},
      is_active: i === 0,
    })),
    active_card_index: 0,
    cards_remaining: agent.cards.length,
  };
}
