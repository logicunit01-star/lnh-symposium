import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { BadgeCheck, ClipboardCheck, FileText, Image as ImageIcon, Presentation } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getEvent } from "@/lib/event";
import { reviewWindow } from "@/lib/abstracts";
import { PageTitle } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Department portal" };

export default async function DeptHome({ searchParams }: { searchParams: { nodept?: string; denied?: string } }) {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  if (!can(u.role, "dept.abstracts")) redirect("/admin");
  const [me] = await db.select({ department: s.users.department }).from(s.users).where(eq(s.users.id, u.sub));
  const deptName = me?.department ?? null;
  const ev = await getEvent();
  const w = reviewWindow(ev);
  const [abs] = deptName ? await db.select({ n: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where status = 'SUBMITTED' and hod_decision is null)::int` }).from(s.abstracts).where(eq(s.abstracts.assignedDept, deptName)) : [{ n: 0, pending: 0 }];
  const [ses] = deptName ? await db.select({ n: sql<number>`count(*)::int`, flyers: sql<number>`count(*) filter (where status = 'APPROVED' and flyer_status = 'PENDING')::int` }).from(s.sessions).where(and(eq(s.sessions.department, deptName), eq(s.sessions.proposal, true))) : [{ n: 0, flyers: 0 }];
  const [gst] = deptName ? await db.select({ n: sql<number>`count(*) filter (where approval_status = 'PENDING')::int` }).from(s.registrations).where(and(eq(s.registrations.regType, "GUEST"), eq(s.registrations.department, deptName))) : [{ n: 0 }];
  const Card = ({ href, I, t, d, k }: { href: string; I: any; t: string; d: string; k: string }) => (
    <Link href={href} className="a-card group p-6 transition hover:border-lnh-blue">
      <I className="h-7 w-7 text-lnh-red" /><p className="mt-4 font-display text-lg font-bold text-slate-900 group-hover:text-lnh-blue">{t}</p>
      <p className="mt-1 text-sm text-slate-500">{d}</p><p className="mt-4 font-display text-2xl font-bold text-lnh-navy">{k}</p>
    </Link>
  );
  return (
    <>
      <PageTitle title={deptName ? `Department of ${deptName}` : "Department portal"} sub="One login for your speciality: abstract review, the scientific session agenda, session flyer approval, guest approvals and workshop requests." />
      {(searchParams.nodept || !deptName) && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">No department is linked to this login. Ask the secretariat to set it under Departments.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card href="/admin/dept/abstracts" I={FileText} t="Abstract review" d={w.p1 ? `Phase 1 open until ${fmtDateTime(ev.abstractP1Close!)}` : w.p2 ? `Phase 2 open until ${fmtDateTime(ev.abstractP2Close!)}` : "Review window closed; decisions are read-only"} k={`${abs.pending} to review · ${abs.n} total`} />
        <Card href="/admin/dept/sessions" I={Presentation} t="Scientific session agenda" d={ev.sciLockAt ? (new Date() > ev.sciLockAt ? `Locked since ${fmtDateTime(ev.sciLockAt)}; Scientific Committee edits only` : `Editable until ${fmtDateTime(ev.sciLockAt)}`) : "Submit your session programme details"} k={`${ses.n} session${ses.n === 1 ? "" : "s"}`} />
        <Card href="/admin/dept/flyers" I={ImageIcon} t="Session flyers" d="Final approval of your approved sessions' flyers" k={`${ses.flyers} awaiting approval`} />
        <Card href="/admin/dept/guests" I={BadgeCheck} t="Guest approvals" d="Speakers, chairs, moderators and panelists who registered" k={`${gst.n} awaiting approval`} />
        {can(u.role, "workshops") && <Card href="/admin/workshops" I={ClipboardCheck} t="Workshop requests" d="Form A and your department's workshops" k="Open" />}
      </div>
    </>
  );
}
