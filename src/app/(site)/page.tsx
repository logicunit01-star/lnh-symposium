import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, BrainCircuit, CalendarDays, FileText, MapPin, Network, Play, Sparkles, Wrench } from "lucide-react";
import { getEvent, isEarlyBird, eventDays, eventDaysLabel, DAY_THEMES } from "@/lib/event";
import { getProgramme, getSpeakers, seatsTaken } from "@/lib/queries";
import { toWorkshopDTO } from "@/lib/workshops";
import { fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";
import { Countdown } from "@/components/ui/Countdown";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { Avatar } from "@/components/ui/Avatar";
import { NeuralField } from "@/components/ui/NeuralField";
import { HeroCore } from "@/components/ui/HeroCore";
import { WorkshopCard } from "@/components/site/WorkshopCard";

const youtubeId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1];

export default async function Home() {
  const [ev, programme, speakers, taken] = await Promise.all([getEvent(), getProgramme(), getSpeakers(), seatsTaken()]);
  const early = isEarlyBird(ev);
  const days = eventDays(ev);
  const workshops = programme.filter((s) => s.type === "WORKSHOP");
  const featured = speakers.filter((s) => s.featured).slice(0, 6);
  const wsFirst = workshops[0]?.startsAt, wsLast = workshops.at(-1)?.startsAt;
  const [mainA, mainB] = ev.mainTheme.includes(":") ? ev.mainTheme.split(/:\s*/) : [ev.mainTheme, ""];

  const pillars = [
    { day: 1, I: BrainCircuit, name: "Artificial Intelligence", short: "AI", tone: "from-lnh-sky/25", accent: "text-lnh-sky",
      text: "Clinical decision support, AI imaging, predictive early warning and the governance that makes algorithms safe at the bedside." },
    { day: 2, I: Bot, name: "Robotics", short: "Robotics", tone: "from-lnh-red/25", accent: "text-lnh-rose",
      text: "Robotic surgery, automation in pharmacy and labs, simulation-based training — and the economics of buying a robot." },
    { day: 3, I: Network, name: "Digitization", short: "Digitization", tone: "from-lnh-blue/35", accent: "text-lnh-blue",
      text: "Electronic records, telemedicine, interoperability and data-driven quality — building the digital hospital." },
  ];
  const keyDates = [
    ev.abstractOpen && { d: ev.abstractOpen, t: "Abstract submission opens" },
    ev.abstractDeadline && { d: ev.abstractDeadline, t: "Abstract submission deadline" },
    ev.earlyBirdUntil && { d: ev.earlyBirdUntil, t: "Early-bird registration ends" },
    wsFirst && { d: wsFirst, t: "Pre-conference workshops begin" },
    { d: days[0], t: "Symposium Day 1" },
  ].filter(Boolean).sort((a: any, b: any) => +new Date(a.d) - +new Date(b.d)) as { d: Date; t: string }[];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="noise relative flex min-h-[100svh] items-center overflow-hidden pt-28">
        {ev.heroVideoUrl && (
          <>
            <video className="absolute inset-0 h-full w-full object-cover opacity-30" src={ev.heroVideoUrl} autoPlay muted loop playsInline />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink" />
          </>
        )}
        <div className="circuit absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]" />
        <NeuralField />
        <div className="orb -left-40 top-0 h-[560px] w-[560px] bg-lnh-blue/35" />
        <div className="orb -right-24 bottom-0 h-[460px] w-[460px] bg-lnh-red/25 [animation-delay:-4s]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 animate-scan bg-gradient-to-b from-transparent via-lnh-sky/[0.04] to-transparent" />

        <div className="container-x relative z-10 grid items-center gap-10 py-16 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-lnh-red px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_24px_-4px_#D2192E]">{ev.edition} Edition</span>
                <span className="chip gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{eventDaysLabel(ev, "short")}</span>
                <span className="chip gap-1.5"><MapPin className="h-3.5 w-3.5" />LNH, Karachi</span>
                <span className="chip gap-1.5 border-emerald-400/30 text-emerald-300"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-emerald-400" />{ev.registrationOpen ? "Registration open" : "Registration closed"}</span>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="mono mt-8 text-xs uppercase tracking-[0.35em] text-lnh-sky">{ev.name} · {mainA}</p>
              <h1 className="h-display mt-4 text-[12vw] leading-[0.9] text-white sm:text-[8.5vw] lg:text-[6.4rem]">
                <span className="block">Shaping the</span>
                <span className="text-holo block">new era</span>
                <span className="block">of healthcare</span>
              </h1>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-7 flex flex-wrap gap-2">
                {pillars.map(({ I, short, accent }) => (
                  <span key={short} className="hud flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold text-white"><I className={`h-4 w-4 ${accent}`} />{short}</span>
                ))}
              </div>
              <p className="mt-6 max-w-xl text-lg text-slate-300"><span className="font-semibold text-white">{ev.theme}.</span> {mainB ? `${mainB}. ` : ""}{ev.tagline}</p>
            </Reveal>
            <Reveal delay={320} className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-8 py-4 text-base">Register Now <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/agenda" className="btn-ghost px-7 py-4 text-base">View Agenda</Link>
              <Link href="/speakers" className="btn-ghost px-7 py-4 text-base">Explore Speakers</Link>
            </Reveal>
            <Reveal delay={420} className="mt-12">
              <p className="mono mb-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">T-minus to Day 1 · {fmtDate(days[0], { weekday: "long", day: "numeric", month: "long" })}</p>
              <Countdown to={days[0].toISOString()} />
            </Reveal>
          </div>
          <Reveal delay={200} className="relative hidden lg:block">
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <HeroCore className="h-full w-full" />
              <div className="hud mono absolute -left-4 top-10 px-4 py-3 text-[11px] text-slate-300"><p className="text-lnh-sky">AI_MODULE</p><p>Diagnostics · Decision support</p></div>
              <div className="hud mono absolute -right-2 top-1/2 px-4 py-3 text-[11px] text-slate-300"><p className="text-lnh-rose">ROBOTICS_LAB</p><p>Surgery · Simulation</p></div>
              <div className="hud mono absolute bottom-6 left-10 px-4 py-3 text-[11px] text-slate-300"><p className="text-white">DIGITAL_CARE</p><p>EHR · Telemedicine · Data</p></div>
            </div>
          </Reveal>
        </div>
        <div className="mono absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-slate-500 sm:block">Scroll ↓</div>
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="relative -mx-4 -rotate-1 overflow-hidden border-y border-white/10 bg-gradient-to-r from-lnh-red via-[#b3122a] to-lnh-red py-5">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["AI Diagnostics", "Robotic Surgery", "Digital Hospitals", "Telemedicine", "Predictive Care", "Smart ICUs", "Data Governance", "Value-Based Care"].map((w) => (
              <span key={w + k} className="flex items-center gap-10">{w}<Sparkles className="h-6 w-6 text-white/60" /></span>
            ))
          )}
        </div>
      </section>

      {/* ================= PILLARS ================= */}
      <section className="circuit relative py-28">
        <div className="container-x">
          <SectionHead eyebrow="Three days · three frontiers" title={<>One theme. <span className="text-holo">Three frontiers.</span></>}
            sub={`The ${ev.theme.toLowerCase().replace("healthcare conundrum: ", "healthcare conundrum — ")} — explored through the technologies reshaping how hospitals diagnose, operate and deliver care.`}
            action={<Link href="/about" className="btn-ghost shrink-0">Learn more <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="grid gap-4 lg:grid-cols-3">
            {pillars.map(({ day, I, name, tone, accent, text }, i) => {
              const d = days[day - 1];
              const count = programme.filter((p) => p.day === day && !["BREAK", "CEREMONY"].includes(p.type)).length;
              return (
                <Reveal key={name} delay={i * 120}>
                  <Link href="/agenda" className={`hud group relative block h-full overflow-hidden bg-gradient-to-br ${tone} to-transparent p-8 transition duration-500 hover:-translate-y-1`}>
                    <span className="corner left-4 top-4 border-l border-t" /><span className="corner bottom-4 right-4 border-b border-r" />
                    <div className="flex items-start justify-between">
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink/60 ring-1 ring-white/15"><I className={`h-7 w-7 ${accent}`} /></span>
                      <div className="mono text-right text-[11px] uppercase tracking-widest text-slate-400">
                        <p>Day {day}</p>
                        {d && <p className="font-display text-2xl font-bold normal-case tracking-tight text-white">{fmtDate(d, { day: "numeric", month: "short" })}</p>}
                      </div>
                    </div>
                    <h3 className="h-display mt-10 text-4xl text-white">{name}</h3>
                    <p className="mt-3 text-slate-300">{text}</p>
                    <p className="mono mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">{count} sessions <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= JOURNEY TIMELINE ================= */}
      <section className="container-x pb-28">
        <Reveal className="hud relative overflow-hidden p-8 sm:p-10">
          <NeuralField density={0.35} interactive={false} className="opacity-60" />
          <p className="eyebrow relative">The road to the symposium</p>
          <ol className="relative mt-10 grid gap-8 md:grid-cols-4">
            <span className="absolute left-0 right-0 top-[11px] hidden h-px bg-gradient-to-r from-lnh-gold via-lnh-sky to-lnh-red md:block" />
            {[
              { k: "Pre-conference", t: "Workshops", d: wsFirst && wsLast ? `${fmtDate(wsFirst, { day: "numeric", month: "short" })} – ${fmtDate(wsLast, { day: "numeric", month: "short" })}` : "To be announced", I: Wrench, c: "bg-lnh-gold", href: "/workshops" },
              ...days.slice(0, 3).map((d, i) => ({ k: `Day ${i + 1}`, t: DAY_THEMES[i + 1] ?? "Symposium", d: fmtDate(d, { weekday: "short", day: "numeric", month: "short" }), I: [BrainCircuit, Bot, Network][i] ?? Sparkles, c: ["bg-lnh-sky", "bg-lnh-rose", "bg-lnh-blue"][i] ?? "bg-white", href: "/agenda" })),
            ].map(({ k, t, d, I, c, href }) => (
              <li key={k} className="relative">
                <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full ${c} shadow-[0_0_18px_currentColor] ring-4 ring-ink`}><span className="h-2 w-2 rounded-full bg-white" /></span>
                <p className="mono mt-4 text-[11px] uppercase tracking-[0.25em] text-slate-400">{k}</p>
                <Link href={href} className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-white hover:text-lnh-sky"><I className="h-5 w-5" />{t}</Link>
                <p className="mt-1 text-sm text-slate-300">{d}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ================= STATS ================= */}
      <section className="container-x pb-28">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {[
            [String(days.length), "Symposium days"],
            [String(workshops.length), "Pre-conference workshops"],
            [`${speakers.length}+`, "Expert speakers"],
            [String(programme.filter((p) => !["BREAK", "CEREMONY", "WORKSHOP"].includes(p.type)).length), "Keynotes, plenaries & panels"],
          ].map(([n, l], i) => (
            <Reveal key={l} delay={i * 100} className="bg-ink p-8 sm:p-10">
              <p className="h-display text-5xl text-white sm:text-7xl">{n}</p>
              <p className="mono mt-3 text-[11px] uppercase tracking-[0.25em] text-slate-400">{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= WORKSHOPS ================= */}
      <section className="relative overflow-hidden border-y border-white/10 bg-ink-800/50 py-28">
        <div className="circuit absolute inset-0 opacity-60" />
        <div className="container-x relative">
          <SectionHead eyebrow="Pre-conference · limited seats" title={<>Hands-on <span className="text-holo">workshops</span></>}
            sub="Simulation labs, AI tools and skills stations. Tick several workshops across weeks, then check out once."
            action={<Link href="/workshops" className="btn-blue shrink-0">Open workshop portal <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workshops.slice(0, 3).map((w, i) => (
              <Reveal key={w.id} delay={i * 100}><WorkshopCard w={toWorkshopDTO(w, taken, early)} compact /></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SPEAKERS ================= */}
      <section className="container-x py-28">
        <SectionHead eyebrow="Featured speakers" title={<>Voices of the <span className="text-grad-red">new era</span></>}
          action={<Link href="/speakers" className="btn-ghost shrink-0">All speakers <ArrowRight className="h-4 w-4" /></Link>} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {featured.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 100}>
              <a href={s.linkedin || "/speakers"} target={s.linkedin ? "_blank" : undefined} rel="noreferrer" className="group relative block overflow-hidden rounded-3xl border border-white/10">
                <Avatar name={s.name} src={s.photoUrl} className="aspect-[4/5] w-full text-[24px] transition duration-700 group-hover:scale-105 sm:text-[40px]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="mono text-[10px] uppercase tracking-[0.2em] text-lnh-sky">{s.institution}</p>
                  <p className="mt-1 font-display text-lg font-bold text-white sm:text-2xl">{s.title} {s.name}</p>
                  <p className="mt-1 hidden text-sm text-slate-300 sm:block">{s.topic}</p>
                </div>
                <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= AGENDA PREVIEW ================= */}
      <section className="relative overflow-hidden border-y border-white/10 py-28">
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="container-x relative">
          <SectionHead eyebrow="At a glance" title={<>Three days on <span className="text-holo">the frontier</span></>}
            action={<Link href="/agenda" className="btn-blue shrink-0">Full agenda <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((d, i) => {
              const items = programme.filter((p) => p.day === d && p.type !== "BREAK");
              const date = days[d - 1];
              return (
                <Reveal key={d} delay={i * 120}>
                  <div className="hud h-full p-7">
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-5">
                      <div>
                        <p className="mono text-[11px] uppercase tracking-[0.25em] text-slate-400">Day {d}</p>
                        <p className="h-display mt-2 text-3xl text-white">{DAY_THEMES[d]}</p>
                      </div>
                      {date && <p className="text-right font-display text-sm text-lnh-sky">{fmtDate(date, { weekday: "short" })}<br /><span className="text-2xl font-bold text-white">{fmtDate(date, { day: "2-digit", month: "short" })}</span></p>}
                    </div>
                    <ul className="mt-5 space-y-4">
                      {items.slice(0, 6).map((p) => (
                        <li key={p.id} className="flex gap-4">
                          <span className="mono w-16 shrink-0 pt-0.5 text-xs text-slate-500">{fmtTime(p.startsAt)}</span>
                          <div><p className="text-sm font-medium leading-snug text-white">{p.title}</p><p className="text-[11px] uppercase tracking-wider text-slate-500">{SESSION_TYPE_LABEL[p.type]}{p.hall ? ` · ${p.hall}` : ""}</p></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= VIDEOS ================= */}
      <section className="container-x py-28">
        <SectionHead eyebrow="Watch" title={<>Moments from <span className="text-holo">past editions</span></>} />
        <div className="grid gap-4 md:grid-cols-3">
          {(ev.videos.length ? ev.videos : [null, null, null]).slice(0, 3).map((v, i) => {
            const id = v && youtubeId(v);
            return (
              <Reveal key={i} delay={i * 100} className={i === 0 ? "md:col-span-2 md:row-span-2" : ""}>
                {id ? (
                  <div className="overflow-hidden rounded-3xl border border-white/10"><iframe className="aspect-video h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title={`Symposium video ${i + 1}`} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
                ) : (
                  <a href={ev.youtube || "#"} target="_blank" rel="noreferrer" className="group relative grid aspect-video place-items-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-lnh-navy via-ink-700 to-[#3a0a12]">
                    <div className="circuit absolute inset-0" />
                    <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur transition group-hover:scale-110 group-hover:bg-lnh-red"><Play className="ml-1 h-8 w-8 fill-white text-white" /></span>
                    <span className="absolute bottom-5 left-6 text-sm font-medium text-slate-300">{["Highlights reel", "Keynote recap", "Workshop moments"][i]} — video coming soon</span>
                  </a>
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ================= ABSTRACTS + KEY DATES ================= */}
      <section className="container-x">
        <div className="grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="hud relative h-full overflow-hidden p-8 sm:p-12">
              <div className="orb -bottom-24 -left-10 h-80 w-80 bg-lnh-blue/30" />
              <FileText className="relative h-8 w-8 text-lnh-sky" />
              <h3 className="h-display relative mt-6 text-4xl text-white sm:text-5xl">Call for abstracts</h3>
              <p className="relative mt-4 max-w-lg text-slate-300">Share your research on AI, robotics, digitization, cost and quality of care. Selected work is presented as oral papers or posters and competes for the symposium awards.</p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <Link href="/abstracts?type=ORAL" className="btn-primary">Submit scientific paper</Link>
                <Link href="/abstracts?type=POSTER" className="btn-ghost">Submit poster</Link>
              </div>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={120}>
            <div className="hud h-full p-8">
              <p className="eyebrow">Key dates</p>
              <ol className="relative mt-6 space-y-6 border-l border-white/15 pl-6">
                {keyDates.map((k) => {
                  const past = new Date(k.d) < new Date();
                  return (
                    <li key={k.t} className="relative">
                      <span className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-ink ${past ? "bg-slate-600" : "bg-lnh-red shadow-[0_0_14px_#D2192E]"}`} />
                      <p className={`font-display text-lg font-bold ${past ? "text-slate-500 line-through" : "text-white"}`}>{fmtDate(k.d)}</p>
                      <p className="text-sm text-slate-400">{k.t}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="container-x pt-28">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-lnh-navy via-lnh-blue to-lnh-navy px-8 py-16 text-center sm:px-16 sm:py-24">
            <NeuralField density={0.5} interactive={false} />
            <div className="orb -right-10 -top-10 h-80 w-80 bg-lnh-red/50" />
            <p className="mono relative text-xs uppercase tracking-[0.3em] text-white/70">{early ? "Early-bird rates available" : "Registration open"}</p>
            <h2 className="h-display relative mx-auto mt-5 max-w-4xl text-5xl text-white sm:text-7xl">Be part of the new era</h2>
            <p className="relative mx-auto mt-5 max-w-xl text-white/80">One account, one cart: pick your sessions and workshops, pay securely, and get your QR pass by email and SMS.</p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-light px-8 py-4 text-base">Register Now <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/workshops" className="btn-ghost px-8 py-4 text-base">Browse workshops</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
