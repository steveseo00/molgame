import { supabase } from "./supabase-server";
import { getCardById } from "./card-service";
import { generateBotAction, BOT_AGENT_ID } from "./practice-service";
import type {
  Card,
  BattleState,
  BattleAgentState,
  BattleCardState,
  BattleEvent,
  BattleEffect,
  BattleActionType,
  BattleMode,
  CardSkill,
  Element,
} from "@molgame/shared";
import { BATTLE, ELO, ECONOMY, getElementMultiplier } from "@molgame/shared";

// ─── Matchmaking (DB-based) ─────────────────────────────────────────────────

export async function joinQueue(
  agentId: string,
  agentName: string,
  elo: number,
  deck: string[],
  mode: "ranked" | "casual",
) {
  // Check not already queued
  const { data: existing } = await supabase
    .from("matchmaking_queue")
    .select("id")
    .eq("agent_id", agentId)
    .single();

  if (existing) throw new Error("Already in queue");

  // Insert into queue
  await supabase.from("matchmaking_queue").insert({
    agent_id: agentId,
    agent_name: agentName,
    elo,
    deck,
    mode,
  });

  // Try to find a match
  return tryMatch(agentId, elo, mode);
}

async function tryMatch(agentId: string, elo: number, mode: string) {
  // Get our entry
  const { data: entry } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("agent_id", agentId)
    .single();

  if (!entry) return { matched: false, position: 0 };

  const now = Date.now();
  const entryTime = new Date(entry.queued_at).getTime();

  // Find compatible opponent
  const { data: candidates } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("mode", mode)
    .neq("agent_id", agentId)
    .order("queued_at", { ascending: true });

  for (const candidate of candidates ?? []) {
    const waitTime = now - Math.min(entryTime, new Date(candidate.queued_at).getTime());
    const expansions = Math.floor(waitTime / ELO.MATCHMAKING_EXPAND_INTERVAL_MS);
    const range = Math.min(
      ELO.MATCHMAKING_RANGE + expansions * ELO.MATCHMAKING_EXPAND_AMOUNT,
      ELO.MATCHMAKING_MAX_RANGE,
    );

    const eloDiff = Math.abs(elo - candidate.elo);
    if (eloDiff <= range) {
      // Match found! Remove both from queue
      await supabase.from("matchmaking_queue").delete().eq("agent_id", agentId);
      await supabase.from("matchmaking_queue").delete().eq("agent_id", candidate.agent_id);

      // Create battle
      const battleId = crypto.randomUUID();
      const battle = await createBattle(
        battleId,
        entry.mode as BattleMode,
        { id: entry.agent_id, name: entry.agent_name, deckCardIds: entry.deck as string[] },
        { id: candidate.agent_id, name: candidate.agent_name, deckCardIds: candidate.deck as string[] },
      );

      return { matched: true, battle_id: battleId, battle };
    }
  }

  // Count position
  const { count } = await supabase
    .from("matchmaking_queue")
    .select("*", { count: "exact", head: true })
    .eq("mode", mode);

  return { matched: false, position: count ?? 1 };
}

// ─── Battle Creation ─────────────────────────────────────────────────────────

export async function createBattle(
  battleId: string,
  mode: BattleMode,
  agentA: { id: string; name: string; deckCardIds: string[] },
  agentB: { id: string; name: string; deckCardIds: string[] },
): Promise<BattleState> {
  const cardsA = await Promise.all(agentA.deckCardIds.map((id) => getCardById(id)));
  const cardsB = await Promise.all(agentB.deckCardIds.map((id) => getCardById(id)));

  const validCardsA = cardsA.filter((c): c is Card => c !== null);
  const validCardsB = cardsB.filter((c): c is Card => c !== null);

  const state = createBattleState(
    battleId,
    mode,
    { id: agentA.id, name: agentA.name, cards: validCardsA },
    { id: agentB.id, name: agentB.name, cards: validCardsB },
  );

  await supabase.from("battles").insert({
    id: battleId,
    agent_a_id: agentA.id,
    agent_b_id: agentB.id,
    mode,
    status: "active",
    battle_state: state,
  });

  return state;
}

