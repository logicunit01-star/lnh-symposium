"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { clearPaymentConfigCache, DEMO_BASE, readPaymentRow, seal, unseal, type Secrets } from "@/lib/payment-config";
import { testSignIn } from "@/lib/paypro";

/** Super Admin only: checked from the signed-in role AND the current database row (a role change takes effect at once). */
async function superAdmin() {
  const u = await requirePerm("payments");
  const [me] = await db.select({ role: s.users.role, active: s.users.active }).from(s.users).where(eq(s.users.id, u.sub));
  if (!me || me.role !== "SUPER_ADMIN" || !me.active) redirect("/admin?denied=1");
  return u;
}
const back = (q: Record<string, string>) => redirect(`/admin/payments?${new URLSearchParams(q)}`);
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const URL_RE = /^(https:\/\/[a-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1))(:\d+)?(\/\S*)?$/i; // http only for a local test server

export async function savePayments(f: FormData) {
  const u = await superAdmin();
  const row = await readPaymentRow();
  const old = unseal(row?.secrets);
  if (old === null) return back({ err: "The saved credentials cannot be read (the server secret changed). Enter all credentials again and tick 'Replace'." });
  const sec: Secrets = { demo: { ...old.demo }, live: { ...old.live }, callback: { ...old.callback } };
  // a blank field keeps the saved value; "remove" ticks clear a whole set
  for (const set of ["demo", "live"] as const) {
    if (f.get(`${set}_remove`) === "on") { sec[set] = {}; continue; }
    for (const k of ["baseUrl", "clientId", "clientSecret", "merchantId"] as const) { const v = field(f, `${set}_${k}`); if (v) sec[set]![k] = v; }
    const b = sec[set]!.baseUrl;
    if (b && !URL_RE.test(b)) return back({ err: `The ${set} API address must start with https://` });
  }
  if (field(f, "cb_username")) sec.callback!.username = field(f, "cb_username");
  if (field(f, "cb_password")) { if (field(f, "cb_password").length < 12) return back({ err: "The callback password must be at least 12 characters." }); sec.callback!.password = field(f, "cb_password"); }
  if (f.get("cb_remove") === "on") sec.callback = {};

  const m = field(f, "mode");
  const mode = m === "OFF" || m === "DEMO" || m === "LIVE" ? m : null; // "" = use the server settings file
  const complete = (x?: Secrets["demo"], needBase = false) => !!(x?.clientId && x.clientSecret && x.merchantId && (!needBase || x.baseUrl));
  if (mode === "DEMO" && !complete(sec.demo)) return back({ err: "To switch to Demo, enter the demo client ID, client secret and merchant username." });
  if (mode === "LIVE" && !complete(sec.live, true)) return back({ err: "To switch to Live, enter the live API address, client ID, client secret and merchant username." });
  if (mode === "LIVE" && row?.mode !== "LIVE" && f.get("confirm_live") !== "on") return back({ err: "Tick the confirmation to take real payments (Live)." });

  const values = { id: 1, mode, secrets: seal(sec), updatedBy: `${u.name} (${u.email})`, updatedAt: new Date() };
  await db.insert(s.paymentSettings).values(values).onConflictDoUpdate({ target: s.paymentSettings.id, set: values });
  clearPaymentConfigCache();
  console.log(`[payments] settings changed by ${u.email}: mode ${row?.mode ?? "server file"} -> ${mode ?? "server file"}`); // no secrets logged
  revalidatePath("/admin/payments"); revalidatePath("/", "layout");
  back({ saved: "1" });
}

/** Signs in to PayPro with the saved demo or live credentials (nothing is created or charged). */
export async function testPayments(set: "demo" | "live") {
  await superAdmin();
  const sec = unseal((await readPaymentRow())?.secrets);
  const c = sec?.[set];
  if (!c?.clientId || !c.clientSecret) return back({ test: set, result: "missing" });
  const r = await testSignIn({ base: (c.baseUrl || (set === "demo" ? DEMO_BASE : "")).replace(/\/$/, ""), clientId: c.clientId, clientSecret: c.clientSecret });
  back({ test: set, result: r.ok ? "ok" : "fail" });
}
