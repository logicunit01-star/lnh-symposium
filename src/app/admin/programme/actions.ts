"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { currentUser, requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { logAbstract } from "@/lib/abstracts";
import { dayNumber, editRule, savePeople, sessionPrefillInput, sessionProposalInput, slotOf, slotTimes } from "@/lib/programme";
import { sendEmail, emailLayout } from "@/lib/notify";
import { appUrl } from "@/lib/utils";
import { formatToType, isSpecialFormat, SPECIAL_DEPT } from "@/lib/scientific";

export type ProposalResult = { error?: string; fields?: Record<string, string> } | null;

async function who() {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  const [me] = await db.select({ department: s.users.department }).from(s.users).where(eq(s.users.id, u.sub));
  return { u, dept: me?.department ?? null, isDept: u.role === "HOD" };
}
async function log(sessionId: string, user: { sub: string; name: string }, from: string | null, to: string, note?: string | null) {
  await db.insert(s.sessionReviews).values({ sessionId, userId: user.sub, userName: user.name, fromStatus: from, toStatus: to, note: note ?? null });
}

/** Department (or committee) saves the Scientific Sessions' Program Details form. */
export async function saveProposal(_: ProposalResult, f: FormData): Promise<ProposalResult> {
  const { u, dept, isDept } = await who();
  if (!(can(u.role, "dept.sessions") || can(u.role, "programme.edit"))) return { error: "Not allowed." };
  let raw: any; try { raw = JSON.parse(String(f.get("data") || "{}")); } catch { return { error: "Invalid form." }; }
  if (isDept) raw.department = dept;
  else if (isSpecialFormat(raw?.sessionFormat)) raw.department = SPECIAL_DEPT;
  if (!isDept && raw?.prefill && !isSpecialFormat(raw?.sessionFormat)) return savePrefill(u, raw, String(f.get("id") || "") || null);
  const p = sessionProposalInput.safeParse(raw);
  if (!p.success) { const fields: Record<string, string> = {}; p.error.issues.forEach((i) => { fields[i.path.join(".")] ??= i.message; }); return { error: "Please complete the highlighted fields.", fields }; }
  const d = p.data;
  const ev = await getEvent();
  const special = isSpecialFormat(d.sessionFormat);
  if (special && isDept) return { error: "Plenary and debate sessions are set up by the Scientific Committee." };
  if (special) {
    d.department = SPECIAL_DEPT;
    const fixed = ev.sessionSlots.filter((x) => x.special === d.sessionFormat).map((x) => x.key);
    if (!fixed.length) return { error: `No ${d.sessionFormat.toLowerCase()} slot is defined in Event Settings.` };
    d.preferredSlots = fixed;
  } else if (d.preferredSlots.some((k) => ev.sessionSlots.find((x) => x.key === k)?.special)) {
    return { error: "The plenary and debate slots are reserved for the committee's sessions.", fields: { preferredSlots: "Choose one of the speciality session slots" } };
  }
  const id = String(f.get("id") || "") || null;
  let existing: typeof s.sessions.$inferSelect | undefined;
  if (id) {
    [existing] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
    if (!existing?.proposal) return { error: "Session not found." };
    const block = editRule({ role: u.role, isDept, ownDept: existing.department === dept, lockAt: ev.sciLockAt, locked: existing.locked, editGrantUntil: existing.editGrantUntil });
    if (block) return { error: block };
  } else if (isDept && ev.sciLockAt && new Date() > ev.sciLockAt) return { error: "The agenda deadline has passed. Contact the symposium secretariat." };

  // Presenters may reference accepted oral abstracts by ID
  const presenters = [];
  for (const pr of d.hasPresenters ? d.presenters : []) {
    let abstractId: string | null = null;
    if (pr.abstractRef) {
      const [ab] = await db.select().from(s.abstracts).where(eq(s.abstracts.refNo, pr.abstractRef.toUpperCase()));
      if (!ab) return { error: `Abstract ${pr.abstractRef} not found.`, fields: { presenters: `Abstract ${pr.abstractRef} not found` } };
      if (ab.status !== "ACCEPTED" || ab.acceptedAs !== "ORAL") return { error: `${ab.refNo} is not an accepted oral abstract.`, fields: { presenters: `${ab.refNo} is not an accepted oral abstract` } };
      abstractId = ab.id;
    }
    presenters.push({ ...pr, abstractId });
  }
  const first = slotOf(ev.sessionSlots, existing?.slotKey ?? d.preferredSlots[0]);
  const times = first ? slotTimes(first) : { startsAt: new Date(`${ev.eventDays[0] ?? "2027-01-29"}T08:30:00+05:00`), endsAt: new Date(`${ev.eventDays[0] ?? "2027-01-29"}T10:30:00+05:00`) };
  const data = {
    title: d.title, department: d.department, type: formatToType(d.sessionFormat) as any, sessionFormat: d.sessionFormat, formatOther: d.formatOther || null,
    preferredSlots: d.preferredSlots, expectedAudience: d.expectedAudience, track: d.department,
    ...(existing?.slotKey ? {} : { ...times, day: first ? dayNumber(ev.eventDays, first.day) : 1 }),
  };
  let sid = id;
  if (existing) {
    const completing = existing.status === "DRAFT";
    await db.update(s.sessions).set({ ...data, ...(completing ? { status: "SUBMITTED", submittedAt: new Date() } : {}) }).where(eq(s.sessions.id, existing.id));
    await log(existing.id, u, existing.status, completing ? "SUBMITTED" : existing.status, completing ? "Programme details completed" : existing.editGrantUntil && !isDept ? "Edited under SC Chair authorisation" : "Agenda edited");
  } else {
    const slug = `sci-${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}`;
    const [row] = await db.insert(s.sessions).values({ ...data, ...times, day: first ? dayNumber(ev.eventDays, first.day) : 1, slug, proposal: true, status: "SUBMITTED", registrable: false, submittedAt: new Date(), proposedById: u.sub } as any).returning({ id: s.sessions.id });
    sid = row.id;
    await log(sid, u, null, "SUBMITTED", "Programme details submitted");
  }
  const named = (p: { name: string }) => !!p.name;
  await savePeople(sid!, [
    ...[{ role: "CHAIR", ...d.chair }, { role: "CO_CHAIR", ...d.coChair }, { role: "MODERATOR", ...d.moderator }].filter(named),
    ...d.panelists.map((x) => ({ role: "PANELIST", ...x })), ...d.speakers.map((x) => ({ role: special ? "KEYNOTE" : "SPEAKER", ...x })),
    ...presenters.map(({ abstractRef, ...x }) => ({ role: "PRESENTER", ...x })),
  ]);
  for (const pr of presenters) if (pr.abstractId) {
    await db.update(s.abstracts).set({ sessionId: sid }).where(eq(s.abstracts.id, pr.abstractId));
    await logAbstract(pr.abstractId, u.name, "Added to session", d.title);
  }
  revalidatePath("/admin/programme", "layout"); revalidatePath("/admin/dept/sessions");
  redirect(isDept ? `/admin/dept/sessions?saved=1` : `/admin/programme/${sid}?saved=1`);
}