// ─── Action Submission (DB-based) ────────────────────────────────────────────

export async function submitAction(
  battleId: string,
  agentId: string,
  action: BattleActionType,
  skillId?: string,
  cardId?: string,
) {
  // Load battle state from DB
  const { data: battle, error } = await supabase
    .from("battles")
    .select("battle_state, status, agent_a_id, agent_b_id")
    .eq("id", battleId)
    .single();

  if (error || !battle) throw new Error("Battle not found");
  if (battle.status !== "active") throw new Error("Battle is not active");

  const state = battle.battle_state as BattleState;
  if (state.agent_a.agent_id !== agentId && state.agent_b.agent_id !== agentId) {
    throw new Error("Agent is not in this battle");
  }

  // Practice mode: auto-generate bot action and process turn immediately
  if (state.mode === "practice") {
    const botId = state.agent_a.agent_id === BOT_AGENT_ID
      ? state.agent_a.agent_id
      : state.agent_b.agent_id;
    const botAction = generateBotAction(state, botId);

    const isAgentA = agentId === state.agent_a.agent_id;
    const playerAction = { action, skill_id: skillId, card_id: cardId };

    const updatedState = processTurn(
      state,
      isAgentA ? playerAction : botAction,
      isAgentA ? botAction : playerAction,
    );

    // Update battle in DB
    await supabase
      .from("battles")
      .update({
        status: updatedState.status,
        turns: updatedState.turn,
        battle_state: updatedState,
        battle_log: updatedState.battle_log,
        winner_id: updatedState.winner_id,
        finished_at: updatedState.finished_at,
      })
      .eq("id", battleId);

    return { waiting: false, state: sanitizeBattleState(updatedState) };
  }

  // Upsert pending action
  await supabase.from("battle_pending_actions").upsert(
    { battle_id: battleId, agent_id: agentId, action, skill_id: skillId ?? null, card_id: cardId ?? null },
    { onConflict: "battle_id,agent_id" },
  );

  // Check if both agents have submitted
  const { data: pendingActions } = await supabase
    .from("battle_pending_actions")
    .select("*")
    .eq("battle_id", battleId);

  if (!pendingActions || pendingActions.length < 2) {
    return { waiting: true, state: sanitizeBattleState(state) };
  }

  const agentAId = state.agent_a.agent_id;
  const agentBId = state.agent_b.agent_id;

  const actionA = pendingActions.find((a: any) => a.agent_id === agentAId);
  const actionB = pendingActions.find((a: any) => a.agent_id === agentBId);

  if (!actionA || !actionB) {
    return { waiting: true, state: sanitizeBattleState(state) };
  }

  // Process turn
  const updatedState = processTurn(
    state,
    { action: actionA.action as BattleActionType, skill_id: actionA.skill_id ?? undefined, card_id: actionA.card_id ?? undefined },
    { action: actionB.action as BattleActionType, skill_id: actionB.skill_id ?? undefined, card_id: actionB.card_id ?? undefined },
  );

  // Clean up pending actions
  await supabase.from("battle_pending_actions").delete().eq("battle_id", battleId);

  // Update battle in DB
  await supabase
    .from("battles")
    .update({
      status: updatedState.status,
      turns: updatedState.turn,
      battle_state: updatedState,
      battle_log: updatedState.battle_log,
      winner_id: updatedState.winner_id,
      finished_at: updatedState.finished_at,
    })
    .eq("id", battleId);

  // If finished, process rewards
  if (updatedState.status === "finished") {
    await processPostBattle(updatedState).catch(() => {});
  }

  return { waiting: false, state: sanitizeBattleState(updatedState) };
}

