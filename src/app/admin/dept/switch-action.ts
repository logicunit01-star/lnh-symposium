"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DEPT_COOKIE, portalDepts } from "@/lib/dept";

/** Department switcher (people linked to more than one department). */
export async function switchDept(f: FormData) {
  const me = await currentUser();
  if (!me) redirect("/admin/login");
  const d = String(f.get("dept") || "");
  if (portalDepts(me).includes(d)) cookies().set(DEPT_COOKIE, d, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/admin" });
  const back = String(f.get("back") || "/admin/dept");
  redirect(back.startsWith("/admin/") ? back : "/admin/dept");
}
