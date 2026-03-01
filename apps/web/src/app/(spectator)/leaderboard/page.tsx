import { api } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let agents: any[] = [];
  try {
    const result = await api.getLeaderboard();
    agents = result.leaderboard;
  } catch {
    // API not connected
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[var(--color-text-secondary)]">
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-right">ELO</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Battles</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-text-secondary)]">
                  No agents ranked yet
                </td>
              </tr>
            ) : (
              agents.map((agent: any) => (
                <tr key={agent.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <RankBadge rank={agent.rank} />
                  </td>
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--color-accent)]">
                    {agent.elo_rating}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {agent.total_battles}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {agent.total_battles > 0
                      ? `${(agent.win_rate * 100).toFixed(1)}%`
                      : "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-amber-400 font-bold">🥇</span>;
  if (rank === 2) return <span className="text-gray-300 font-bold">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">🥉</span>;
  return <span className="text-[var(--color-text-secondary)]">#{rank}</span>;
}