async function processPostBattle(state: BattleState) {
  if (state.mode === "practice") return; // no rewards for practice
  if (!state.winner_id) return; // draw

  const winnerId = state.winner_id;
  const loserId = state.agent_a.agent_id === winnerId ? state.agent_b.agent_id : state.agent_a.agent_id;

  // Update winner spark + stats
  const { data: winner } = await supabase.from("agents").select("spark, total_battles, total_wins").eq("id", winnerId).single();
  if (winner) {
    await supabase.from("agents").update({
      spark: winner.spark + ECONOMY.BATTLE_WIN,
      total_battles: (winner.total_battles ?? 0) + 1,
      total_wins: (winner.total_wins ?? 0) + 1,
    }).eq("id", winnerId);
  }

  // Update loser stats
  const { data: loser } = await supabase.from("agents").select("spark, total_battles").eq("id", loserId).single();
  if (loser) {
    await supabase.from("agents").update({
      spark: loser.spark + ECONOMY.BATTLE_LOSS,
      total_battles: (loser.total_battles ?? 0) + 1,
    }).eq("id", loserId);
  }
}

// ─── Battle Engine (inlined from apps/api/src/engine/battle-engine.ts) ──────

function createBattleState(
  battleId: string,
  mode: BattleMode,
  agentA: { id: string; name: string; cards: Card[] },
  agentB: { id: string; name: string; cards: Card[] },
): BattleState {
  return {
    battle_id: battleId,
    mode,
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
        message: `Battle started: ${agentA.name} vs ${agentB.name}`,
      },
    ],
    started_at: new Date().toISOString(),
    finished_at: null,
  };
}