/** Scientific Committee allots a slot and a room. */
export async function allotSession(id: string, f: FormData) {
  const u = await requirePerm("programme.edit");
  const ev = await getEvent();
  const [ses] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  const block = editRule({ role: u.role, isDept: false, ownDept: true, lockAt: null, locked: ses.locked, editGrantUntil: ses.editGrantUntil });
  if (block) redirect(`/admin/programme/${id}?err=locked`);
  const slotKey = String(f.get("slotKey") || ""), venueId = String(f.get("venueId") || "");
  const sl = slotOf(ev.sessionSlots, slotKey);
  const [v] = venueId ? await db.select().from(s.venues).where(eq(s.venues.id, venueId)) : [];
  if (!sl || !v) redirect(`/admin/programme/${id}?err=allot`);
  if ((sl!.special ?? null) !== (ses.sessionFormat === "PLENARY" || ses.sessionFormat === "DEBATE" ? ses.sessionFormat : null)) redirect(`/admin/programme/${id}?err=special`);
  const [clash] = await db.select({ title: s.sessions.title }).from(s.sessions).where(and(eq(s.sessions.slotKey, slotKey), eq(s.sessions.venueId, venueId), ne(s.sessions.id, id), ne(s.sessions.status, "REJECTED")));
  if (clash) redirect(`/admin/programme/${id}?err=room&with=${encodeURIComponent(clash.title)}`);
  await db.update(s.sessions).set({ slotKey, venueId, hall: v.name, capacity: v.capacity, ...slotTimes(sl), day: dayNumber(ev.eventDays, sl.day) }).where(eq(s.sessions.id, id));
  await log(id, u, ses.status, ses.status, `Allotted ${sl.day} ${sl.start}–${sl.end}, ${v.name}`);
  revalidatePath("/admin/programme", "layout");
  redirect(`/admin/programme/${id}?saved=1`);
}

