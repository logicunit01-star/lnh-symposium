import Link from "next/link";

/**
 * Official LNH logo (from the 9th LNH Symposium poster). Light and dark variants swap with the site theme.
 * - "header": the LNH logo as provided (homepage changes 11.11.2026), night version with white text and red crescent
 * - "full": complete hospital logo (footer)
 */
export function Logo({ variant = "full" }: { year?: number; variant?: "header" | "full" }) {
  if (variant === "header") {
    // Homepage changes (11.11.2026): the LNH logo as provided; night mode uses a version with white text and the red crescent
    return (
      <Link href="/" className="group flex min-w-0 shrink-0 items-center" aria-label="9th LNH Symposium, Liaquat National Hospital: home">
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/lnh-logo-2027.png" alt="Liaquat National Hospital" width={527} height={78} className="theme-light-only h-9 w-auto max-w-[58vw] object-contain object-left sm:h-11 lg:h-8 xl:h-12" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/lnh-logo-2027-night.png" alt="" aria-hidden="true" width={527} height={78} className="theme-dark-only h-9 w-auto max-w-[58vw] object-contain object-left sm:h-11 lg:h-8 xl:h-12" />
        </>
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
