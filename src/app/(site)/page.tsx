import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Mic2, Play, ShieldCheck, Sparkles, Wallet, Cpu, GraduationCap, FileText } from "lucide-react";
import { getEvent, isEarlyBird } from "@/lib/event";
import { getProgramme, getSpeakers, seatsTaken } from "@/lib/queries";
import { fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";
import { Countdown } from "@/components/ui/Countdown";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { Avatar } from "@/components/ui/Avatar";
import { SessionCard } from "@/components/site/SessionCard";

const youtubeId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1];

export default async function Home() {
  const [ev, programme, speakers, taken] = await Promise.all([getEvent(), getProgramme(), getSpeakers(), seatsTaken()]);
  const early = isEarlyBird(ev);
  const workshops = programme.filter((s) => s.type === "WORKSHOP");
  const featured = speakers.filter((s) => s.featured).slice(0, 6);
  const days = [...new Set(programme.map((s) => s.day))];
  const dayTheme: Record<number, string> = { 1: "Cost", 2: "Quality", 3: "Technology" };
  const keyDates = [
    ev.abstractOpen && { d: ev.abstractOpen, t: "Abstract submission opens" },
    ev.earlyBirdUntil && { d: ev.earlyBirdUntil, t: "Early-bird registration ends" },
    ev.abstractDeadline && { d: ev.abstractDeadline, t: "Abstract submission deadline" },
    { d: ev.startDate, t: "Symposium begins" },
  ].filter(Boolean).sort((a: any, b: any) => +new Date(a.d) - +new Date(b.d)) as { d: Date; t: string }[];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="noise relative flex min-h-[100svh] items-center overflow-hidden pt-28">
        {ev.heroVideoUrl ? (
          <>
            <video className="absolute inset-0 h-full w-full object-cover opacity-40" src={ev.heroVideoUrl} autoPlay muted loop playsInline />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/50 to-ink" />
          </>
        ) : null}
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        <div className="orb -left-32 top-0 h-[560px] w-[560px] bg-lnh-blue/40" />
        <div className="orb -right-24 top-1/3 h-[460px] w-[460px] bg-lnh-red/30 [animation-delay:-4s]" />
        <div className="orb bottom-0 left-1/3 h-[300px] w-[300px] bg-lnh-sky/20 [animation-delay:-8s]" />
        {/* rotating ring */}
        <svg className="pointer-events-none absolute -right-40 top-1/2 hidden h-[900px] w-[900px] -translate-y-1/2 animate-spinslow opacity-30 lg:block" viewBox="0 0 400 400" aria-hidden>
          <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#3FB8F0" /><stop offset="1" stopColor="#D2192E" /></linearGradient>
            <path id="circ" d="M200,200 m-160,0 a160,160 0 1,1 320,0 a160,160 0 1,1 -320,0" /></defs>
          <circle cx="200" cy="200" r="190" fill="none" stroke="url(#rg)" strokeWidth=".6" strokeDasharray="2 6" />
          <circle cx="200" cy="200" r="130" fill="none" stroke="url(#rg)" strokeWidth=".4" />
          <text fill="#ffffff" fillOpacity=".55" fontSize="11" letterSpacing="6" fontFamily="sans-serif"><textPath href="#circ">COST · QUALITY · TECHNOLOGY · COST · QUALITY · TECHNOLOGY · </textPath></text>
        </svg>

        <div className="container-x relative z-10 py-16">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-lnh-red px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">{ev.edition} Edition</span>
              <span className="chip gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(ev.startDate, { day: "numeric" })}–{fmtDate(ev.endDate, { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="chip gap-1.5"><MapPin className="h-3.5 w-3.5" />Karachi, Pakistan</span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 font-display text-sm font-semibold uppercase tracking-[0.35em] text-slate-300">{ev.name}</p>
            <h1 className="h-display mt-4 text-[11.5vw] text-white sm:text-[10vw] lg:text-[8.5rem]">
              <span className="block">Healthcare</span>
              <span className="text-grad block">Conundrum</span>
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-display text-2xl font-semibold sm:text-4xl">
              <span className="text-white">Cost<span className="text-lnh-red">.</span></span>
              <span className="text-white">Quality<span className="text-lnh-red">.</span></span>
              <span className="text-white">Technology<span className="text-lnh-red">.</span></span>
            </div>
            <p className="mt-6 max-w-xl text-lg text-slate-300">{ev.tagline}</p>
          </Reveal>
          <Reveal delay={360} className="mt-10 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-8 py-4 text-base">Register Now <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/agenda" className="btn-ghost px-8 py-4 text-base">View Agenda</Link>
            <Link href="/speakers" className="btn-ghost px-8 py-4 text-base">Explore Speakers</Link>
          </Reveal>
          <Reveal delay={480} className="mt-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Countdown to={ev.startDate.toISOString()} />
            <div className="max-w-sm text-sm text-slate-400">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lnh-sky" />{ev.venue}</p>
              {ev.virtualLink && <a href={ev.virtualLink} className="mt-2 inline-flex items-center gap-1 text-lnh-sky hover:underline">Join virtually <ArrowUpRight className="h-3.5 w-3.5" /></a>}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="relative -mx-4 -rotate-1 overflow-hidden border-y border-white/10 bg-lnh-red py-5">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["Value-Based Care", "Patient Safety", "Health Economics", "AI in Medicine", "Digital Health", "Quality Improvement", "Universal Health Coverage", "Telemedicine"].map((w) => (
              <span key={w + k} className="flex items-center gap-10">{w}<Sparkles className="h-6 w-6 text-white/60" /></span>
            ))
          )}
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="container-x py-24">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {[
            [String(Math.round((+ev.endDate - +ev.startDate) / 864e5) + 1), "Days of learning"],
            [`${speakers.length}+`, "Expert speakers"],
            [String(workshops.length), "Hands-on workshops"],
            [String(programme.filter((p) => !["BREAK", "CEREMONY"].includes(p.type)).length), "Sessions & keynotes"],
          ].map(([n, l], i) => (
            <Reveal key={l} delay={i * 100} className="bg-ink p-8 sm:p-10">
              <p className="h-display text-5xl text-white sm:text-7xl">{n}</p>
              <p className="mt-3 text-sm uppercase tracking-widest text-slate-400">{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= HIGHLIGHTS (BENTO) ================= */}
      <section className="container-x">
        <SectionHead eyebrow="Symposium highlights" title={<>Three forces. <span className="text-grad">One system.</span></>}
          sub="Rising costs, uneven quality and rapid technological change are pulling healthcare in different directions. Over three days we bring clinicians, administrators, economists and technologists into one room to find the balance."
          action={<Link href="/about" className="btn-ghost shrink-0">Learn more <ArrowRight className="h-4 w-4" /></Link>} />
        <div className="grid gap-4 md:grid-cols-6">
          {[
            { n: "01", t: "Cost", d: "Financing, insurance, out-of-pocket spending and cost-effectiveness — making every rupee count for patients.", I: Wallet, c: "from-lnh-red/30", span: "md:col-span-2" },
            { n: "02", t: "Quality", d: "Patient safety, accreditation, outcome measures and a just culture that turns errors into learning.", I: ShieldCheck, c: "from-lnh-blue/40", span: "md:col-span-2" },
            { n: "03", t: "Technology", d: "AI, telemedicine, data and digital health — what works at the bedside, what’s hype, and how to adopt safely.", I: Cpu, c: "from-lnh-sky/30", span: "md:col-span-2" },
          ].map(({ n, t, d, I, c, span }, i) => (
            <Reveal key={t} delay={i * 120} className={span}>
              <div className={`card card-hover group relative h-full overflow-hidden bg-gradient-to-br ${c} to-transparent p-8`}>
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><I className="h-6 w-6 text-white" /></span>
                  <span className="font-display text-6xl font-bold text-white/10 transition group-hover:text-white/20">{n}</span>
                </div>
                <h3 className="h-display mt-10 text-4xl text-white">{t}</h3>
                <p className="mt-3 text-slate-300">{d}</p>
              </div>
            </Reveal>
          ))}
          <Reveal className="md:col-span-4">
            <div className="card relative h-full overflow-hidden p-8 sm:p-10">
              <div className="orb -right-20 -top-20 h-72 w-72 bg-lnh-red/30" />
              <Mic2 className="h-8 w-8 text-lnh-rose" />
              <h3 className="h-display mt-6 text-3xl text-white sm:text-4xl">Expert panels &amp; keynote addresses</h3>
              <p className="mt-3 max-w-xl text-slate-300">National and international leaders in health policy, quality and digital health — with open Q&amp;A on every panel.</p>
              <div className="mt-8 flex -space-x-3">
                {speakers.slice(0, 7).map((s) => <Avatar key={s.id} name={s.name} src={s.photoUrl} className="h-12 w-12 rounded-full text-[9px] ring-4 ring-ink" />)}
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xs font-bold text-ink ring-4 ring-ink">+{Math.max(0, speakers.length - 7)}</span>
              </div>
            </div>
          </Reveal>
          <Reveal className="md:col-span-2" delay={120}>
            <div className="card relative h-full overflow-hidden bg-gradient-to-br from-lnh-gold/15 to-transparent p-8">
              <GraduationCap className="h-8 w-8 text-lnh-gold" />
              <h3 className="h-display mt-6 text-3xl text-white">CME credits &amp; e-certificates</h3>
              <p className="mt-3 text-slate-300">Every registered participant receives a verifiable e-certificate.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= SPEAKERS ================= */}
      <section className="container-x py-28">
        <SectionHead eyebrow="Featured speakers" title={<>Voices shaping <span className="text-grad-red">healthcare</span></>}
          action={<Link href="/speakers" className="btn-ghost shrink-0">All speakers <ArrowRight className="h-4 w-4" /></Link>} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {featured.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 100}>
              <a href={s.linkedin || "/speakers"} target={s.linkedin ? "_blank" : undefined} rel="noreferrer" className="group relative block overflow-hidden rounded-3xl border border-white/10">
                <Avatar name={s.name} src={s.photoUrl} className="aspect-[4/5] w-full text-[24px] transition duration-700 group-hover:scale-105 sm:text-[40px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lnh-sky">{s.institution}</p>
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
      <section className="relative overflow-hidden border-y border-white/10 bg-ink-800/50 py-28">
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="container-x relative">
          <SectionHead eyebrow="At a glance" title={<>Three days. <span className="text-grad">Three themes.</span></>}
            action={<Link href="/agenda" className="btn-blue shrink-0">Full agenda <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="grid gap-4 lg:grid-cols-3">
            {days.map((d, i) => {
              const items = programme.filter((p) => p.day === d && !["BREAK"].includes(p.type));
              const date = items[0]?.startsAt;
              return (
                <Reveal key={d} delay={i * 120}>
                  <div className="card h-full p-7">
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Day {d}</p>
                        <p className="h-display mt-2 text-4xl text-white">{dayTheme[d] ?? `Day ${d}`}</p>
                      </div>
                      {date && <p className="text-right font-display text-sm text-lnh-sky">{fmtDate(date, { weekday: "short" })}<br /><span className="text-2xl font-bold text-white">{fmtDate(date, { day: "2-digit", month: "short" })}</span></p>}
                    </div>
                    <ul className="mt-5 space-y-4">
                      {items.slice(0, 6).map((p) => (
                        <li key={p.id} className="flex gap-4">
                          <span className="w-16 shrink-0 pt-0.5 font-mono text-xs text-slate-500">{fmtTime(p.startsAt)}</span>
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

      {/* ================= WORKSHOPS ================= */}
      <section className="container-x py-28">
        <SectionHead eyebrow="Pre-registration required" title={<>Hands-on <span className="text-grad-red">workshops</span></>}
          sub="Small groups, expert facilitators and limited seats. Register early — seats are allotted first-come, first-served."
          action={<Link href="/workshops" className="btn-ghost shrink-0">All workshops <ArrowRight className="h-4 w-4" /></Link>} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workshops.slice(0, 3).map((w, i) => (
            <Reveal key={w.id} delay={i * 100}><SessionCard s={w} taken={taken[w.id]} early={early} showDate cta={{ href: `/register?s=${w.id}`, label: "Register" }} /></Reveal>
          ))}
        </div>
      </section>

      {/* ================= VIDEOS ================= */}
      <section className="container-x pb-28">
        <SectionHead eyebrow="Watch" title={<>Moments from <span className="text-grad">past editions</span></>} />
        <div className="grid gap-4 md:grid-cols-3">
          {(ev.videos.length ? ev.videos : [null, null, null]).slice(0, 3).map((v, i) => {
            const id = v && youtubeId(v);
            return (
              <Reveal key={i} delay={i * 100} className={i === 0 ? "md:col-span-2 md:row-span-2" : ""}>
                {id ? (
                  <div className="overflow-hidden rounded-3xl border border-white/10"><iframe className="aspect-video h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title={`Symposium video ${i + 1}`} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
                ) : (
                  <a href={ev.youtube || "#"} target="_blank" rel="noreferrer" className="group relative grid aspect-video place-items-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-lnh-navy via-ink-700 to-[#3a0a12]">
                    <div className="grid-lines absolute inset-0" />
                    <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur transition group-hover:scale-110 group-hover:bg-lnh-red"><Play className="ml-1 h-8 w-8 fill-white text-white" /></span>
                    <span className="absolute bottom-5 left-6 text-sm font-medium text-slate-300">{["Highlights reel", "Keynote recap", "Workshop moments"][i]} — video coming soon</span>
                  </a>
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ================= KEY DATES + ABSTRACTS ================= */}
      <section className="container-x">
        <div className="grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="card relative h-full overflow-hidden p-8 sm:p-12">
              <div className="orb -bottom-24 -left-10 h-80 w-80 bg-lnh-blue/30" />
              <FileText className="relative h-8 w-8 text-lnh-sky" />
              <h3 className="h-display relative mt-6 text-4xl text-white sm:text-5xl">Call for abstracts</h3>
              <p className="relative mt-4 max-w-lg text-slate-300">Share your research on cost, quality and technology. Selected abstracts will be presented as oral papers or posters, and compete for the symposium awards.</p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <Link href="/abstracts?type=ORAL" className="btn-primary">Submit scientific paper</Link>
                <Link href="/abstracts?type=POSTER" className="btn-ghost">Submit poster</Link>
              </div>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={120}>
            <div className="card h-full p-8">
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
          <div className="noise relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-lnh-navy via-lnh-blue to-lnh-navy px-8 py-16 text-center sm:px-16 sm:py-24">
            <div className="grid-lines absolute inset-0 opacity-60" />
            <div className="orb -right-10 -top-10 h-80 w-80 bg-lnh-red/50" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-white/70">{early ? "Early-bird rates available" : "Registration open"}</p>
            <h2 className="h-display relative mx-auto mt-5 max-w-4xl text-5xl text-white sm:text-7xl">Secure your seat today</h2>
            <p className="relative mx-auto mt-5 max-w-xl text-white/80">Instant registration number, PDF confirmation by email &amp; SMS, and secure online payment.</p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-light px-8 py-4 text-base">Register Now <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/workshops" className="btn-ghost px-8 py-4 text-base">Register for Workshops</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
