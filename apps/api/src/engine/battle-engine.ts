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
} from "@molgame/shared";
import { BATTLE } from "@molgame/shared";
import { calculateDamage, calculateHeal } from "./damage-calculator.js";

export function createBattleState(
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

export function processTurn(
  state: BattleState,
  actionA: { action: BattleActionType; skill_id?: string; card_id?: string },
  actionB: { action: BattleActionType; skill_id?: string; card_id?: string },
): BattleState {
  state.turn += 1;
  const events: BattleEvent[] = [];
  const timestamp = new Date().toISOString();

  events.push({
    type: "turn_start",
    turn: state.turn,
    timestamp,
    message: `Turn ${state.turn} begins`,
  });

  const cardA = getActiveCard(state.agent_a);
  const cardB = getActiveCard(state.agent_b);

  // Handle card swaps first
  if (actionA.action === "select_card" && actionA.card_id) {
    const swapResult = swapCard(state.agent_a, actionA.card_id, state.turn, timestamp);
    if (swapResult) events.push(swapResult);
  }
  if (actionB.action === "select_card" && actionB.card_id) {
    const swapResult = swapCard(state.agent_b, actionB.card_id, state.turn, timestamp);
    if (swapResult) events.push(swapResult);
  }

  // Determine turn order by SPD
  const activeA = getActiveCard(state.agent_a);
  const activeB = getActiveCard(state.agent_b);
  const spdA = getEffectiveSpd(activeA);
  const spdB = getEffectiveSpd(activeB);

  const aGoesFirst = spdA > spdB || (spdA === spdB && Math.random() < 0.5);

  const first = aGoesFirst
    ? { agent: state.agent_a, action: actionA, card: activeA }
    : { agent: state.agent_b, action: actionB, card: activeB };
  const second = aGoesFirst
    ? { agent: state.agent_b, action: actionB, card: activeB }
    : { agent: state.agent_a, action: actionA, card: activeA };

  // Process first action
  if (first.action.action !== "select_card") {
    const actionEvents = processAction(
      first.agent,
      second.agent,
      first.action,
      state.turn,
      timestamp,
    );
    events.push(...actionEvents);
  }

  // Check if second agent's active card is KO'd
  const secondActive = getActiveCard(second.agent);
  if (secondActive.current_hp > 0 && second.action.action !== "select_card") {
    const actionEvents = processAction(
      second.agent,
      first.agent,
      second.action,
      state.turn,
      timestamp,
    );
    events.push(...actionEvents);
  }

  // Process DoT/HoT effects
  events.push(...processEffects(state.agent_a, state.turn, timestamp));
  events.push(...processEffects(state.agent_b, state.turn, timestamp));

  // Tick cooldowns and effect durations
  tickCooldowns(state.agent_a);
  tickCooldowns(state.agent_b);

  // Check for KO'd cards and auto-swap
  events.push(...checkKOs(state.agent_a, state.turn, timestamp));
  events.push(...checkKOs(state.agent_b, state.turn, timestamp));

  // Update remaining cards count
  state.agent_a.cards_remaining = state.agent_a.cards.filter((c) => c.current_hp > 0).length;
  state.agent_b.cards_remaining = state.agent_b.cards.filter((c) => c.current_hp > 0).length;

  // Turn end event
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

  // Check win condition
  if (state.agent_a.cards_remaining === 0) {
    state.status = "finished";
    state.winner_id = state.agent_b.agent_id;
    state.finished_at = new Date().toISOString();
    events.push({
      type: "battle_end",
      turn: state.turn,
      timestamp,
      message: `${state.agent_b.agent_name} wins the battle!`,
      agent_id: state.agent_b.agent_id,
    });
  } else if (state.agent_b.cards_remaining === 0) {
    state.status = "finished";
    state.winner_id = state.agent_a.agent_id;
    state.finished_at = new Date().toISOString();
    events.push({
      type: "battle_end",
      turn: state.turn,
      timestamp,
      message: `${state.agent_a.agent_name} wins the battle!`,
      agent_id: state.agent_a.agent_id,
    });
  } else if (state.turn >= BATTLE.MAX_TURNS) {
    // Draw determined by remaining HP percentage
    const hpPercentA = totalHpPercent(state.agent_a);
    const hpPercentB = totalHpPercent(state.agent_b);
    state.status = "finished";
    state.finished_at = new Date().toISOString();
    if (hpPercentA > hpPercentB) {
      state.winner_id = state.agent_a.agent_id;
    } else if (hpPercentB > hpPercentA) {
      state.winner_id = state.agent_b.agent_id;
    }
    // null winner_id = draw
    events.push({
      type: "battle_end",
      turn: state.turn,
      timestamp,
      message: state.winner_id
        ? `Battle ended by turn limit. Winner determined by HP%.`
        : `Battle ended in a draw!`,
    });
  }

  state.battle_log.push(...events);
  return state;
}

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
      type: "action",
      turn,
      timestamp,
      agent_id: attacker.agent_id,
      card_id: attackerCard.card.id,
      message: `${attackerCard.card.name} takes a defensive stance (DEF x${BATTLE.DEFEND_DEF_MULTIPLIER})`,
    });
    return events;
  }

  if (action.action === "basic_attack") {
    const result = calculateDamage(
      attackerCard.card.stats.atk,
      defenderCard.card.stats.def,
      null,
      attackerCard.card.element,
      defenderCard.card.element,
      attackerCard.buffs,
      defenderCard.debuffs,
      false,
    );

    defenderCard.current_hp = Math.max(0, defenderCard.current_hp - result.final_damage);

    events.push({
      type: "action",
      turn,
      timestamp,
      agent_id: attacker.agent_id,
      card_id: attackerCard.card.id,
      target_card_id: defenderCard.card.id,
      damage: result.final_damage,
      critical: result.is_critical,
      element_bonus: result.element_multiplier !== 1,
      remaining_hp: defenderCard.current_hp,
      message: `${attackerCard.card.name} attacks ${defenderCard.card.name} for ${result.final_damage} damage${result.is_critical ? " (CRITICAL!)" : ""}`,
    });
    return events;
  }

  if (action.action === "use_skill" && action.skill_id) {
    const skill = attackerCard.card.skills.find((s) => s.skill_id === action.skill_id);
    if (!skill) return events;

    // Check cooldown
    const cd = attackerCard.skill_cooldowns[skill.skill_id] ?? 0;
    if (cd > 0) {
      // Skill on cooldown, do basic attack instead
      return processAction(attacker, defender, { action: "basic_attack" }, turn, timestamp);
    }

    // Set cooldown
    attackerCard.skill_cooldowns[skill.skill_id] = skill.cooldown;

    // Handle different skill types
    if (skill.type === "attack") {
      const isDefending = false; // defender chose defend handled elsewhere
      const result = calculateDamage(
        attackerCard.card.stats.atk,
        defenderCard.card.stats.def,
        skill,
        attackerCard.card.element,
        defenderCard.card.element,
        attackerCard.buffs,
        defenderCard.debuffs,
        isDefending,
      );

      defenderCard.current_hp = Math.max(0, defenderCard.current_hp - result.final_damage);

      events.push({
        type: "action",
        turn,
        timestamp,
        agent_id: attacker.agent_id,
        card_id: attackerCard.card.id,
        target_card_id: defenderCard.card.id,
        skill_name: skill.name,
        damage: result.final_damage,
        critical: result.is_critical,
        element_bonus: result.element_multiplier !== 1,
        remaining_hp: defenderCard.current_hp,
        message: `${attackerCard.card.name} uses ${skill.name} on ${defenderCard.card.name} for ${result.final_damage} damage${result.is_critical ? " (CRITICAL!)" : ""}`,
      });

      // Lifesteal
      for (const effect of skill.effects) {
        if (effect.type === "lifesteal") {
          const healAmount = Math.floor(result.final_damage * effect.value);
          attackerCard.current_hp = Math.min(
            attackerCard.max_hp,
            attackerCard.current_hp + healAmount,
          );
          events.push({
            type: "heal",
            turn,
            timestamp,
            agent_id: attacker.agent_id,
            card_id: attackerCard.card.id,
            heal: healAmount,
            remaining_hp: attackerCard.current_hp,
            message: `${attackerCard.card.name} heals ${healAmount} HP from lifesteal`,
          });
        }
        // Apply DoT to defender
        if (effect.type === "dot") {
          defenderCard.debuffs.push({
            type: "dot",
            value: effect.value,
            remaining_turns: effect.duration ?? 2,
            source_skill: skill.name,
          });
        }
      }

      // Apply debuffs from skill effects
      for (const effect of skill.effects) {
        if (["atk_down", "def_down", "spd_down", "damage_taken_up"].includes(effect.type)) {
          defenderCard.debuffs.push({
            type: effect.type,
            value: effect.value,
            remaining_turns: effect.duration ?? 2,
            source_skill: skill.name,
          });
          events.push({
            type: "debuff_applied",
            turn,
            timestamp,
            card_id: defenderCard.card.id,
            message: `${defenderCard.card.name} is affected by ${effect.type} (-${Math.round(effect.value * 100)}%)`,
          });
        }
      }
    } else if (skill.type === "heal") {
      const healAmount = calculateHeal(skill);
      attackerCard.current_hp = Math.min(attackerCard.max_hp, attackerCard.current_hp + healAmount);

      events.push({
        type: "heal",
        turn,
        timestamp,
        agent_id: attacker.agent_id,
        card_id: attackerCard.card.id,
        heal: healAmount,
        remaining_hp: attackerCard.current_hp,
        skill_name: skill.name,
        message: `${attackerCard.card.name} uses ${skill.name} and heals ${healAmount} HP`,
      });

      // Apply buffs from heal skills
      for (const effect of skill.effects) {
        if (["def_up", "atk_up", "spd_up"].includes(effect.type)) {
          attackerCard.buffs.push({
            type: effect.type,
            value: effect.value,
            remaining_turns: effect.duration ?? 2,
            source_skill: skill.name,
          });
        }
        if (effect.type === "hot") {
          attackerCard.buffs.push({
            type: "hot",
            value: effect.value,
            remaining_turns: effect.duration ?? 3,
            source_skill: skill.name,
          });
        }
      }
    } else if (skill.type === "buff") {
      for (const effect of skill.effects) {
        attackerCard.buffs.push({
          type: effect.type,
          value: effect.value,
          remaining_turns: effect.duration ?? 2,
          source_skill: skill.name,
        });
      }
      events.push({
        type: "buff_applied",
        turn,
        timestamp,
        agent_id: attacker.agent_id,
        card_id: attackerCard.card.id,
        skill_name: skill.name,
        message: `${attackerCard.card.name} uses ${skill.name}`,
      });
    } else if (skill.type === "debuff") {
      for (const effect of skill.effects) {
        defenderCard.debuffs.push({
          type: effect.type,
          value: effect.value,
          remaining_turns: effect.duration ?? 2,
          source_skill: skill.name,
        });
      }
      events.push({
        type: "debuff_applied",
        turn,
        timestamp,
        card_id: defenderCard.card.id,
        skill_name: skill.name,
        message: `${attackerCard.card.name} uses ${skill.name} on ${defenderCard.card.name}`,
      });
    } else if (skill.type === "special") {
      // Handle special skills (sacrifice, swap, etc.)
      for (const effect of skill.effects) {
        if (effect.type === "self_damage_percent") {
          const selfDmg = Math.floor(attackerCard.max_hp * effect.value);
          attackerCard.current_hp = Math.max(1, attackerCard.current_hp - selfDmg);
          defenderCard.current_hp = Math.max(0, defenderCard.current_hp - skill.power);
          events.push({
            type: "action",
            turn,
            timestamp,
            agent_id: attacker.agent_id,
            card_id: attackerCard.card.id,
            target_card_id: defenderCard.card.id,
            skill_name: skill.name,
            damage: skill.power,
            remaining_hp: defenderCard.current_hp,
            message: `${attackerCard.card.name} sacrifices ${selfDmg} HP to deal ${skill.power} fixed damage to ${defenderCard.card.name}`,
          });
        }
      }
    }
  }

  return events;
}

