import "server-only";
import { fromHeader, mailState, pickAccount } from "./mail-config";
import { NOTIFY_MESSAGES, notifyConfig, type NotifyMessageKey } from "./notify-config";
import { enqueue, envMailTransport, logOnly } from "./outbox";

/** cid: shown inside the email as <img src="cid:…"> (e.g. the QR code) instead of as a separate attachment. */
type Attachment = { filename: string; content: Buffer | Uint8Array; contentType?: string; cid?: string };

/** from: legacy "Name <address>" (its name is used as the sender name); fromName / accountId / cc / replyTo come from the notification's settings. */
/** Reply-to order: replyTo (the notification's own) > the mailbox's reply-to > fallbackReplyTo (the symposium contact email). */
export type MailOpts = { from?: string | null; fromName?: string | null; accountId?: string | null; cc?: string | null; replyTo?: string | null; fallbackReplyTo?: string | null; templateKey?: string; ref?: string | null; priority?: number; defer?: boolean };

/**
 * Sends an email through the outbox (lib/outbox.ts). Never throws. Every message is recorded in the sent log.
 * Mailbox: the notification's chosen mailbox, else the default one (Admin → Email settings), else SMTP_* from the server file, else logged only.
 * Mode (Email settings): SEND delivers, LOG records only, TEST delivers every email to the test address instead of the recipient.
 * Returns SENT, QUEUED (sent by the notifier, or retried later), FAILED or LOGGED.
 */
export async function sendEmail(to: string, subject: string, html: string, attachments: Attachment[] = [], opts: MailOpts = {}) {
  try {
    const st = await mailState().catch(() => null);
    const account = await pickAccount(opts.accountId).catch(() => null);
    const legacyName = opts.from?.includes("<") ? opts.from.split("<")[0] : null;
    const from = account ? fromHeader(opts.fromName || legacyName || account.fromName, account.fromAddress)
      : opts.from || process.env.MAIL_FROM || "LNH Symposium <no-reply@lnh.edu.pk>";
    let cc = opts.cc?.trim() || undefined;
    // a mailbox without its own reply-to takes the replies itself (no Reply-To header); fix 16 Nov 2026
    const replyTo = opts.replyTo || account?.replyTo || (account ? undefined : opts.fallbackReplyTo) || undefined;
    let rcpt = to, subj = subject;
    // audit 16 Nov 2026: one-time codes are never shown in the sent log, and never redirected to the Test-mode address
    const secret = opts.templateKey === "SIGN_IN_CODE";
    const logBody = secret ? maskCodes(html) : html;
    if (/\.local$/i.test(to.trim())) return logOnly({ channel: "EMAIL", to, sender: from, templateKey: opts.templateKey ?? null, ref: opts.ref ?? null, subject: secret ? maskCodes(subject) : subject, body: logBody, error: "Not a deliverable address (department logins use .local): set the department email in Admin → Departments." });
    if (secret && st?.mode === "TEST") return logOnly({ channel: "EMAIL", to, sender: from, templateKey: opts.templateKey ?? null, ref: opts.ref ?? null, subject: maskCodes(subject), body: logBody, error: "Not sent: Test mode never redirects sign-in codes." });
    if (st?.mode === "TEST" && st.testAddress) { rcpt = st.testAddress; subj = `[TEST for ${to}${cc ? `, cc ${cc}` : ""}] ${subject}`; cc = undefined; }
    const base = { channel: "EMAIL" as const, to: rcpt === to ? to : `${rcpt}`, cc: cc ?? null, sender: from, templateKey: opts.templateKey ?? null, ref: opts.ref ?? null, subject: secret ? maskCodes(subj) : subj, body: logBody };
    if (st?.mode === "LOG" || (!account && !envMailTransport())) return logOnly(base);
    return await enqueue({ ...base, priority: opts.priority, defer: opts.defer, payload: {
      html, from, accountId: account?.id ?? null, replyTo: replyTo ?? null, ...(secret ? { subject: subj } : {}),
      attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64"), contentType: a.contentType, cid: a.cid })),
    } });
  } catch (e) {
    console.error("[mail] could not queue", e);
    return "FAILED";
  }
}

/** Hides one-time codes (6 digits) in what the sent log keeps. */
export const maskCodes = (t: string) => t.replace(/\b\d{6}\b/g, "••••••");

/** Normalises a Pakistani mobile number to 92XXXXXXXXXX. */
export const normalisePhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("0092")) return d.slice(2);
  if (d.startsWith("92")) return d;
  if (d.startsWith("0")) return "92" + d.slice(1);
  return d;
};

/**
 * WhatsApp and/or SMS for one notification (Admin → WhatsApp & SMS). Never throws.
 * - WhatsApp: when switched on and the message has a WhatsApp template ID; mediaUrl (a QR image) goes with it.
 * - SMS: eOcean when switched on and the message has an SMS template ID; otherwise the free text through the
 *   SMS gateway in the server file (SMS_API_URL); otherwise only recorded, as before.
 */
export async function sendMessage(key: NotifyMessageKey, phone: string | null | undefined, m: { text?: string; mediaUrl?: string; email?: string; ref?: string | null; priority?: number; defer?: boolean } = {}) {
  try {
    if (!phone) return;
    const to = normalisePhone(phone);
    if (!/^\d{10,15}$/.test(to)) return;
    const cfg = await notifyConfig();
    const t = cfg.templates[key] ?? {}, free = "freeText" in NOTIFY_MESSAGES[key];
    const common = { to, templateKey: key, ref: m.ref ?? null, priority: m.priority, defer: m.defer };
    if (cfg.waEnabled && t.wa && !free) {
      await enqueue({ ...common, channel: "WHATSAPP", body: `WhatsApp template ${t.wa}${m.mediaUrl ? " + QR image" : ""}${m.text ? `: ${m.text}` : ""}`, payload: { messageKey: key, templateId: t.wa, mediaUrl: m.mediaUrl, email: m.email, via: "XNOTIFY" } });
    }
    if (cfg.smsEnabled && t.sms && !free) {
      await enqueue({ ...common, channel: "SMS", body: `SMS template ${t.sms}${m.text ? `: ${m.text}` : ""}`, payload: { messageKey: key, templateId: t.sms, email: m.email, via: "XNOTIFY" } });
    } else if (m.text) {
      const shown = key === "SIGN_IN_CODE" ? maskCodes(m.text) : m.text;
      if (process.env.SMS_API_URL) await enqueue({ ...common, channel: "SMS", body: shown, payload: { messageKey: key, text: m.text, via: "GATEWAY" } });
      else await logOnly({ channel: "SMS", to, templateKey: key, ref: m.ref ?? null, body: shown });
    }
  } catch (e) { console.error("[notify] could not queue", key, e); }
}

/** Free-text SMS (kept for existing callers): see sendMessage. */
export async function sendSms(to: string, message: string, key: NotifyMessageKey = "BROADCAST", ref?: string | null) {
  return sendMessage(key, to, { text: message, ref });
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
