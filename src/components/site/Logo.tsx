import Link from "next/link";

/**
 * Official LNH logo (from the 9th LNH Symposium poster). Light and dark variants swap with the site theme.
 * - "header": crescent mark + readable event name (the full logo's subtitle is unreadable at nav size)
 * - "full": complete hospital logo (footer)
 */
export function Logo({ year, variant = "full" }: { year?: number; variant?: "header" | "full" }) {
  if (variant === "header") {
    return (
      <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3" aria-label="9th LNH Symposium home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lnh-mark-light.png" alt="LNH" className="theme-dark-only h-9 w-auto sm:h-10" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lnh-mark.png" alt="LNH" className="theme-light-only h-9 w-auto sm:h-10" />
        <span className="leading-tight">
          <span className="block font-display text-[14px] font-bold tracking-tight text-white sm:text-[15px]">9<sup className="text-[9px]">th</sup> LNH Symposium</span>
          <span className="block text-[11px] font-medium text-slate-400 hidden sm:block lg:hidden xl:block">Liaquat National Hospital{year ? ` · ${year}` : ""}</span>
        </span>
      </Link>
    );
  }
  return (
    <Link href="/" className="group inline-flex items-center" aria-label="9th LNH Symposium home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/lnh-logo-light.png" alt="Liaquat National Hospital" className="theme-dark-only h-10 w-auto" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/lnh-logo.png" alt="Liaquat National Hospital" className="theme-light-only h-10 w-auto" />
    </Link>
  );
}
