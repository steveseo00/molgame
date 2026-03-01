export default function DashboardMarketPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Market</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
          <h2 className="font-bold mb-3">Incoming Trade Offers</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            No pending trade offers
          </p>
        </div>

        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-4">
          <h2 className="font-bold mb-3">My Auctions</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            No active auctions
          </p>
        </div>
      </div>
    </div>
  );
}
