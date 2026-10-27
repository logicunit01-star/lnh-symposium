"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { createRegistration, registrationInput, CapacityError } from "@/lib/registration";
import { markPaidManually } from "@/lib/payments";

export type DeskResult = { error?: string; fields?: Record<string, string> } | null;

/** Desk registration for LNH staff (and walk-ins): same numbering, caps and notices as online. */
export async function onsiteRegister(_: DeskResult, f: FormData): Promise<DeskResult> {
  const u = await requirePerm("registrations.edit");
  const g = (k: string) => String(f.get(k) ?? "").trim();
  const categoryId = Number(g("categoryId"));
  const [cat] = await db.select().from(s.feeCategory).where(eq(s.feeCategory.id, categoryId));
  if (!cat) return { error: "Choose a category." };
  const employeeId = g("employeeId");
  if (cat.tier === "EMPLOYEE" && !/^[A-Za-z0-9-]{3,20}$/.test(employeeId)) return { error: "Enter the LNH employee ID shown on the staff card.", fields: { employeeId: "Required for LNH staff" } };
  const p = registrationInput.safeParse({
    title: g("title"), gender: g("gender"), firstName: g("firstName"), lastName: g("lastName"), email: g("email"), phone: g("phone"),
    pmdcNo: g("pmdcNo"), designation: g("designation"), specialty: g("department"), institution: g("institution") || "Liaquat National Hospital",
    categoryId, sessionIds: f.getAll("sessionIds").map(String), consent: true, includePass: f.get("includePass") === "on",
  });
  if (!p.success) {
    const fields: Record<string, string> = {};
    p.error.issues.forEach((i) => { fields[String(i.path[0])] = i.message; });
    return { error: "Please correct the highlighted fields.", fields };
  }
  if (!p.data.includePass && !p.data.sessionIds.length) return { error: "Select the symposium pass or at least one session or workshop." };
  let regId: string;
  try {
    const r = await createRegistration(p.data);
    regId = r.id;
  } catch (e: any) {
    return { error: e instanceof CapacityError ? e.message : e?.message || "Could not register." };
  }
  await db.update(s.registrations).set({ employeeId: employeeId || null, source: "ONSITE", notes: `Registered at the desk by ${u.name}` }).where(eq(s.registrations.id, regId));
  const pay = g("payment");
  if (pay === "CASH" || pay === "CARD") await markPaidManually(regId, pay === "CASH" ? "Cash at desk" : "Card at desk", g("receipt") || undefined);
  else if (pay === "WAIVED") await db.update(s.registrations).set({ paymentStatus: "WAIVED", paymentMethod: "Waived at desk" }).where(eq(s.registrations.id, regId));
  revalidatePath("/admin/onsite"); revalidatePath("/admin/registrations");
  redirect(`/admin/onsite?done=${regId}`);
}
