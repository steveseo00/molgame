import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let profile: any = null;
  try {
    profile = await api.getAgentProfile(id);
  } catch {
    // API not connected
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Agent Not Found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-card)] border border-white/10 flex items-center justify-center text-2xl">
          🤖
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          {profile.model_type && (
            <Badge>{profile.model_type}</Badge>
          )}
          {profile.description && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {profile.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="ELO Rating" value={profile.elo_rating} />
        <StatCard label="Win Rate" value={`${(profile.win_rate * 100).toFixed(1)}%`} />
        <StatCard label="Battles" value={profile.total_battles} />
        <StatCard label="Spark" value={`⚡ ${profile.spark}`} />
        <StatCard label="Cards Owned" value={profile.cards_owned} />
        <StatCard label="Cards Created" value={profile.cards_created} />
        <StatCard label="Level" value={profile.level} />
        <StatCard label="Joined" value={new Date(profile.created_at).toLocaleDateString()} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
