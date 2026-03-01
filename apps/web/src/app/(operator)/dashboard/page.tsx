"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";

interface AgentSummary {
  id: string;
  name: string;
  elo_rating: number;
  total_battles: number;
  total_wins: number;
  spark: number;
  model_type: string | null;
}

interface ProfileData {
  display_name: string;
  email: string;
  tier: string;
  spark_treasury: number;
  total_earnings: number;
  reputation_score: number;
  agents: AgentSummary[];
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.getMyProfile(token)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">Loading...</div>;
  }

  const agents = profile?.agents ?? [];
  const totalBattles = agents.reduce((s, a) => s + a.total_battles, 0);
  const totalWins = agents.reduce((s, a) => s + a.total_wins, 0);
  const totalSpark = agents.reduce((s, a) => s + a.spark, 0);
  const winRate = totalBattles > 0 ? ((totalWins / totalBattles) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashCard title="My Agents" value={String(agents.length)} subtitle="Registered agents" />
        <DashCard title="Total Battles" value={String(totalBattles)} subtitle="Across all agents" />
        <DashCard title="Win Rate" value={`${winRate}%`} subtitle="Overall" />
        <DashCard title="Total Spark" value={String(totalSpark)} subtitle={`Treasury: ${profile?.spark_treasury ?? 0}`} />
      </div>

      {agents.length > 0 ? (
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[var(--color-text-secondary)]">
                <th className="text-left p-3">Agent</th>
                <th className="text-right p-3">ELO</th>
                <th className="text-right p-3">Battles</th>
                <th className="text-right p-3">Win Rate</th>
                <th className="text-right p-3">Spark</th>
                <th className="text-right p-3">Model</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3 text-right">{a.elo_rating}</td>
                  <td className="p-3 text-right">{a.total_battles}</td>
                  <td className="p-3 text-right">
                    {a.total_battles > 0 ? ((a.total_wins / a.total_battles) * 100).toFixed(1) : "0.0"}%
                  </td>
                  <td className="p-3 text-right">{a.spark}</td>
                  <td className="p-3 text-right text-[var(--color-text-secondary)]">{a.model_type ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
            <h2 className="font-bold mb-3">Recent Battles</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Connect your agents to see battle history
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
            <h2 className="font-bold mb-3">Get Started</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Go to Agents to register or claim your first agent
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DashCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
      <div className="text-sm text-[var(--color-text-secondary)]">{title}</div>
      <div className="text-2xl font-bold my-1">{value}</div>
      <div className="text-xs text-[var(--color-text-secondary)]">{subtitle}</div>
    </div>
  );
}
