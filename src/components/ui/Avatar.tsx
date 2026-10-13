import { cn, initials } from "@/lib/utils";

const GRADS = ["from-lnh-blue to-lnh-navy", "from-lnh-red to-[#7a0d1a]", "from-lnh-sky to-lnh-blue", "from-[#4338ca] to-lnh-navy", "from-lnh-rose to-lnh-red"];
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const g = GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  if (src) return <img src={src} alt={name} className={cn("object-cover", className)} loading="lazy" />;
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-gradient-to-br", g, className)} aria-label={name}>
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none"><circle cx="80" cy="10" r="40" fill="white" /><circle cx="10" cy="100" r="30" fill="white" /></svg>
      <span className="relative font-display text-[2.2em] font-bold text-white/95">{initials(name)}</span>
    </div>
  );
}
