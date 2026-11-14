import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, BrainCircuit, CalendarDays, FileText, Images, MapPin, Network, Play, Sparkles } from "lucide-react";
import { getEvent, isEarlyBird, eventDays, eventDaysLabel, DAY_THEMES, GALLERY_DEFAULT, TICKER_DEFAULT } from "@/lib/event";
import { getProgramme, getSpeakers } from "@/lib/queries";
import { fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";
import { Countdown } from "@/components/ui/Countdown";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { Avatar } from "@/components/ui/Avatar";
import { NeuralField } from "@/components/ui/NeuralField";

const youtubeId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1];

export default async function Home() {
  const [ev, programme, speakers] = await Promise.all([getEvent(), getProgramme(), getSpeakers()]);
  const early = isEarlyBird(ev);
  const days = eventDays(ev);
  const featured = speakers.filter((s) => s.featured).slice(0, 6);
  const [, mainB] = ev.mainTheme.includes(":") ? ev.mainTheme.split(/:\s*/) : [ev.mainTheme, ""];
  const ticker = ev.tickerItems.length ? ev.tickerItems : TICKER_DEFAULT;
  const teaser = ev.videos.map(youtubeId).find(Boolean);

  const pillars = [
    { day: 1, I: BrainCircuit, name: "Artificial Intelligence", short: "AI", tone: "from-lnh-sky/25", accent: "text-lnh-sky",
      text: "Clinical decision support, AI imaging, predictive early warning and the governance that makes algorithms safe at the bedside." },
    { day: 2, I: Bot, name: "Robotics", short: "Robotics", tone: "from-lnh-red/25", accent: "text-lnh-rose",
      text: "Robotic surgery, automation in pharmacy and labs, simulation-based training — and the economics of buying a robot." },
    { day: 3, I: Network, name: "Digitization", short: "Digitization", tone: "from-lnh-blue/35", accent: "text-lnh-blue",
      text: "Electronic records, telemedicine, interoperability and data-driven quality — building the digital hospital." },
  ];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="noise relative flex min-h-[100svh] items-center overflow-hidden pt-[76px]">
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

        <div className="container-x relative z-10 grid items-center gap-8 pt-12 pb-16 lg:grid-cols-[0.85fr_1.4fr]">
          <div>
            <div className="hero-in">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip gap-1.5 border-emerald-400/30 text-emerald-300"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-emerald-400" />{ev.registrationOpen ? "Registration open" : "Registration closed"}</span>
                <span className="chip gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{eventDaysLabel(ev, "short")}</span>
                <span className="chip gap-1.5"><MapPin className="h-3.5 w-3.5" />LNH, Karachi</span>
              </div>
            </div>
            <div className="hero-in" style={{ animationDelay: "120ms" }}>
              {/* homepage changes 11.11.2026: "9th LNH Symposium" in the approved title style */}
              <p className="text-lnh-title mt-8 font-display text-3xl font-bold tracking-tight sm:text-4xl">9<sup className="text-[0.55em]">th</sup> LNH Symposium</p>
              <h1 className="h-display mt-3 text-[12vw] leading-[0.9] text-white sm:text-[8.5vw] lg:text-[5.2rem] xl:text-[5.6rem]">
                <span className="block">Shaping the</span>
                <span className="text-holo block">new era</span>
                <span className="block">of healthcare</span>
              </h1>
            </div>
            <div className="hero-in" style={{ animationDelay: "220ms" }}>
              <div className="mt-7 flex flex-wrap gap-2">
                {pillars.map(({ I, short, accent }) => (
                  <span key={short} className="hud flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold text-white"><I className={`h-4 w-4 ${accent}`} />{short}</span>
                ))}
              </div>
              <p className="mt-6 max-w-xl text-lg text-slate-300"><span className="font-semibold text-white">{mainB || ev.theme}.</span> {ev.tagline}</p>
            </div>
            <div className="hero-in mt-9 flex flex-wrap gap-3" style={{ animationDelay: "320ms" }}>
              <Link href="/register" className="btn-primary px-8 py-4 text-base">Register <ArrowRight className="h-4 w-4" /></Link>
              {/* shown once those pages go live (Event Settings) */}
              {ev.agendaLive && <Link href="/agenda" className="btn-ghost px-7 py-4 text-base">View Agenda</Link>}
              {ev.speakersLive && <Link href="/speakers" className="btn-ghost px-7 py-4 text-base">Explore Speakers</Link>}
            </div>
            <div className="hero-in mt-12" style={{ animationDelay: "420ms" }}>
              <p className="mono mb-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">T-minus to Day 1 · {fmtDate(days[0], { weekday: "long", day: "numeric", month: "long" })}</p>
              <Countdown to={days[0].toISOString()} />
            </div>
          </div>
          <div className="hero-in relative" style={{ animationDelay: "200ms" }}>
            <div className="relative mx-auto w-full max-w-[900px] lg:w-[108%] lg:max-w-none">
              <div className="pointer-events-none absolute inset-x-6 bottom-6 top-1/3 rounded-[50%] bg-lnh-sky/25 blur-3xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/campus-scene.webp" alt="Liaquat National Hospital, Karachi, with robotics and digital health imagery" width={1232} height={560} className="relative w-full drop-shadow-[0_30px_40px_rgba(4,11,30,.45)]" />
            </div>
          </div>
        </div>
        <div className="mono absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-slate-500 sm:block">Scroll ↓</div>
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="relative -mx-4 -rotate-1 overflow-hidden border-y border-white/10 bg-gradient-to-r from-lnh-red via-[#b3122a] to-lnh-red py-5">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            [...ticker, ...ticker].map((w, j) => (
              <span key={`${k}-${j}`} className="flex items-center gap-10">{w}<Sparkles className="h-6 w-6 text-white/60" /></span>
            ))
          )}
        </div>
      </section>

      {/* ================= PILLARS ================= */}
      <section className="circuit relative py-28">
        <div className="container-x">
          <SectionHead eyebrow="Three days · three frontiers" title={<>One theme. <span className="text-holo">Three frontiers.</span></>}
            sub="Shaping the new era of healthcare, explored through the technologies reshaping how hospitals diagnose, operate and deliver care."
            action={<Link href="/about" className="btn-ghost shrink-0">Learn more <ArrowRight className="h-4 w-4" /></Link>} />
          {/* homepage changes 11.11.2026: icons with the heading only (no cards, dates or descriptions) */}
          <div className="grid gap-10 sm:grid-cols-3">
            {pillars.map(({ I, name, accent }, i) => (
              <Reveal key={name} delay={i * 120} className="flex flex-col items-center text-center">
                <span className="grid h-20 w-20 place-items-center rounded-3xl bg-ink/60 ring-1 ring-white/15"><I className={`h-10 w-10 ${accent}`} /></span>
                <h3 className="h-display mt-6 text-3xl text-white sm:text-4xl">{name}</h3>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WORKSHOPS ================= */}
      <section className="relative overflow-hidden border-y border-white/10 bg-ink-800/50 py-28">
        <div className="circuit absolute inset-0 opacity-60" />
        <div className="container-x relative">
          <SectionHead eyebrow="Pre-conference · limited seats" title={<>Pre-symposium <span className="text-holo">workshops</span></>}
            sub="Simulation labs, AI tools and skills stations. Each workshop is a separate ticket with its own fee; no Symposium Pass needed."
            action={<Link href="/workshops" className="btn-blue shrink-0">Workshops details and Registration <ArrowRight className="h-4 w-4" /></Link>} />
        </div>
      </section>

      {/* ================= SPEAKERS (hidden until the speakers go live: Event Settings) ================= */}
      {ev.speakersLive && <section className="container-x py-28">
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
                  <p className="mono hidden text-[10px] uppercase tracking-[0.2em] text-lnh-sky sm:line-clamp-1">{s.institution}</p>
                  <p className="mt-1 font-display text-lg font-bold text-white sm:text-2xl">{s.title} {s.name}</p>
                  <p className="mt-1 hidden text-sm text-slate-300 sm:block">{s.topic}</p>
                </div>
                <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>}

      {/* ================= AGENDA PREVIEW ================= */}
      <section className="relative overflow-hidden border-y border-white/10 py-28">
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="container-x relative">
          <SectionHead eyebrow="At a glance" title={<>Three days on <span className="text-holo">the frontier</span></>}
            action={<Link href="/agenda" className="btn-blue shrink-0">View full agenda <ArrowRight className="h-4 w-4" /></Link>} />
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
                      {items.slice(0, 4).map((p) => (
                        <li key={p.id} className="flex gap-4">
                          <span className="mono w-16 shrink-0 pt-0.5 text-xs text-slate-500">{fmtTime(p.startsAt)}</span>
                          <div><p className="text-sm font-medium leading-snug text-white"><Link href={`/sessions/${p.slug}`} className="hover:text-lnh-sky hover:underline">{p.title}</Link></p><p className="text-[11px] uppercase tracking-wider text-slate-500">{SESSION_TYPE_LABEL[p.type]}{p.hall ? ` · ${p.hall}` : ""}</p></div>
                        </li>
                      ))}
                    </ul>
                    {items.length > 4 && <Link href={`/agenda?day=${d}`} className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-lnh-sky">All {items.length} sessions on Day {d} <ArrowRight className="h-4 w-4" /></Link>}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= TEASER VIDEO + GALLERY (homepage changes 11.11.2026) ================= */}
      <section className="container-x py-28">
        <SectionHead eyebrow="Watch" title={<>Teaser and <span className="text-holo">gallery</span></>} />
        <div className="grid gap-4 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            {teaser ? (
              <div className="overflow-hidden rounded-3xl border border-white/10"><iframe className="aspect-video h-full w-full" src={`https://www.youtube-nocookie.com/embed/${teaser}`} title="9th LNH Symposium teaser" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
            ) : (
              <div className="on-dark relative grid aspect-video place-items-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-lnh-navy via-ink-700 to-[#3a0a12]">
                <div className="circuit absolute inset-0" />
                <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur"><Play className="ml-1 h-8 w-8 fill-white text-white" /></span>
                <span className="absolute bottom-5 left-6 text-sm font-medium text-slate-300">Symposium teaser: coming soon</span>
              </div>
            )}
          </Reveal>
          <Reveal delay={100}>
            <a href={ev.galleryUrl || GALLERY_DEFAULT} target="_blank" rel="noreferrer" className="on-dark group relative flex h-full min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-lnh-blue via-lnh-navy to-ink-700 p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ev.galleryThumbUrl && <img src={ev.galleryThumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105" loading="lazy" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              <Images className="relative h-8 w-8 text-white/80" />
              <p className="relative mt-3 font-display text-2xl font-bold text-white">8<sup className="text-[0.55em]">th</sup> LNH Symposium gallery</p>
              <p className="relative mt-1 flex items-center gap-1.5 text-sm text-white/90">View the photos <ArrowUpRight className="h-4 w-4" /></p>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ================= ABSTRACTS + KEY DATES ================= */}
      <section className="container-x">
        <div className="grid gap-4">
          <Reveal>
            <div className="hud relative h-full overflow-hidden p-8 sm:p-12">
              <div className="orb -bottom-24 -left-10 h-80 w-80 bg-lnh-blue/30" />
              <FileText className="relative h-8 w-8 text-lnh-sky" />
              <h3 className="h-display relative mt-6 text-4xl text-white sm:text-5xl">Call for abstracts</h3>
              <p className="relative mt-4 max-w-lg text-slate-300">Share your research on AI, robotics, digitization, cost and quality of care. Selected work is presented as oral papers or posters and competes for the symposium awards.</p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <Link href="/abstracts" className="btn-primary">Submit an abstract</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="container-x pt-28">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-lnh-navy via-[#0A6AA1] to-lnh-navy px-8 py-16 text-center sm:px-16 sm:py-24">
            <NeuralField density={0.5} interactive={false} />
            <div className="orb -right-10 -top-10 h-80 w-80 bg-lnh-red/50" />
            <p className="mono relative text-xs uppercase tracking-[0.3em] text-white/85">{!ev.registrationOpen ? "Registration opens soon" : early ? "Early-bird pass prices available" : "Registration open"}</p>
            <h2 className="h-display relative mx-auto mt-5 max-w-4xl text-[2.5rem] text-white sm:text-7xl">Be part of the new era</h2>
            <p className="relative mx-auto mt-5 max-w-xl text-white/90">One Symposium Pass admits you to every session on all three days, with a banquet pass included. Add workshops as separate tickets and pay once.</p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-light px-8 py-4 text-base">Register <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/workshops" className="btn-ghost px-8 py-4 text-base">Browse workshops</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
