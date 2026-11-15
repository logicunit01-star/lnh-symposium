import "server-only";
import { db, schema as s } from "./db";

/** Records a change to a staff login or a department (Users & roles, Departments). Never throws. */
export async function staffLog(actor: { name: string; email: string }, target: { id?: string | null; label: string }, action: string, detail?: string | null) {
  await db.insert(s.staffAudit).values({ actor: `${actor.name} (${actor.email})`, targetId: target.id ?? null, target: target.label, action, detail: detail ?? null }).catch((e) => console.error("[staff-audit]", e));
}
