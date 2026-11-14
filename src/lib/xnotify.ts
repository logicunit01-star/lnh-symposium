import "server-only";
import type { NotifyConfig } from "./notify-config";

/**
 * eOcean xNotify (LNH's WhatsApp/SMS provider, document received 14 Nov 2026):
 * POST {api_url} with headers x-api-key and Authorization: Bearer {"id":…,"username":…},
 * body { to: "92…", email, message_template_id, preferred_channel: "Whatsapp" | SMS name, pdf_url (a public file, here the QR image) }.
 * The response format is not documented: any 2xx answer without an error flag counts as sent.
 */
export async function xnotifySend(cfg: NotifyConfig, m: { to: string; email?: string; templateId: string; channel: string; mediaUrl?: string }) {
  if (!cfg.key || !cfg.authId || !cfg.authUsername) throw new Error("eOcean is not configured (API key, account ID and username in Admin → WhatsApp & SMS).");
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20_000);
  try {
    const r = await fetch(cfg.apiUrl, {
      method: "POST", signal: ctl.signal, cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json", "x-api-key": cfg.key, Authorization: `Bearer ${JSON.stringify({ id: cfg.authId, username: cfg.authUsername })}` },
      body: JSON.stringify({ to: m.to, email: m.email ?? "", message_template_id: m.templateId, preferred_channel: m.channel, ...(m.mediaUrl ? { pdf_url: m.mediaUrl } : {}) }),
    });
    const text = await r.text();
    let j: any = null; try { j = JSON.parse(text); } catch { /* not JSON */ }
    const flagged = j && (j.success === false || j.status === false || j.error || /^(error|failed|fail)$/i.test(String(j.status ?? "")));
    if (!r.ok || flagged) throw new Error(`eOcean answered ${r.status}: ${(j?.message || j?.error || text || "").toString().slice(0, 200)}`);
    const ref = j?.id ?? j?.message_id ?? j?.messageId ?? j?.data?.id ?? j?.data?.message_id ?? null;
    return { ref: ref ? String(ref) : null };
  } catch (e: any) {
    throw new Error(e?.name === "AbortError" ? "eOcean did not respond in time" : String(e?.message || e));
  } finally { clearTimeout(t); }
}
