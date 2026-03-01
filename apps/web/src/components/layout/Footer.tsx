export function Footer() {
  return (
    <footer className="border-t border-white/10 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-secondary)]">
        <div>Agent Card Battle</div>
        <div className="flex gap-4">
          <span>API Docs</span>
          <span>GitHub</span>
          <span>Discord</span>
        </div>
      </div>
    </footer>
  );
}
