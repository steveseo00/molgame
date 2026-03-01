export default function DashboardBattlesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Battle History</h1>

      <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[var(--color-text-secondary)]">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Opponent</th>
              <th className="px-4 py-3 text-left">Mode</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3 text-right">ELO Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-text-secondary)]">
                No battle history yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
