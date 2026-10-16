"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { CartButton } from "@/components/cart/CartDrawer";
import { Logo } from "./Logo";
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
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", scrolled ? "py-2" : "py-4")}>
      <div className="container-x">
        <nav className={cn("flex items-center justify-between rounded-full border px-3 py-2 pl-4 transition-all duration-500",
          scrolled ? "border-white/10 bg-ink/75 shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)] backdrop-blur-xl" : "border-transparent bg-transparent")}>
          <Logo year={year} />
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <li key={n.label} className="relative" onMouseEnter={() => n.children && setDrop(n.label)} onMouseLeave={() => setDrop(null)}>
                {n.href ? (
                  <Link href={n.href} className={cn("rounded-full px-3.5 py-2 text-sm font-medium transition", active(n.href) ? "text-white" : "text-slate-300 hover:text-white")}>{n.label}</Link>
                ) : (
                  <button className={cn("flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition", n.children?.some((c) => active(c.href)) ? "text-white" : "text-slate-300 hover:text-white")}
                    aria-expanded={drop === n.label} onClick={() => setDrop(drop === n.label ? null : n.label)}>
                    {n.label}<ChevronDown className={cn("h-3.5 w-3.5 transition", drop === n.label && "rotate-180")} />
                  </button>
                )}
                {n.children && (
                  <div className={cn("absolute left-1/2 top-full w-80 -translate-x-1/2 pt-3 transition-all duration-300", drop === n.label ? "visible opacity-100" : "invisible -translate-y-2 opacity-0")}>
                    <div className="rounded-2xl border border-white/10 bg-ink-800/95 p-2 shadow-2xl backdrop-blur-xl">
                      {n.children.map((c) => (
                        <Link key={c.href} href={c.href} className="block rounded-xl px-4 py-3 transition hover:bg-white/5">
                          <span className="block text-sm font-semibold text-white">{c.label}</span>
                          <span className="block text-xs text-slate-400">{c.desc}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <CartButton />
            <Link href={account ? "/account/bookings" : "/account"} className="hidden h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-xs font-semibold text-white transition hover:border-lnh-sky md:inline-flex" title={account ? "My bookings" : "Sign in"}>
              <UserRound className="h-4 w-4" /><span className="max-w-[110px] truncate">{account ? account.name.split(" ")[0] : "Sign in"}</span>
            </Link>
            <Link href="/register" className="btn-primary btn-sm hidden sm:inline-flex">Register Now</Link>
            <button className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
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
