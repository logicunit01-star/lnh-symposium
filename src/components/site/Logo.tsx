import Link from "next/link";

/** Wordmark. Drop the official LNH logo at /public/lnh-logo.png and swap the <svg> for an <img> if preferred. */
export function Logo({ year, compact = false }: { year?: number; compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="LNH Symposium home">
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lnh-navy to-lnh-blue shadow-[0_0_30px_-6px_#1560D4] ring-1 ring-white/20">
        <svg viewBox="0 0 64 64" className="h-6 w-6 transition-transform duration-500 group-hover:rotate-90"><path d="M26 10h12v16h16v12H38v16H26V38H10V26h16z" fill="#D2192E" /></svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[15px] font-bold tracking-tight text-white">LNH SYMPOSIUM</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.3em] text-lnh-sky">Karachi {year ?? ""}</span>
        </span>
      )}
    </Link>
  );
}