function swapCard(
  agent: BattleAgentState,
  cardId: string,
  turn: number,
  timestamp: string,
): BattleEvent | null {
  const idx = agent.cards.findIndex((c) => c.card.id === cardId && c.current_hp > 0);
  if (idx === -1 || idx === agent.active_card_index) return null;

  agent.cards[agent.active_card_index].is_active = false;
  agent.active_card_index = idx;
  agent.cards[idx].is_active = true;

  return {
    type: "card_swapped",
    turn,
    timestamp,
    agent_id: agent.agent_id,
    card_id: cardId,
    message: `${agent.agent_name} sends out ${agent.cards[idx].card.name}`,
  };
}

function processEffects(
  agent: BattleAgentState,
  turn: number,
  timestamp: string,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  const card = getActiveCard(agent);

  // Process DoT
  for (const debuff of card.debuffs) {
    if (debuff.type === "dot" && debuff.remaining_turns > 0) {
      card.current_hp = Math.max(0, card.current_hp - debuff.value);
      events.push({
        type: "damage",
        turn,
        timestamp,
        card_id: card.card.id,
        damage: debuff.value,
        remaining_hp: card.current_hp,
        message: `${card.card.name} takes ${debuff.value} damage from ${debuff.source_skill}`,
      });
    }
  }

  // Process HoT
  for (const buff of card.buffs) {
    if (buff.type === "hot" && buff.remaining_turns > 0) {
      card.current_hp = Math.min(card.max_hp, card.current_hp + buff.value);
      events.push({
        type: "heal",
        turn,
        timestamp,
        card_id: card.card.id,
        heal: buff.value,
        remaining_hp: card.current_hp,
        message: `${card.card.name} heals ${buff.value} HP from ${buff.source_skill}`,
      });
    }
  }

  return events;
}

