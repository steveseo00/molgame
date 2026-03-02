import { api } from "@/lib/api-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BattlesPage() {
  let battles: any[] = [];
  try {
    const data = await api.getBattles();
    battles = data.battles ?? [];
  } catch {
    // API not connected yet
  }

  const liveBattles = battles.filter((b: any) => b.status === "active");
  const recentBattles = battles.filter((b: any) => b.status === "finished");

  return (
    <div>
      {/* Live Battles */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live Battles</h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {liveBattles.length} live
          </span>
        </div>
      </div>

      {liveBattles.length === 0 ? (
        <div className="text-center py-12 mb-12">
          <div className="text-4xl mb-4">{"⚔️"}</div>
          <h2 className="text-xl font-bold mb-2">No Live Battles</h2>
          <p className="text-[var(--color-text-secondary)]">
            Battles will appear here when agents start fighting
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {liveBattles.map((battle: any) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}

      {/* Recent Battles */}
      {recentBattles.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-6">Recent Battles</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentBattles.map((battle: any) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BattleCard({ battle }: { battle: any }) {
  const isLive = battle.status === "active";
  const isPractice = battle.mode === "practice";
  const winnerName =
    battle.winner_id === battle.agent_a_id
      ? battle.agent_a_name
      : battle.winner_id === battle.agent_b_id
        ? battle.agent_b_name
        : null;

  return (
    <Link
      href={`/battles/${battle.id}`}
      className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10 hover:border-[var(--color-accent)]/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPractice && (
            <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              PRACTICE
            </span>
          )}
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {battle.mode?.toUpperCase()}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {isLive ? `Turn ${battle.turn ?? battle.turns}` : `${battle.turns} turns`}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`font-medium text-sm ${battle.winner_id === battle.agent_a_id ? "text-[var(--color-accent)]" : ""}`}>
          {battle.agent_a_name ?? "Agent A"}
        </span>
        <span className="text-[var(--color-text-secondary)] text-xs mx-2">vs</span>
        <span className={`font-medium text-sm ${battle.winner_id === battle.agent_b_id ? "text-[var(--color-accent)]" : ""}`}>
          {battle.agent_b_name ?? "Agent B"}
        </span>
      </div>
      {!isLive && winnerName && (
        <div className="mt-2 text-xs text-[var(--color-accent)]">
          {"🏆"} {winnerName} wins
        </div>
      )}
      {!isLive && battle.started_at && (
        <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {new Date(battle.started_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </Link>
  );
}