export async function decideSession(id: string, f: FormData) {
  const u = await requirePerm("programme.approve");
  const to = String(f.get("status") || "");
  if (!["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(to)) throw new Error("Invalid");
  const [ses] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (ses.status === "DRAFT" && to === "APPROVED") redirect(`/admin/programme/${id}?err=draft`);
  if (to === "APPROVED" && (!ses.slotKey || !ses.venueId)) redirect(`/admin/programme/${id}?err=unallotted`);
  await db.update(s.sessions).set({ status: to, reviewedAt: new Date(), reviewedById: u.sub, reviewNote: String(f.get("note") || "") || ses.reviewNote }).where(eq(s.sessions.id, id));
  await log(id, u, ses.status, to, String(f.get("note") || "") || null);
  revalidatePath("/admin/programme", "layout"); revalidatePath("/", "layout");
  redirect(`/admin/programme/${id}?saved=1`);
}

/** SC Chair authorises the secretariat to change a locked session for 48 hours. */
export async function grantEdit(id: string, f: FormData) {
  const u = await requirePerm("programme.approve");
  const until = new Date(Date.now() + 48 * 3600e3);
  await db.update(s.sessions).set({ editGrantUntil: until }).where(eq(s.sessions.id, id));
  await log(id, u, null, "EDIT_AUTHORISED", `Secretariat may edit until ${until.toISOString().slice(0, 16).replace("T", " ")} UTC${f.get("note") ? ` — ${f.get("note")}` : ""}`);
  revalidatePath(`/admin/programme/${id}`);
}

export async function detachAbstract(abstractId: string, sessionId: string) {
  const u = await requirePerm("programme.edit");
  await db.update(s.abstracts).set({ sessionId: null, sessionOrder: null }).where(eq(s.abstracts.id, abstractId));
  await db.delete(s.sessionPeople).where(and(eq(s.sessionPeople.abstractId, abstractId), eq(s.sessionPeople.sessionId, sessionId), eq(s.sessionPeople.inviteStatus, "NOT_SENT")));
  await logAbstract(abstractId, u.name, "Removed from session");
  revalidatePath(`/admin/programme/${sessionId}`);
}

/** Add accepted oral abstracts by ID (comma or space separated). */
export async function attachAbstracts(sessionId: string, f: FormData) {
  const u = await requirePerm("programme.edit");
  const refs = String(f.get("refs") || "").toUpperCase().split(/[\s,;]+/).filter(Boolean);
  const [ses] = await db.select().from(s.sessions).where(eq(s.sessions.id, sessionId));
  const bad: string[] = [];
  for (const ref of refs) {
    const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.refNo, ref));
    if (!a || a.status !== "ACCEPTED" || a.acceptedAs !== "ORAL") { bad.push(ref); continue; }
    await db.update(s.abstracts).set({ sessionId }).where(eq(s.abstracts.id, a.id));
    const [has] = await db.select().from(s.sessionPeople).where(and(eq(s.sessionPeople.sessionId, sessionId), eq(s.sessionPeople.abstractId, a.id)));
    if (!has) await db.insert(s.sessionPeople).values({ sessionId, role: "PRESENTER", name: a.presentingAuthor, email: a.email, phone: a.mobile, affiliation: a.organization, topic: a.abstractTitle, abstractId: a.id, order: 100 });
    await logAbstract(a.id, u.name, "Added to session", ses.title);
  }
  revalidatePath(`/admin/programme/${sessionId}`);
  redirect(`/admin/programme/${sessionId}${bad.length ? `?bad=${encodeURIComponent(bad.join(", "))}` : "?saved=1"}#abstracts`);
}