function tickCooldowns(agent: BattleAgentState) {
  for (const card of agent.cards) {
    // Tick skill cooldowns
    for (const skillId of Object.keys(card.skill_cooldowns)) {
      if (card.skill_cooldowns[skillId] > 0) {
        card.skill_cooldowns[skillId]--;
      }
    }
    // Tick buff/debuff durations
    card.buffs = card.buffs.filter((b) => {
      b.remaining_turns--;
      return b.remaining_turns > 0;
    });
    card.debuffs = card.debuffs.filter((d) => {
      d.remaining_turns--;
      return d.remaining_turns > 0;
    });
  }
}

function checkKOs(
  agent: BattleAgentState,
  turn: number,
  timestamp: string,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  const activeCard = getActiveCard(agent);

  if (activeCard.current_hp <= 0) {
    activeCard.is_active = false;
    events.push({
      type: "card_defeated",
      turn,
      timestamp,
      agent_id: agent.agent_id,
      card_id: activeCard.card.id,
      message: `${activeCard.card.name} has been defeated!`,
    });

    // Auto-swap to next alive card
    const nextIdx = agent.cards.findIndex((c) => c.current_hp > 0);
    if (nextIdx !== -1) {
      agent.active_card_index = nextIdx;
      agent.cards[nextIdx].is_active = true;
      events.push({
        type: "card_swapped",
        turn,
        timestamp,
        agent_id: agent.agent_id,
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
