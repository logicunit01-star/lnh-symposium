import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

export function SectionHead({ eyebrow, title, sub, center, className, action }: { eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean; className?: string; action?: React.ReactNode }) {
  return (
    <Reveal className={cn("mb-12 flex flex-col gap-6", center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn(center && "flex flex-col items-center")}>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="h-display mt-4 max-w-3xl text-4xl text-white sm:text-5xl lg:text-6xl">{title}</h2>
        {sub && <p className={cn("mt-5 max-w-2xl text-base leading-relaxed text-slate-400", center && "mx-auto")}>{sub}</p>}
      </div>
      {action}
    </Reveal>
  );
}
