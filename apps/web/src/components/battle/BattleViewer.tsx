"use client";

import { useState } from "react";
import type { BattleState, BattleEvent } from "@molgame/shared";
import { ELEMENT_ICONS } from "@molgame/shared";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

interface BattleViewerProps {
  battleId: string;
  initialState: BattleState | null;
}

export function BattleViewer({ battleId, initialState }: BattleViewerProps) {
  const [state] = useState<BattleState | null>(initialState);

  if (!state) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-secondary)]">Loading battle...</p>
      </div>
    );
  }

  const cardA = state.agent_a.cards[state.agent_a.active_card_index];
  const cardB = state.agent_b.cards[state.agent_b.active_card_index];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Battle header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge variant={state.status === "active" ? "element" : "default"} element="fire">
            {state.status === "active" ? "LIVE" : state.status.toUpperCase()}
          </Badge>
          <span className="text-sm text-[var(--color-text-secondary)]">
            Turn {state.turn}
          </span>
        </div>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {state.mode}
        </span>
      </div>

      {/* Arena */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-6">
        {/* Agent A */}
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">{state.agent_a.agent_name}</h3>
          {cardA && (
            <BattleCard
              name={cardA.card.name}
              element={cardA.card.element}
              hp={cardA.current_hp}
              maxHp={cardA.max_hp}
              atk={cardA.card.stats.atk}
              def={cardA.card.stats.def}
              imageUrl={cardA.card.image_url}
            />
          )}
          <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {state.agent_a.cards_remaining} cards remaining
          </div>
        </div>

        {/* VS */}
        <div className="text-2xl font-bold text-[var(--color-text-secondary)]">
          VS
        </div>

        {/* Agent B */}
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">{state.agent_b.agent_name}</h3>
          {cardB && (
            <BattleCard
              name={cardB.card.name}
              element={cardB.card.element}
              hp={cardB.current_hp}
              maxHp={cardB.max_hp}
              atk={cardB.card.stats.atk}
              def={cardB.card.stats.def}
              imageUrl={cardB.card.image_url}
            />
          )}
          <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {state.agent_b.cards_remaining} cards remaining
          </div>
        </div>
      </div>

      {/* Winner banner */}
      {state.status === "finished" && state.winner_id && (
        <div className="text-center py-4 mb-6 rounded-xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40">
          <span className="text-lg font-bold">
            {state.winner_id === state.agent_a.agent_id
              ? state.agent_a.agent_name
              : state.agent_b.agent_name}{" "}
            Wins!
          </span>
        </div>
      )}

      {/* Battle log */}
      <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
        <h3 className="font-bold mb-3">Battle Log</h3>
        <div className="space-y-1 max-h-80 overflow-y-auto text-sm">
          {state.battle_log.map((event, i) => (
            <BattleLogEntry key={i} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BattleCard({
  name,
  element,
  hp,
  maxHp,
  atk,
  def,
  imageUrl,
}: {
  name: string;
  element: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  imageUrl: string;
}) {
  const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const hpColor =
    hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="inline-block rounded-xl bg-[var(--color-bg-secondary)] border border-white/10 p-3 w-48">
      <div className="h-28 rounded-lg overflow-hidden mb-2">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-bold truncate">{name}</div>
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">
        {ELEMENT_ICONS[element as keyof typeof ELEMENT_ICONS]} {element} | ATK {atk} | DEF {def}
      </div>
      <ProgressBar value={hp} max={maxHp} color={hpColor} className="h-3" showLabel />
    </div>
  );
}

function BattleLogEntry({ event }: { event: BattleEvent }) {
  const colors: Record<string, string> = {
    damage: "text-red-400",
    heal: "text-green-400",
    buff_applied: "text-blue-400",
    debuff_applied: "text-purple-400",
    card_defeated: "text-red-500 font-bold",
    battle_end: "text-[var(--color-accent)] font-bold",
    critical_hit: "text-yellow-400",
  };

  return (
    <div className={cn("py-0.5", colors[event.type] ?? "text-[var(--color-text-secondary)]")}>
      <span className="text-[10px] opacity-50 mr-2">T{event.turn}</span>
      {event.message}
    </div>
  );
}
