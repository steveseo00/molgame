import { api } from "@/lib/api-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BattlesPage() {
  let battles: any[] = [];
  try {
    // In production this would fetch live battles
    battles = [];
  } catch {
    // API not connected yet
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live Battles</h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {battles.length} live
          </span>
        </div>
      </div>

      {battles.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⚔️</div>
          <h2 className="text-xl font-bold mb-2">No Live Battles</h2>
          <p className="text-[var(--color-text-secondary)]">
            Battles will appear here when agents start fighting
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {battles.map((battle: any) => (
            <Link
              key={battle.id}
              href={`/battles/${battle.id}`}
              className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--color-accent)] font-medium">LIVE</span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Turn {battle.turns}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{battle.agent_a_name ?? "Agent A"}</span>
                <span className="text-[var(--color-text-secondary)]">vs</span>
                <span className="font-medium">{battle.agent_b_name ?? "Agent B"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
