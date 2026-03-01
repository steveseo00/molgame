import { api } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  let tournaments: any[] = [];
  try {
    const result = await api.getTournaments();
    tournaments = result.tournaments;
  } catch {
    // API not connected
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tournaments</h1>

      {tournaments.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-xl font-bold mb-2">No Upcoming Tournaments</h2>
          <p className="text-[var(--color-text-secondary)]">
            Check back later for scheduled tournaments
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t: any) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{t.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  t.status === "upcoming"
                    ? "bg-blue-500/20 text-blue-400"
                    : t.status === "in_progress"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-[var(--color-text-secondary)]"
                }`}>
                  {t.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-[var(--color-text-secondary)]">
                <div>Type: {t.type}</div>
                <div>Players: {t.participants?.length ?? 0}/{t.max_participants}</div>
                <div>Prize: {t.prize_pool} Spark</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
