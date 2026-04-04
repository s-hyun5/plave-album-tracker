"use client";

export default function Nav() {
  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
        <span className="text-base font-bold tracking-tight">
          <span className="text-accent">PLAVE</span>
          <span className="text-muted ml-2 font-normal text-sm">Caligo Pt.2 Tracker</span>
        </span>
        <a href="https://x.com/ari4plv" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted hover:text-foreground transition-colors">문의 @ari4plv</a>
      </div>
    </nav>
  );
}