/** Release the approved programme to departments and the public agenda. */
export async function releaseProgramme(on: boolean) {
  const u = await requirePerm("programme.approve");
  await db.update(s.event).set({ programmeReleasedAt: on ? new Date() : null }).where(eq(s.event.id, 1));
  revalidatePath("/", "layout");
  redirect(`/admin/programme?released=${on ? 1 : 0}&by=${encodeURIComponent(u.name)}`);
}


/** Secretariat enters the agreed day/time, expected participants (and later the venue); the department completes the form. */
async function savePrefill(u: { sub: string; name: string; role: string }, raw: any, id: string | null): Promise<ProposalResult> {
  const p = sessionPrefillInput.safeParse(raw);
  if (!p.success) { const fields: Record<string, string> = {}; p.error.issues.forEach((i) => { fields[i.path.join(".")] ??= i.message; }); return { error: "Please complete the highlighted fields.", fields }; }
  const d = p.data;
  const ev = await getEvent();
  if (d.preferredSlots.some((k) => ev.sessionSlots.find((x) => x.key === k)?.special)) return { error: "The plenary and debate slots are reserved.", fields: { preferredSlots: "Choose one of the speciality session slots" } };
  const first = slotOf(ev.sessionSlots, d.preferredSlots[0])!;
  const title = d.title || `${d.department} session (details to be completed)`;
  const base = { title, department: d.department, track: d.department, sessionFormat: d.sessionFormat ?? null, type: formatToType(d.sessionFormat ?? "") as any, preferredSlots: d.preferredSlots, expectedAudience: d.expectedAudience };
  let sid = id;
  if (id) {
    const [ex] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
    if (!ex?.proposal) return { error: "Session not found." };
    await db.update(s.sessions).set(base).where(eq(s.sessions.id, id));
    await log(id, u, ex.status, ex.status, "Pre-fill updated by secretariat");
  } else {
    const slug = `sci-${d.department.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
    const [row] = await db.insert(s.sessions).values({ ...base, ...slotTimes(first), day: dayNumber(ev.eventDays, first.day), slug, proposal: true, status: "DRAFT", registrable: false, proposedById: u.sub } as any).returning({ id: s.sessions.id });
    sid = row.id;
    await log(sid, u, null, "DRAFT", "Pre-filled by secretariat: day/time and expected participants; department to complete");
    const logins = await db.select({ email: s.users.email, name: s.users.name }).from(s.users).where(and(eq(s.users.department, d.department), eq(s.users.active, true)));
    for (const l of logins) await sendEmail(l.email, `Complete your session details: ${d.department}`, emailLayout("Your scientific session is ready to complete",
      `<p>Dear ${l.name},</p><p>The symposium secretariat has entered your department's session (${slotOf(ev.sessionSlots, first.key) ? `${first.day} ${first.start}–${first.end}` : ""}, about ${d.expectedAudience} participants).</p><p>Please sign in and add the session title, type, chairperson, co-chairperson, moderator, speakers and presenters before the agenda lock date.</p>`, { label: "Complete the session", href: `${appUrl()}/admin/dept/sessions?edit=${sid}` }));
  }
  revalidatePath("/admin/programme", "layout"); revalidatePath("/admin/dept/sessions");
  redirect(`/admin/programme/${sid}?saved=1`);
}
