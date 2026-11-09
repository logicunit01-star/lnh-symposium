"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PAGE_KEYS, PAGE_PATH, PAGE_TITLE, type PageKey } from "@/lib/programme-pages";

/** Admin for the Programme pages (Dashboard Instructions, revised 06-11-2026): Pre-Symposium Webinar / Panel Discussion and Meet the Experts. */
const str = (f: FormData, k: string, max = 2000) => { const v = String(f.get(k) ?? "").trim(); return v ? v.slice(0, max) : null; };
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO = 1024 * 1024;
const keyOf = (k: string): PageKey => { if (!(k in PAGE_KEYS)) throw new Error("Unknown page"); return k as PageKey; };
const back = (k: PageKey, msg: string) => { revalidatePath("/admin/programme/pages"); revalidatePath(PAGE_PATH[k]); redirect(`/admin/programme/pages?${msg}#${k}`); };

async function photo(f: FormData) {
  const file = f.get("photo");
  if (!file || typeof file !== "object" || !(file as File).size) return null;
  const p = file as File;
  if (!PHOTO_TYPES.includes(p.type)) return { error: "type" as const };
  if (p.size > MAX_PHOTO) return { error: "size" as const };
  return { photoMime: p.type, photoData: Buffer.from(await p.arrayBuffer()).toString("base64") };
}

export async function savePage(key: string, f: FormData) {
  const u = await requirePerm("programme.edit"); const k = keyOf(key);
  const row = { title: str(f, "title", 160) ?? PAGE_TITLE[k], dateText: str(f, "dateText", 200), format: str(f, "format"), description: str(f, "description", 4000), published: f.get("published") === "on", updatedBy: u.name };
  await db.insert(s.programmePages).values({ key: k, ...row }).onConflictDoUpdate({ target: s.programmePages.key, set: row });
  back(k, "saved=page");
}

export async function saveGuest(key: string, id: string | null, f: FormData) {
  await requirePerm("programme.edit"); const k = keyOf(key);
  const name = str(f, "name", 160);
  if (!name) back(k, "err=name");
  const ph = await photo(f);
  if (ph && "error" in ph) back(k, `err=photo-${ph.error}`);
  const row: any = { name, affiliation: str(f, "affiliation", 250), qualification: str(f, "qualification", 250), topic: str(f, "topic", 300), photoUrl: str(f, "photoUrl", 500), order: Number(f.get("order")) || 0 };
  if (ph) Object.assign(row, ph);
  if (f.get("removePhoto") === "on") Object.assign(row, { photoMime: null, photoData: null });
  await db.insert(s.programmePages).values({ key: k, title: PAGE_TITLE[k] }).onConflictDoNothing();
  if (id) await db.update(s.programmeGuests).set(row).where(eq(s.programmeGuests.id, id));
  else await db.insert(s.programmeGuests).values({ ...row, pageKey: k });
  back(k, "saved=guest");
}

export async function deleteGuest(key: string, id: string) {
  await requirePerm("programme.edit"); const k = keyOf(key);
  await db.delete(s.programmeGuests).where(eq(s.programmeGuests.id, id));
  back(k, "saved=deleted");
}