function createAgentState(agent: { id: string; name: string; cards: Card[] }): BattleAgentState {
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

function getActiveCard(agent: BattleAgentState): BattleCardState {
  return agent.cards[agent.active_card_index];
}

function processTurn(
  state: BattleState,
  actionA: { action: BattleActionType; skill_id?: string; card_id?: string },
  actionB: { action: BattleActionType; skill_id?: string; card_id?: string },
): BattleState {
  state.turn += 1;
  const events: BattleEvent[] = [];
  const timestamp = new Date().toISOString();

  events.push({ type: "turn_start", turn: state.turn, timestamp, message: `Turn ${state.turn} begins` });

  // Handle card swaps first
  if (actionA.action === "select_card" && actionA.card_id) {
    const r = swapCard(state.agent_a, actionA.card_id, state.turn, timestamp);
    if (r) events.push(r);
  }
  if (actionB.action === "select_card" && actionB.card_id) {
    const r = swapCard(state.agent_b, actionB.card_id, state.turn, timestamp);
    if (r) events.push(r);
  }

  // Determine turn order by SPD
  const activeA = getActiveCard(state.agent_a);
  const activeB = getActiveCard(state.agent_b);
  const spdA = getEffectiveSpd(activeA);
  const spdB = getEffectiveSpd(activeB);
  const aGoesFirst = spdA > spdB || (spdA === spdB && Math.random() < 0.5);

  const first = aGoesFirst
    ? { agent: state.agent_a, action: actionA }
    : { agent: state.agent_b, action: actionB };
  const second = aGoesFirst
    ? { agent: state.agent_b, action: actionB }
    : { agent: state.agent_a, action: actionA };

  // Process first action
  if (first.action.action !== "select_card") {
    events.push(...processAction(first.agent, second.agent, first.action, state.turn, timestamp));
  }

  // Process second action if active card alive
  const secondActive = getActiveCard(second.agent);
  if (secondActive.current_hp > 0 && second.action.action !== "select_card") {
    events.push(...processAction(second.agent, first.agent, second.action, state.turn, timestamp));
  }

  // Process DoT/HoT
  events.push(...processEffects(state.agent_a, state.turn, timestamp));
  events.push(...processEffects(state.agent_b, state.turn, timestamp));

  // Tick cooldowns
  tickCooldowns(state.agent_a);
  tickCooldowns(state.agent_b);

  // Check KOs
  events.push(...checkKOs(state.agent_a, state.turn, timestamp));
  events.push(...checkKOs(state.agent_b, state.turn, timestamp));

  // Update remaining
  state.agent_a.cards_remaining = state.agent_a.cards.filter((c) => c.current_hp > 0).length;
  state.agent_b.cards_remaining = state.agent_b.cards.filter((c) => c.current_hp > 0).length;

  events.push({
    type: "turn_end",
    turn: state.turn,
    timestamp,
    message: `Turn ${state.turn} ends`,
    data: {
      agent_a: {
        active_card: getActiveCard(state.agent_a).card.name,
        hp: getActiveCard(state.agent_a).current_hp,
        cards_remaining: state.agent_a.cards_remaining,
      },
      agent_b: {
        active_card: getActiveCard(state.agent_b).card.name,
        hp: getActiveCard(state.agent_b).current_hp,
        cards_remaining: state.agent_b.cards_remaining,
      },
    },
  });

  // Win conditions
  if (state.agent_a.cards_remaining === 0) {
    state.status = "finished";
    state.winner_id = state.agent_b.agent_id;
    state.finished_at = new Date().toISOString();
    events.push({ type: "battle_end", turn: state.turn, timestamp, message: `${state.agent_b.agent_name} wins!`, agent_id: state.agent_b.agent_id });
  } else if (state.agent_b.cards_remaining === 0) {
    state.status = "finished";
    state.winner_id = state.agent_a.agent_id;
    state.finished_at = new Date().toISOString();
    events.push({ type: "battle_end", turn: state.turn, timestamp, message: `${state.agent_a.agent_name} wins!`, agent_id: state.agent_a.agent_id });
  } else if (state.turn >= BATTLE.MAX_TURNS) {
    const hpA = totalHpPercent(state.agent_a);
    const hpB = totalHpPercent(state.agent_b);
    state.status = "finished";
    state.finished_at = new Date().toISOString();
    if (hpA > hpB) state.winner_id = state.agent_a.agent_id;
    else if (hpB > hpA) state.winner_id = state.agent_b.agent_id;
    events.push({
      type: "battle_end",
      turn: state.turn,
      timestamp,
      message: state.winner_id ? "Battle ended by turn limit. Winner by HP%." : "Battle ended in a draw!",
    });
  }

  state.battle_log.push(...events);
  return state;
}

// ─── Damage Calculator (inlined) ─────────────────────────────────────────────

function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  skill: CardSkill | null,
  attackerElement: Element,
  defenderElement: Element,
  attackerBuffs: BattleEffect[],
  defenderDebuffs: BattleEffect[],
  isDefending: boolean,
) {
  const skillPower = skill ? skill.power / 50 : BATTLE.BASIC_ATTACK_POWER;

  let effectiveAtk = attackerAtk;
  for (const buff of attackerBuffs) {
    if (buff.type === "atk_up") effectiveAtk *= 1 + buff.value;
    if (buff.type === "last_stand") effectiveAtk *= buff.value;
  }

  let effectiveDef = defenderDef;
  for (const debuff of defenderDebuffs) {
    if (debuff.type === "def_down") effectiveDef *= 1 - debuff.value;
  }

  let defIgnore = 0;
  if (skill) {
    for (const effect of skill.effects) {
      if (effect.type === "ignore_def") defIgnore += effect.value;
    }
  }
  effectiveDef *= 1 - Math.min(defIgnore, 1);

  if (isDefending) effectiveDef *= BATTLE.DEFEND_DEF_MULTIPLIER;

  let damageTakenMultiplier = 1;
  for (const debuff of defenderDebuffs) {
    if (debuff.type === "damage_taken_up") damageTakenMultiplier += debuff.value;
  }

  const rawDamage = effectiveAtk * skillPower - effectiveDef * BATTLE.DEF_FACTOR;
  const skillElement = skill?.element ?? attackerElement;
  const elementMultiplier = getElementMultiplier(skillElement, defenderElement);
  const isCritical = Math.random() < BATTLE.CRITICAL_CHANCE;
  const critMultiplier = isCritical ? BATTLE.CRITICAL_MULTIPLIER : 1;
  const randomFactor = BATTLE.DAMAGE_RANDOM_MIN + Math.random() * (BATTLE.DAMAGE_RANDOM_MAX - BATTLE.DAMAGE_RANDOM_MIN);

  const finalDamage = Math.max(
    BATTLE.MIN_DAMAGE,
    Math.floor(rawDamage * elementMultiplier * critMultiplier * randomFactor * damageTakenMultiplier),
  );

  return { final_damage: finalDamage, is_critical: isCritical, element_multiplier: elementMultiplier };
}

