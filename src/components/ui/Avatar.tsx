import { cn, initials } from "@/lib/utils";

// contrast audit 14 Nov: start colours dark enough for white initials (>= 5:1)
const GRADS = ["from-[#0074A6] to-lnh-navy", "from-lnh-red to-[#7a0d1a]", "from-[#0369A1] to-lnh-navy", "from-[#4338ca] to-lnh-navy", "from-[#C2185B] to-lnh-red"];
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const g = GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  if (src) return <img src={src} alt={name} className={cn("object-cover", className)} loading="lazy" />;
  return (
    <div className={cn("on-dark relative grid place-items-center overflow-hidden bg-gradient-to-br", g, className)} aria-label={name}>
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none"><circle cx="80" cy="10" r="40" fill="white" /><circle cx="10" cy="100" r="30" fill="white" /></svg>
      <span className="relative font-display text-[2.2em] font-bold text-snow">{initials(name)}</span>
    </div>
  );
}
