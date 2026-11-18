import "server-only";
import { fromHeader, mailState, pickAccount } from "./mail-config";
import { NOTIFY_MESSAGES, notifyConfig, type NotifyMessageKey } from "./notify-config";
import { enqueue, envMailTransport, logOnly } from "./outbox";
import { fmtDate, fmtTime } from "./utils";

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
 * One xNotify message for a notification (Admin → WhatsApp & SMS). Never throws. Sent when xNotify is switched on and the
 * message has a template ID; mediaUrl (a QR image) goes with it. xNotify delivers it by WhatsApp or SMS (16 Nov 2026:
 * the portal no longer sends SMS itself). m.text is kept only as a readable note in the log.
 */
export async function sendMessage(key: NotifyMessageKey, phone: string | null | undefined, m: { text?: string; mediaUrl?: string; email?: string; ref?: string | null; priority?: number; defer?: boolean; vars?: Record<string, string> } = {}) {
  try {
    if (!phone) return;
    const to = normalisePhone(phone);
    if (!/^\d{10,15}$/.test(to)) return;
    const cfg = await notifyConfig();
    const tid = cfg.templates[key]?.wa;
    if (!cfg.waEnabled || !tid || !(key in NOTIFY_MESSAGES)) return;
    await enqueue({ to, templateKey: key, ref: m.ref ?? null, priority: m.priority, defer: m.defer, channel: "WHATSAPP",
      body: `xNotify template ${tid}${m.mediaUrl && NOTIFY_MESSAGES[key].qr ? " + QR image" : ""}${m.vars ? ` (${Object.entries(m.vars).map(([k, v]) => `${k}: ${v}`).join(", ")})` : m.text ? `: ${m.text}` : ""}`.slice(0, 1000),
      // the portal sends its own emails, so no email address goes to xNotify (it would email the participant a second time)
      payload: { messageKey: key, templateId: tid, mediaUrl: NOTIFY_MESSAGES[key].qr ? m.mediaUrl : undefined, vars: m.vars, via: "XNOTIFY" } });
  } catch (e) { console.error("[notify] could not queue", key, e); }
}

/** xNotify "symposium_workshop" template variables (document of 17 Nov 2026, template 2731). */
export const workshopVars = (name: string, w: { title: string; startsAt: Date; endsAt: Date; hall?: string | null }, status: string) => ({
  participant_name: name, workshop_title: w.title, date: fmtDate(w.startsAt, { day: "numeric", month: "long", year: "numeric" }),
  start_time: fmtTime(w.startsAt), end_time: fmtTime(w.endsAt), venue: w.hall || "Liaquat National Hospital, Karachi", status,
});

/** Kept for existing callers (reminders, certificates): the text is only a log note; xNotify sends the template with `vars`. */
export async function sendSms(to: string, message: string, key: NotifyMessageKey, ref?: string | null, vars?: Record<string, string>) {
  return sendMessage(key, to, { text: message, ref, vars });
}

/** Branded HTML email wrapper.
 *  18 Nov 2026 ("sym changes web 2027"): the header names the 9th LNH Symposium and its dates in the approved theme (navy
 *  #232667 with the red line, as on the PDF). Solid colours with bgcolor, because Outlook drops gradients (the old header
 *  showed white text on white there). The email's own title moves into the body. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; href: string }, brand?: { name?: string | null; dates?: string | null; theme?: string | null }) {
  const name = brand?.name || "9th LNH Symposium 2027", sub = [brand?.dates, brand?.theme].filter(Boolean).join(" · ");
  return `<!doctype html><html><body style="margin:0;background:#eef2f9;font-family:Segoe UI,Arial,sans-serif;color:#0b1a3a">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef2f9" style="padding:32px 12px"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td bgcolor="#232667" style="background-color:#232667;padding:26px 32px;color:#ffffff">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#aab8ff">Liaquat National Hospital</div>
      <div style="font-size:24px;font-weight:700;margin-top:6px;color:#ffffff">${name}</div>
      ${sub ? `<div style="font-size:14px;margin-top:4px;color:#dfe6ff">${sub}</div>` : ""}
    </td></tr>
    <tr><td bgcolor="#B72025" style="height:5px;line-height:5px;font-size:0;background-color:#B72025">&nbsp;</td></tr>
    <tr><td style="padding:26px 32px 4px"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#B72025;font-weight:700">${title}</div></td></tr>
    <tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;color:#0b1a3a">${bodyHtml}
      ${cta ? `<p style="margin:28px 0 0"><a href="${cta.href}" style="background-color:#B72025;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block">${cta.label}</a></p>` : ""}
    </td></tr>
    <tr><td bgcolor="#f6f8fc" style="padding:18px 32px;background-color:#f6f8fc;font-size:12px;color:#5b6b8c">This is an automated message from the LNH Symposium secretariat.</td></tr>
  </table></td></tr></table></body></html>`;
}
