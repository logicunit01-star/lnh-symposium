"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, ScanLine, CalendarRange, FileText, Star, Mic2, Settings, UserCog, Inbox, Bell, LogOut, Menu, X, ExternalLink, ClipboardCheck, MapPinned } from "lucide-react";
import { can, ROLE_LABEL, type Perm } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; I: any; p: Perm }[] = [
  { href: "/admin", label: "Overview", I: LayoutDashboard, p: "dashboard" },
  { href: "/admin/registrations", label: "Registrations", I: Users, p: "registrations" },
  { href: "/admin/checkin", label: "Check-in", I: ScanLine, p: "checkin" },
  { href: "/admin/workshops", label: "Workshop Programme", I: ClipboardCheck, p: "workshops" },
  { href: "/admin/venues", label: "Venues & Map", I: MapPinned, p: "venues" },
  { href: "/admin/sessions", label: "Sessions & Programme", I: CalendarRange, p: "sessions" },
  { href: "/admin/abstracts", label: "Abstracts", I: FileText, p: "abstracts" },
  { href: "/admin/feedback", label: "Live Feedback", I: Star, p: "feedback" },
  { href: "/admin/content", label: "Speakers & Committee", I: Mic2, p: "content" },
  { href: "/admin/messages", label: "Enquiries", I: Inbox, p: "messages" },
  { href: "/admin/communications", label: "Reminders & Certificates", I: Bell, p: "notifications" },
  { href: "/admin/settings", label: "Event Settings", I: Settings, p: "settings" },
  { href: "/admin/users", label: "Users & Roles", I: UserCog, p: "users" },
];

export function Sidebar({ user }: { user: { name: string; email: string; role: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-lnh-navy to-lnh-blue ring-1 ring-white/20"><svg viewBox="0 0 64 64" className="h-5 w-5"><path d="M26 10h12v16h16v12H38v16H26V38H10V26h16z" fill="#D2192E" /></svg></span>
        <div className="leading-tight"><p className="font-display text-sm font-bold text-white">LNH Symposium</p><p className="text-[10px] uppercase tracking-[0.2em] text-lnh-sky">Admin console</p></div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {ITEMS.filter((i) => can(user.role, i.p)).map(({ href, label, I }) => {
          const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", on ? "bg-white/10 font-semibold text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                <I className={cn("h-4 w-4", on && "text-lnh-rose")} />{label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-4">
        <Link href="/" target="_blank" className="mb-3 flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ExternalLink className="h-3.5 w-3.5" />View website</Link>
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-400">{ROLE_LABEL[user.role] ?? user.role}</p>
        <form action="/api/admin/logout" method="POST"><button className="mt-3 flex items-center gap-2 text-xs text-slate-400 hover:text-lnh-rose"><LogOut className="h-3.5 w-3.5" />Sign out</button></form>
      </div>
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden print:hidden">
        <p className="font-display text-sm font-bold text-white">LNH Admin</p>
        <button onClick={() => setOpen(!open)} className="text-white" aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 bg-ink transition-transform lg:translate-x-0 print:hidden", open ? "translate-x-0" : "-translate-x-full")}>{nav}</aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
