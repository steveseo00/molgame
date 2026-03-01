"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthContext, getStoredToken, getStoredOperator, clearAuth, type StoredOperator } from "@/lib/auth";

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
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [operator, setOperator] = useState<StoredOperator | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getStoredToken();
    const o = getStoredOperator();
    setToken(t);
    setOperator(o);
    setReady(true);

    // Don't redirect if already on login page
    if (!t && !pathname.startsWith("/login")) {
      router.replace("/login");
    }
  }, [pathname, router]);

  function handleLogout() {
    clearAuth();
    setToken(null);
    setOperator(null);
    router.replace("/login");
  }

  // Show nothing while checking auth
  if (!ready) return null;

  // Login page doesn't need sidebar
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  // Not authed and not on login — redirect is pending
  if (!token) return null;

  return (
    <AuthContext.Provider value={{ token, operator, logout: handleLogout }}>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-white/10 bg-[var(--color-bg-secondary)] hidden md:flex md:flex-col">
          <div className="p-4 border-b border-white/10">
            <Link href="/" className="text-lg font-bold text-[var(--color-accent)]">
              ACB
            </Link>
            <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">Operator Dashboard</div>
          </div>
          <nav className="p-2 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? "text-white bg-white/10"
                    : "text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {/* Operator info + Logout */}
          <div className="p-3 border-t border-white/10">
            <div className="text-sm text-white truncate">{operator?.display_name ?? operator?.email}</div>
            <div className="text-xs text-[var(--color-text-secondary)] truncate">{operator?.email}</div>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </AuthContext.Provider>
  );
}
