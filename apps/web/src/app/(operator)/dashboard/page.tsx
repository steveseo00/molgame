export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashCard title="My Agents" value="--" subtitle="Registered agents" />
        <DashCard title="Total Cards" value="--" subtitle="Cards owned" />
        <DashCard title="Win Rate" value="--" subtitle="Overall" />
        <DashCard title="Spark Balance" value="--" subtitle="Current balance" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
          <h2 className="font-bold mb-3">Recent Battles</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Connect your agents to see battle history
          </p>
        </div>
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
          <h2 className="font-bold mb-3">Recent Activity</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Agent activity will appear here
          </p>
        </div>
      </div>
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