function calculateHeal(skill: CardSkill): number {
  for (const effect of skill.effects) {
    if (effect.type === "heal") return effect.value;
  }
  return skill.power;
}

// ─── Battle Engine helpers ───────────────────────────────────────────────────

function processAction(
  attacker: BattleAgentState,
  defender: BattleAgentState,
  action: { action: BattleActionType; skill_id?: string },
  turn: number,
  timestamp: string,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  const attackerCard = getActiveCard(attacker);
  const defenderCard = getActiveCard(defender);

  if (action.action === "defend") {
    events.push({
      type: "action", turn, timestamp,
      agent_id: attacker.agent_id, card_id: attackerCard.card.id,
      message: `${attackerCard.card.name} takes a defensive stance (DEF x${BATTLE.DEFEND_DEF_MULTIPLIER})`,
    });
    return events;
  }

  if (action.action === "basic_attack") {
    const result = calculateDamage(
      attackerCard.card.stats.atk, defenderCard.card.stats.def,
      null, attackerCard.card.element, defenderCard.card.element,
      attackerCard.buffs, defenderCard.debuffs, false,
    );
    defenderCard.current_hp = Math.max(0, defenderCard.current_hp - result.final_damage);
    events.push({
      type: "action", turn, timestamp,
      agent_id: attacker.agent_id, card_id: attackerCard.card.id,
      target_card_id: defenderCard.card.id, damage: result.final_damage,
      critical: result.is_critical, element_bonus: result.element_multiplier !== 1,
      remaining_hp: defenderCard.current_hp,
      message: `${attackerCard.card.name} attacks ${defenderCard.card.name} for ${result.final_damage} damage${result.is_critical ? " (CRITICAL!)" : ""}`,
    });
    return events;
  }

  if (action.action === "use_skill" && action.skill_id) {
    const skill = attackerCard.card.skills.find((s) => s.skill_id === action.skill_id);
    if (!skill) return events;

    const cd = attackerCard.skill_cooldowns[skill.skill_id] ?? 0;
    if (cd > 0) return processAction(attacker, defender, { action: "basic_attack" }, turn, timestamp);

    attackerCard.skill_cooldowns[skill.skill_id] = skill.cooldown;

    if (skill.type === "attack") {
      const result = calculateDamage(
        attackerCard.card.stats.atk, defenderCard.card.stats.def,
        skill, attackerCard.card.element, defenderCard.card.element,
        attackerCard.buffs, defenderCard.debuffs, false,
      );
      defenderCard.current_hp = Math.max(0, defenderCard.current_hp - result.final_damage);
      events.push({
        type: "action", turn, timestamp,
        agent_id: attacker.agent_id, card_id: attackerCard.card.id,
        target_card_id: defenderCard.card.id, skill_name: skill.name,
        damage: result.final_damage, critical: result.is_critical,
        element_bonus: result.element_multiplier !== 1, remaining_hp: defenderCard.current_hp,
        message: `${attackerCard.card.name} uses ${skill.name} on ${defenderCard.card.name} for ${result.final_damage} damage${result.is_critical ? " (CRITICAL!)" : ""}`,
      });

      for (const effect of skill.effects) {
        if (effect.type === "lifesteal") {
          const healAmt = Math.floor(result.final_damage * effect.value);
          attackerCard.current_hp = Math.min(attackerCard.max_hp, attackerCard.current_hp + healAmt);
          events.push({
            type: "heal", turn, timestamp, agent_id: attacker.agent_id, card_id: attackerCard.card.id,
            heal: healAmt, remaining_hp: attackerCard.current_hp,
            message: `${attackerCard.card.name} heals ${healAmt} HP from lifesteal`,
          });
        }
        if (effect.type === "dot") {
          defenderCard.debuffs.push({ type: "dot", value: effect.value, remaining_turns: effect.duration ?? 2, source_skill: skill.name });
        }
        if (["atk_down", "def_down", "spd_down", "damage_taken_up"].includes(effect.type)) {
          defenderCard.debuffs.push({ type: effect.type, value: effect.value, remaining_turns: effect.duration ?? 2, source_skill: skill.name });
          events.push({
            type: "debuff_applied", turn, timestamp, card_id: defenderCard.card.id,
            message: `${defenderCard.card.name} is affected by ${effect.type} (-${Math.round(effect.value * 100)}%)`,
          });
        }
      }
    } else if (skill.type === "heal") {
      const healAmt = calculateHeal(skill);
      attackerCard.current_hp = Math.min(attackerCard.max_hp, attackerCard.current_hp + healAmt);
      events.push({
        type: "heal", turn, timestamp, agent_id: attacker.agent_id, card_id: attackerCard.card.id,
        heal: healAmt, remaining_hp: attackerCard.current_hp, skill_name: skill.name,
        message: `${attackerCard.card.name} uses ${skill.name} and heals ${healAmt} HP`,
      });
      for (const effect of skill.effects) {
        if (["def_up", "atk_up", "spd_up"].includes(effect.type)) {
          attackerCard.buffs.push({ type: effect.type, value: effect.value, remaining_turns: effect.duration ?? 2, source_skill: skill.name });
        }
        if (effect.type === "hot") {
          attackerCard.buffs.push({ type: "hot", value: effect.value, remaining_turns: effect.duration ?? 3, source_skill: skill.name });
        }
      }
    } else if (skill.type === "buff") {
      for (const effect of skill.effects) {
        attackerCard.buffs.push({ type: effect.type, value: effect.value, remaining_turns: effect.duration ?? 2, source_skill: skill.name });
      }
      events.push({
        type: "buff_applied", turn, timestamp, agent_id: attacker.agent_id,
        card_id: attackerCard.card.id, skill_name: skill.name,
        message: `${attackerCard.card.name} uses ${skill.name}`,
      });
    } else if (skill.type === "debuff") {
      for (const effect of skill.effects) {
        defenderCard.debuffs.push({ type: effect.type, value: effect.value, remaining_turns: effect.duration ?? 2, source_skill: skill.name });
      }
      events.push({
        type: "debuff_applied", turn, timestamp, card_id: defenderCard.card.id, skill_name: skill.name,
        message: `${attackerCard.card.name} uses ${skill.name} on ${defenderCard.card.name}`,
      });
    } else if (skill.type === "special") {
      for (const effect of skill.effects) {
        if (effect.type === "self_damage_percent") {
          const selfDmg = Math.floor(attackerCard.max_hp * effect.value);
          attackerCard.current_hp = Math.max(1, attackerCard.current_hp - selfDmg);
          defenderCard.current_hp = Math.max(0, defenderCard.current_hp - skill.power);
          events.push({
            type: "action", turn, timestamp, agent_id: attacker.agent_id,
            card_id: attackerCard.card.id, target_card_id: defenderCard.card.id,
            skill_name: skill.name, damage: skill.power, remaining_hp: defenderCard.current_hp,
            message: `${attackerCard.card.name} sacrifices ${selfDmg} HP to deal ${skill.power} fixed damage to ${defenderCard.card.name}`,
          });
        }
      }
    }
  }

  return events;
}

