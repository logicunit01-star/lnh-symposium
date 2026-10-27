"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { sendInvites, sendReminders, setStatus } from "@/lib/invitations";

export async function sendAllInvites() {
  await requirePerm("invitations");
  const r = await sendInvites();
  revalidatePath("/admin/invitations");
  redirect(`/admin/invitations?sent=${r.sent}&failed=${r.failed}`);
}
export async function resendOne(kind: string, id: string) {
  await requirePerm("invitations");
  await sendInvites({ kind, id });
  revalidatePath("/admin/invitations");
}
export async function remindAll() {
  await requirePerm("invitations");
  const n = await sendReminders(Number(process.env.INVITE_REMINDER_DAYS || 3));
  revalidatePath("/admin/invitations");
  redirect(`/admin/invitations?reminded=${n}`);
}
export async function withdraw(kind: string, id: string) {
  await requirePerm("invitations");
  await setStatus({ kind, id }, { inviteStatus: "WITHDRAWN" });
  revalidatePath("/admin/invitations");
}
