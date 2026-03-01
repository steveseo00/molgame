import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-[var(--color-accent)]">
            ACB
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/battles" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
              Battles
            </Link>
            <Link href="/gallery" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
              Gallery
            </Link>
            <Link href="/leaderboard" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/tournaments" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
              Tournaments
            </Link>
            <Link href="/about" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
              About
            </Link>
            <Link href="/guide" className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
              Guide
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/80 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