function swapCard(agent: BattleAgentState, cardId: string, turn: number, timestamp: string): BattleEvent | null {
  const idx = agent.cards.findIndex((c) => c.card.id === cardId && c.current_hp > 0);
  if (idx === -1 || idx === agent.active_card_index) return null;

  agent.cards[agent.active_card_index].is_active = false;
  agent.active_card_index = idx;
  agent.cards[idx].is_active = true;

  return {
    type: "card_swapped", turn, timestamp,
    agent_id: agent.agent_id, card_id: cardId,
    message: `${agent.agent_name} sends out ${agent.cards[idx].card.name}`,
  };
}

function processEffects(agent: BattleAgentState, turn: number, timestamp: string): BattleEvent[] {
  const events: BattleEvent[] = [];
  const card = getActiveCard(agent);

  for (const debuff of card.debuffs) {
    if (debuff.type === "dot" && debuff.remaining_turns > 0) {
      card.current_hp = Math.max(0, card.current_hp - debuff.value);
      events.push({
        type: "damage", turn, timestamp, card_id: card.card.id,
        damage: debuff.value, remaining_hp: card.current_hp,
        message: `${card.card.name} takes ${debuff.value} damage from ${debuff.source_skill}`,
      });
    }
  }

  for (const buff of card.buffs) {
    if (buff.type === "hot" && buff.remaining_turns > 0) {
      card.current_hp = Math.min(card.max_hp, card.current_hp + buff.value);
      events.push({
        type: "heal", turn, timestamp, card_id: card.card.id,
        heal: buff.value, remaining_hp: card.current_hp,
        message: `${card.card.name} heals ${buff.value} HP from ${buff.source_skill}`,
      });
    }
  }

  return events;
}

