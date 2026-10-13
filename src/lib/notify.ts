import "server-only";
import nodemailer from "nodemailer";
import { db, schema as s } from "./db";

type Attachment = { filename: string; content: Buffer | Uint8Array; contentType?: string };

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/** Sends an email (or logs it when SMTP isn't configured). Never throws. */
export async function sendEmail(to: string, subject: string, html: string, attachments: Attachment[] = []) {
  const t = getTransport();
  let status = "LOGGED", error: string | undefined;
  if (t) {
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM || "LNH Symposium <no-reply@lnh.edu.pk>", to, subject, html,
        attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
      });
      status = "SENT";
    } catch (e: any) { status = "FAILED"; error = String(e?.message || e); }
  }
  await db.insert(s.notificationLog).values({ channel: "EMAIL", to, subject, body: html.slice(0, 20000), status, error }).catch(() => {});
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
    <tr><td style="background:linear-gradient(120deg,#0A2E6E,#1560D4);padding:28px 32px;color:#fff">
      <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.8">Liaquat National Hospital</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">${title}</div>
    </td></tr>
    <tr><td style="height:4px;background:#D2192E"></td></tr>
    <tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">${bodyHtml}
      ${cta ? `<p style="margin:28px 0 0"><a href="${cta.href}" style="background:#D2192E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block">${cta.label}</a></p>` : ""}
    </td></tr>
    <tr><td style="padding:18px 32px;background:#f6f8fc;font-size:12px;color:#5b6b8c">This is an automated message from the LNH Symposium secretariat. Please do not reply to this email.</td></tr>
  </table></td></tr></table></body></html>`;
}
