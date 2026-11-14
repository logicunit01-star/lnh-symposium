import "server-only";
import nodemailer from "nodemailer";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import { openText } from "./secret-box";

/** Admin → Email settings (Super Admin / Admin): mailboxes and the delivery mode. Read with a short cache. */
export const MAIL_LABEL = "mail-account";
export type MailAccount = typeof s.mailAccounts.$inferSelect;
export type MailMode = "SEND" | "LOG" | "TEST";

let cache: { at: number; mode: MailMode; testAddress: string | null; accounts: MailAccount[] } | null = null;
export const clearMailCache = () => { cache = null; transports.clear(); };

export async function mailState() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const [row, accounts] = await Promise.all([
    db.select().from(s.mailSettings).where(eq(s.mailSettings.id, 1)).then((r) => r[0]).catch(() => undefined),
    db.select().from(s.mailAccounts).orderBy(desc(s.mailAccounts.isDefault), asc(s.mailAccounts.label)).catch(() => [] as MailAccount[]),
  ]);
  const mode = (row?.mode === "LOG" || row?.mode === "TEST" ? row.mode : "SEND") as MailMode;
  cache = { at: Date.now(), mode, testAddress: row?.testAddress ?? null, accounts };
  return cache;
}

/** The mailbox for a message: the one chosen for the notification if active, else the default, else the first active one. */
export async function pickAccount(id?: string | null) {
  const { accounts } = await mailState();
  const active = accounts.filter((a) => a.active);
  return (id && active.find((a) => a.id === id)) || active.find((a) => a.isDefault) || active[0] || null;
}

const transports = new Map<string, nodemailer.Transporter>();
export function accountTransport(a: MailAccount) {
  const k = `${a.id}:${a.updatedAt?.getTime?.() ?? ""}`;
  let t = transports.get(k);
  if (t) return t;
  const pass = openText(MAIL_LABEL, a.secret);
  if (pass === null) throw new Error("The mailbox password cannot be read (the server secret changed). Enter it again in Email settings.");
  t = nodemailer.createTransport({
    host: a.host, port: a.port, secure: a.security === "SSL", requireTLS: a.security === "STARTTLS",
    auth: { user: a.username, pass },
    connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 20_000,
    // the LNH mail server's certificate is issued for symposium2027.lnh.edu.pk; using its IP needs the name for TLS checks
    tls: { servername: /^\d+\.\d+\.\d+\.\d+$/.test(a.host) ? "symposium2027.lnh.edu.pk" : a.host },
  });
  transports.set(k, t);
  return t;
}

/** "Display Name" <address>, with the name taken from a legacy "Name <addr>" string if given. */
export function fromHeader(name: string | null | undefined, address: string) {
  const n = (name ?? "").replace(/<[^>]*>/g, "").replace(/["\r\n]/g, "").trim();
  return n ? `"${n}" <${address}>` : address;
}
