"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { BattleState, BattleEvent } from "@molgame/shared";
import { ELEMENT_ICONS } from "@molgame/shared";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface BattleViewerProps {
  battleId: string;
  initialState: BattleState | null;
}

export function BattleViewer({ battleId, initialState }: BattleViewerProps) {
  const [state, setState] = useState<BattleState | null>(initialState);
  const prevTurnRef = useRef(initialState?.turn ?? 0);

  // Poll for updates when battle is active
  useEffect(() => {
    if (!state || state.status !== "active") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/battle/${battleId}`);
        if (!res.ok) return;
        const data = await res.json();
        // Normalize DB row format
        let updated = data;
        if (updated.battle_state && !updated.battle_id) {
          updated = {
            ...updated.battle_state,
            battle_log: updated.battle_log ?? updated.battle_state.battle_log ?? [],
          };
        }
        setState(updated);
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [battleId, state?.status]);

  // Group battle_log events by turn
  const turnGroups = useMemo(() => {
    if (!state) return [];
    const groups: { turn: number; events: BattleEvent[] }[] = [];
    let current: { turn: number; events: BattleEvent[] } | null = null;

    for (const event of state.battle_log) {
      if (event.type === "turn_start" || (current === null && event.type === "battle_start")) {
        if (current) groups.push(current);
        current = { turn: event.turn, events: [event] };
      } else if (current) {
        current.events.push(event);
      } else {
        // Events before any turn_start (like battle_start)
        current = { turn: event.turn, events: [event] };
      }
    }
    if (current) groups.push(current);
    return groups;
  }, [state]);

  const maxTurn = turnGroups.length;
  const [visibleTurn, setVisibleTurn] = useState(maxTurn); // show all by default

  // Auto-advance visibleTurn when new turns arrive during active battle
  useEffect(() => {
    if (state && state.status === "active" && state.turn > prevTurnRef.current) {
      setVisibleTurn(maxTurn);
    }
    prevTurnRef.current = state?.turn ?? 0;
  }, [state?.turn, state?.status, maxTurn]);

  // When battle finishes, show all turns
  useEffect(() => {
    if (state?.status === "finished") {
      setVisibleTurn(maxTurn);
    }
  }, [state?.status, maxTurn]);

  const visibleEvents = useMemo(() => {
    return turnGroups.slice(0, visibleTurn).flatMap((g) => g.events);
  }, [turnGroups, visibleTurn]);

  // Find the card state at a given point by replaying events
  // For simplicity, we reconstruct from the final state + events
  // We show the final state cards but only display log up to visibleTurn
  const currentTurnLabel = visibleTurn === 0 ? "Start" : `Turn ${turnGroups[visibleTurn - 1]?.turn ?? 0}`;

  const handlePrev = useCallback(() => {
    setVisibleTurn((t) => Math.max(0, t - 1));
  }, []);

  const handleNext = useCallback(() => {
    setVisibleTurn((t) => Math.min(maxTurn, t + 1));
  }, [maxTurn]);

  const handleFirst = useCallback(() => {
    setVisibleTurn(0);
  }, []);

  const handleLast = useCallback(() => {
    setVisibleTurn(maxTurn);
  }, [maxTurn]);

  if (!state) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-secondary)]">Loading battle...</p>
      </div>
    );
  }

  const cardA = state.agent_a.cards[state.agent_a.active_card_index];
  const cardB = state.agent_b.cards[state.agent_b.active_card_index];
  const isFinished = state.status === "finished";
  const isPractice = state.mode === "practice";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/battles"
        className="inline-block mb-4 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
      >
        {"<-"} Back to Battles
      </Link>

      {/* Battle header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {isPractice && (
            <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
              PRACTICE
            </Badge>
          )}
          <Badge variant={state.status === "active" ? "element" : "default"} element="fire">
            {state.status === "active" ? "LIVE" : state.status.toUpperCase()}
          </Badge>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {state.turn} turns | {state.mode}
          </span>
        </div>
        {state.started_at && (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {new Date(state.started_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
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
      {isFinished && state.winner_id && (
        <div className="text-center py-4 mb-6 rounded-xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40">
          <span className="text-lg font-bold">
            {"🏆"}{" "}
            {state.winner_id === state.agent_a.agent_id
              ? state.agent_a.agent_name
              : state.agent_b.agent_name}{" "}
            Wins!
          </span>
        </div>
      )}

      {/* Turn-by-turn replay controls */}
      {isFinished && maxTurn > 0 && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={handleFirst}
            disabled={visibleTurn === 0}
            className="px-2 py-1 rounded text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {"<<"}
          </button>
          <button
            onClick={handlePrev}
            disabled={visibleTurn === 0}
            className="px-3 py-1 rounded text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {"< Prev"}
          </button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentTurnLabel}
          </span>
          <button
            onClick={handleNext}
            disabled={visibleTurn === maxTurn}
            className="px-3 py-1 rounded text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {"Next >"}
          </button>
          <button
            onClick={handleLast}
            disabled={visibleTurn === maxTurn}
            className="px-2 py-1 rounded text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {">>"}
          </button>
        </div>
      )}

      {/* Battle log */}
      <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Battle Log</h3>
          {isFinished && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              Showing {visibleTurn} of {maxTurn} turns
            </span>
          )}
          {state.status === "active" && (
            <span className="text-xs text-[var(--color-text-secondary)] animate-pulse">
              Live updating...
            </span>
          )}
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto text-sm">
          {visibleEvents.length === 0 ? (
            <div className="text-[var(--color-text-secondary)] text-center py-4">
              {isFinished
                ? "Press Next to step through the battle turn by turn"
                : "Waiting for battle actions..."}
            </div>
          ) : (
            visibleEvents.map((event, i) => (
              <BattleLogEntry key={i} event={event} />
            ))
          )}
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
    turn_start: "text-white/40 border-t border-white/5 pt-2 mt-1",
    turn_end: "text-white/30",
  };

  return (
    <div className={cn("py-0.5", colors[event.type] ?? "text-[var(--color-text-secondary)]")}>
      <span className="text-[10px] opacity-50 mr-2">T{event.turn}</span>
      {event.message}
    </div>
  );
}
