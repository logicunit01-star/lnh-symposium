"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { CartButton } from "@/components/cart/CartDrawer";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

type Item = { label: string; href?: string; children?: { label: string; href: string; desc: string }[] };
const NAV: Item[] = [
  { label: "Home", href: "/" },
  {
    label: "About",
    children: [
      { label: "About the Symposium", href: "/about", desc: "Theme, purpose & significance" },
      { label: "Organizing Committee", href: "/committee", desc: "The people behind the event" },
      { label: "Awards", href: "/awards", desc: "Best paper & poster prizes" },
      { label: "Venues & Campus Map", href: "/venues", desc: "Where each workshop and session happens" },
    ],
  },
  {
    label: "Programme",
    children: [
      { label: "Agenda", href: "/agenda", desc: "Full schedule, day by day" },
      { label: "Speakers", href: "/speakers", desc: "Keynotes, panelists & faculty" },
      { label: "Scientific & Plenary", href: "/sessions", desc: "Plenaries & oral abstracts" },
    ],
  },
  { label: "Workshops", href: "/workshops" },
  { label: "Abstracts", href: "/abstracts" },
  { label: "Contact", href: "/contact" },
];

export function Nav({ year, account }: { year: number; account?: { name: string } | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<string | null>(null);
  const path = usePathname();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setOpen(false); setDrop(null); }, [path]);
  const active = (h?: string) => h && (h === "/" ? path === "/" : path.startsWith(h));

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={cn("border-b backdrop-blur-xl transition-all duration-300",
        scrolled ? "border-white/10 bg-ink/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,.35)]" : "border-white/[0.06] bg-ink/70")}>
        <nav className={cn("container-x flex items-center gap-3 xl:gap-4 transition-all duration-300", scrolled ? "h-16" : "h-[76px]")} aria-label="Main">
          <Logo year={year} variant="header" />
          <ul className="mx-auto hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => {
              const on = n.href ? active(n.href) : n.children?.some((c) => active(c.href));
              const cls = cn("relative flex items-center gap-1 rounded-full px-2.5 py-2 text-[14px] font-medium transition xl:px-4 xl:text-[14.5px]",
                on ? "bg-white/[0.08] text-white" : "text-slate-300 hover:bg-white/[0.05] hover:text-white");
              return (
                <li key={n.label} className="relative" onMouseEnter={() => n.children && setDrop(n.label)} onMouseLeave={() => setDrop(null)}>
                  {n.href ? (
                    <Link href={n.href} className={cls} aria-current={on ? "page" : undefined}>{n.label}</Link>
                  ) : (
                    <button className={cls} aria-expanded={drop === n.label} onClick={() => setDrop(drop === n.label ? null : n.label)}>
                      {n.label}<ChevronDown className={cn("h-3.5 w-3.5 opacity-70 transition", drop === n.label && "rotate-180")} />
                    </button>
                  )}
                  {on && <span className="pointer-events-none absolute -bottom-[3px] left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-lnh-red" />}
                  {n.children && (
                    <div className={cn("absolute left-1/2 top-full w-80 -translate-x-1/2 pt-3 transition-all duration-200", drop === n.label ? "visible opacity-100" : "invisible -translate-y-1 opacity-0")}>
                      <div className="rounded-2xl border border-white/10 bg-ink-800/95 p-2 shadow-2xl backdrop-blur-xl">
                        {n.children.map((c) => (
                          <Link key={c.href} href={c.href} className={cn("block rounded-xl px-4 py-3 transition hover:bg-white/5", active(c.href) && "bg-white/5")}>
                            <span className="block text-sm font-semibold text-white">{c.label}</span>
                            <span className="block text-xs text-slate-400">{c.desc}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
            <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
              <ThemeToggle bare />
              <CartButton bare />
              <Link href={account ? "/account/bookings" : "/account"} title={account ? "My bookings" : "Sign in"}
                className="hidden h-9 items-center gap-2 rounded-full px-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex">
                <UserRound className="h-[18px] w-[18px]" /><span className="hidden max-w-[110px] truncate xl:inline">{account ? account.name.split(" ")[0] : "Sign in"}</span>
              </Link>
            </div>
            <Link href="/register" className="btn-primary hidden h-11 whitespace-nowrap px-5 py-0 text-sm sm:inline-flex"><span>Register<span className="hidden xl:inline">&nbsp;Now</span></span></Link>
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-white sm:h-11 sm:w-11 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>
      {/* mobile */}
      <div className={cn("fixed inset-0 top-0 -z-10 bg-ink/95 backdrop-blur-xl transition-all duration-500 lg:hidden", open ? "visible opacity-100" : "invisible opacity-0")}>
        <div className="container-x h-full overflow-y-auto pb-10 pt-28">
          {NAV.map((n) => (
            <div key={n.label} className="border-b border-white/10 py-3">
              {n.href ? <Link href={n.href} className="h-display block text-3xl text-white">{n.label}</Link> : (
                <>
                  <p className="eyebrow mb-2">{n.label}</p>
                  {n.children!.map((c) => <Link key={c.href} href={c.href} className="block py-1.5 font-display text-xl text-slate-200">{c.label}</Link>)}
                </>
              )}
            </div>
          ))}
          <Link href={account ? "/account/bookings" : "/account"} className="btn-ghost mt-8 w-full">{account ? "My bookings" : "Sign in / Create account"}</Link>
          <Link href="/register" className="btn-primary mt-3 w-full">Register Now</Link>
        </div>
      </div>
    </header>
  );
}
