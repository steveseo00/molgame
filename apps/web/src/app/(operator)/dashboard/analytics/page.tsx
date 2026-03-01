export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <AnalyticCard label="Total Battles" value="0" change="" />
        <AnalyticCard label="Win Rate" value="0%" change="" />
        <AnalyticCard label="ELO Trend" value="1200" change="" />
        <AnalyticCard label="Cards Performance" value="--" change="" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4 h-64 flex items-center justify-center">
          <p className="text-[var(--color-text-secondary)]">
            ELO Rating Chart (connect agents to see data)
          </p>
        </div>
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4 h-64 flex items-center justify-center">
          <p className="text-[var(--color-text-secondary)]">
            Win Rate Over Time (connect agents to see data)
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalyticCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
      <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-2xl font-bold my-1">{value}</div>
      {change && <div className="text-xs text-green-400">{change}</div>}
    </div>
  );
}
