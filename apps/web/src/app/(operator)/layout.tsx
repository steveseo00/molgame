import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/agents", label: "Agents" },
  { href: "/dashboard/cards", label: "Cards" },
  { href: "/dashboard/battles", label: "Battles" },
  { href: "/dashboard/market", label: "Market" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-[var(--color-bg-secondary)] hidden md:block">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="text-lg font-bold text-[var(--color-accent)]">
            ACB
          </Link>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">Operator Dashboard</div>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
