"use client";
import { useState } from "react";

/** Tiny helper: POST JSON, surface field errors. */
export function useSubmit<T = any>(url: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  async function submit(body: unknown): Promise<T | null> {
    setLoading(true); setError(null); setFields({});
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || "Something went wrong."); setFields(j.fields || {}); return null; }
      return j as T;
    } catch { setError("Network error — please try again."); return null; }
    finally { setLoading(false); }
  }
  return { submit, loading, error, fields, setFields };
}
