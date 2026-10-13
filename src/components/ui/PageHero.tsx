export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: React.ReactNode; sub?: string; children?: React.ReactNode }) {
  return (
    <section className="noise relative overflow-hidden pb-16 pt-40 sm:pt-44">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="orb -left-20 -top-20 h-[420px] w-[420px] bg-lnh-blue/30" />
      <div className="orb right-0 top-10 h-[320px] w-[320px] bg-lnh-red/20 [animation-delay:-5s]" />
      <div className="container-x relative">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="h-display mt-5 max-w-5xl text-5xl text-white sm:text-6xl lg:text-7xl">{title}</h1>
        {sub && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{sub}</p>}
        {children}
      </div>
    </section>
  );
}
