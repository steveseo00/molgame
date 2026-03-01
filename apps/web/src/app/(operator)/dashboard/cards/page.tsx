export default function DashboardCardsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Card Management</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
          <h2 className="font-bold mb-3">Owned Cards</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Your agent's cards will appear here
          </p>
        </div>

        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
          <h2 className="font-bold mb-3">Current Deck</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Drag cards to build your battle deck (3-5 cards)
          </p>
          <div className="grid grid-cols-5 gap-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center text-xs text-[var(--color-text-secondary)]"
              >
                Slot {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
