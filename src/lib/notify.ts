import "server-only";
import nodemailer from "nodemailer";
import { db, schema as s } from "./db";
import { accountTransport, fromHeader, mailState, pickAccount } from "./mail-config";

/** cid: shown inside the email as <img src="cid:…"> (e.g. the QR code) instead of as a separate attachment. */
type Attachment = { filename: string; content: Buffer | Uint8Array; contentType?: string; cid?: string };

let envTransport: nodemailer.Transporter | null = null;
/** Fallback when no mailbox is set up in Admin → Email settings: SMTP_* in the server settings file. */
function getEnvTransport() {
  if (!process.env.SMTP_HOST) return null;
  envTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return envTransport;
}

/** from: legacy "Name <address>" (its name is used as the sender name); fromName / accountId / cc / replyTo come from the notification's settings. */
/** Reply-to order: replyTo (the notification's own) > the mailbox's reply-to > fallbackReplyTo (the symposium contact email). */
export type MailOpts = { from?: string | null; fromName?: string | null; accountId?: string | null; cc?: string | null; replyTo?: string | null; fallbackReplyTo?: string | null; templateKey?: string; ref?: string | null };

/**
 * Sends an email. Never throws. Every message is recorded in the sent log.
 * Mailbox: the notification's chosen mailbox, else the default one (Admin → Email settings), else SMTP_* from the server file, else logged only.
 * Mode (Email settings): SEND delivers, LOG records only, TEST delivers every email to the test address instead of the recipient.
 */
export async function sendEmail(to: string, subject: string, html: string, attachments: Attachment[] = [], opts: MailOpts = {}) {
  const st = await mailState().catch(() => null);
  const account = await pickAccount(opts.accountId).catch(() => null);
  const legacyName = opts.from?.includes("<") ? opts.from.split("<")[0] : null;
  const from = account ? fromHeader(opts.fromName || legacyName || account.fromName, account.fromAddress)
    : opts.from || process.env.MAIL_FROM || "LNH Symposium <no-reply@lnh.edu.pk>";
  let cc = opts.cc?.trim() || undefined;
  const replyTo = opts.replyTo || account?.replyTo || opts.fallbackReplyTo || undefined;
  let rcpt = to, subj = subject;
  if (st?.mode === "TEST" && st.testAddress) { rcpt = st.testAddress; subj = `[TEST for ${to}${cc ? `, cc ${cc}` : ""}] ${subject}`; cc = undefined; }
  let status = "LOGGED", error: string | undefined;
  if (st?.mode !== "LOG") {
    try {
      const t = account ? accountTransport(account) : getEnvTransport();
      if (t) {
        await t.sendMail({
          from, to: rcpt, cc, replyTo, subject: subj, html,
          attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType, ...(a.cid ? { cid: a.cid, contentDisposition: "inline" as const } : {}) })),
        });
        status = "SENT";
      }
    } catch (e: any) { status = "FAILED"; error = String(e?.message || e).slice(0, 500); }
  }
  await db.insert(s.notificationLog).values({ channel: "EMAIL", to: rcpt === to ? to : `${rcpt} (test, for ${to})`, cc: cc ?? null, sender: from, templateKey: opts.templateKey ?? null, ref: opts.ref ?? null, subject: subj, body: html.slice(0, 20000), status, error }).catch(() => {});
  return status;
}

/** Normalises a Pakistani mobile number to 92XXXXXXXXXX. */
export const normalisePhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("0092")) return d.slice(2);
  if (d.startsWith("92")) return d;
  if (d.startsWith("0")) return "92" + d.slice(1);
  return d;
};

/** Sends an SMS through a generic HTTP gateway (SMS_API_URL with {to} and {message}). Never throws. */
export async function sendSms(to: string, message: string) {
  const tpl = process.env.SMS_API_URL;
  const num = normalisePhone(to);
  let status = "LOGGED", error: string | undefined;
  if (tpl) {
    try {
      const url = tpl.replace("{to}", encodeURIComponent(num)).replace("{message}", encodeURIComponent(message));
      const r = await fetch(url, { method: "GET", cache: "no-store" });
      status = r.ok ? "SENT" : "FAILED";
      if (!r.ok) error = `HTTP ${r.status}`;
    } catch (e: any) { status = "FAILED"; error = String(e?.message || e); }
  }
  await db.insert(s.notificationLog).values({ channel: "SMS", to: num, body: message, status, error }).catch(() => {});
  return status;
}

/** Branded HTML email wrapper. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#eef2f9;font-family:Segoe UI,Arial,sans-serif;color:#0b1a3a">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="background:linear-gradient(120deg,#232667,#0089BF);padding:28px 32px;color:#fff">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.8">Liaquat National Hospital</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">${title}</div>
    </td></tr>
    <tr><td style="height:4px;background:#B72025"></td></tr>
    <tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">${bodyHtml}
      ${cta ? `<p style="margin:28px 0 0"><a href="${cta.href}" style="background:#B72025;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block">${cta.label}</a></p>` : ""}
    </td></tr>
    <tr><td style="padding:18px 32px;background:#f6f8fc;font-size:12px;color:#5b6b8c">This is an automated message from the LNH Symposium secretariat. Please do not reply to this email.</td></tr>
  </table></td></tr></table></body></html>`;
}