function tickCooldowns(agent: BattleAgentState) {
  for (const card of agent.cards) {
    for (const skillId of Object.keys(card.skill_cooldowns)) {
      if (card.skill_cooldowns[skillId] > 0) card.skill_cooldowns[skillId]--;
    }
    card.buffs = card.buffs.filter((b) => { b.remaining_turns--; return b.remaining_turns > 0; });
    card.debuffs = card.debuffs.filter((d) => { d.remaining_turns--; return d.remaining_turns > 0; });
  }
}

function checkKOs(agent: BattleAgentState, turn: number, timestamp: string): BattleEvent[] {
  const events: BattleEvent[] = [];
  const activeCard = getActiveCard(agent);

  if (activeCard.current_hp <= 0) {
    activeCard.is_active = false;
    events.push({
      type: "card_defeated", turn, timestamp, agent_id: agent.agent_id,
      card_id: activeCard.card.id, message: `${activeCard.card.name} has been defeated!`,
    });

    const nextIdx = agent.cards.findIndex((c) => c.current_hp > 0);
    if (nextIdx !== -1) {
      agent.active_card_index = nextIdx;
      agent.cards[nextIdx].is_active = true;
      events.push({
        type: "card_swapped", turn, timestamp, agent_id: agent.agent_id,
        card_id: agent.cards[nextIdx].card.id,
        message: `${agent.agent_name} sends out ${agent.cards[nextIdx].card.name}`,
      });
    }
  }

  return events;
}

function getEffectiveSpd(card: BattleCardState): number {
  let spd = card.card.stats.spd;
  for (const buff of card.buffs) {
    if (buff.type === "spd_up") spd = Math.floor(spd * (1 + buff.value));
  }
  for (const debuff of card.debuffs) {
    if (debuff.type === "spd_down") spd = Math.floor(spd * (1 - debuff.value));
  }
  return Math.max(1, spd);
}

function totalHpPercent(agent: BattleAgentState): number {
  let total = 0;
  let max = 0;
  for (const card of agent.cards) {
    total += Math.max(0, card.current_hp);
    max += card.max_hp;
  }
  return max > 0 ? total / max : 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeBattleState(state: BattleState) {
  return {
    battle_id: state.battle_id,
    mode: state.mode,
    status: state.status,
    turn: state.turn,
    agent_a: {
      agent_id: state.agent_a.agent_id,
      agent_name: state.agent_a.agent_name,
      active_card: state.agent_a.cards[state.agent_a.active_card_index],
      cards_remaining: state.agent_a.cards_remaining,
    },
    agent_b: {
      agent_id: state.agent_b.agent_id,
      agent_name: state.agent_b.agent_name,
      active_card: state.agent_b.cards[state.agent_b.active_card_index],
      cards_remaining: state.agent_b.cards_remaining,
    },
    winner_id: state.winner_id,
    battle_log: state.battle_log.slice(-20),
  };
}
