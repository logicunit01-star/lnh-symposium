import "server-only";
import type { NotifyConfig } from "./notify-config";

/**
 * eOcean xNotify (16 Nov 2026, as in the "Request Headers" and "Request Body" sections of the xNotify Send Message API v2):
 * POST {api_url}, headers Content-Type, Accept and x-api-key; body { to: "92…", email, message_template_id (integer),
 * preferred_channel, pdf_url (public file, here the QR image) }. xNotify itself delivers by WhatsApp or SMS.
 * The response format is not documented: any 2xx answer without an error flag counts as sent.
 */
export async function xnotifySend(cfg: NotifyConfig, m: { to: string; email?: string; templateId: string; mediaUrl?: string; vars?: Record<string, string> }) {
  if (!cfg.key) throw new Error("xNotify is not configured (API key in Admin → WhatsApp & SMS).");
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20_000);
  try {
    const r = await fetch(cfg.apiUrl, {
      method: "POST", signal: ctl.signal, cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*", "x-api-key": cfg.key },
      // 17 Nov 2026 documents: template variables in the body; no email (xNotify would email the participant too, and the portal
      // already does); preferred_channel left out when empty so xNotify's Smart / Custom Routing chooses the channel
      body: JSON.stringify({ to: m.to, message_template_id: Number(m.templateId), ...(cfg.waChannel?.trim() ? { preferred_channel: cfg.waChannel.trim() } : {}), ...(m.vars ?? {}), ...(m.mediaUrl ? { pdf_url: m.mediaUrl } : {}) }),
    });
    const text = await r.text();
    let j: any = null; try { j = JSON.parse(text); } catch { /* not JSON */ }
    const flagged = j && (j.success === false || j.status === false || j.error || /^(error|failed|fail|rejected)$/i.test(String(j.status ?? "")) || (Number(j.statusCode) >= 400));
    if (!r.ok || flagged) throw new Error(`xNotify answered ${r.status}: ${(j?.message || j?.error || text || "").toString().slice(0, 200)}`);
    const ref = j?.messageid ?? j?.id ?? j?.message_id ?? j?.messageId ?? j?.data?.id ?? j?.data?.message_id ?? null; // documented: { statusCode: 200, status: "accepted", messageid, accepttime }
    return { ref: ref ? String(ref) : null };
  } catch (e: any) {
    throw new Error(e?.name === "AbortError" ? "xNotify did not respond in time" : String(e?.message || e));
  } finally { clearTimeout(t); }
}
