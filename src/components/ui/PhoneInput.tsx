"use client";
import { DIAL } from "@/lib/reg-fields";
import { cn } from "@/lib/utils";

/**
 * Mobile / WhatsApp number with a country code (issues sheet 16 Nov 2026: doctors from abroad).
 * Pakistan keeps the familiar 03XX-XXXXXXX; any other code is stored as "+971 501234567".
 */
const CODES = [...new Set(Object.values(DIAL))].sort((a, b) => (a === "92" ? -1 : b === "92" ? 1 : Number(a) - Number(b)));
const label = (c: string) => `+${c} ${Object.entries(DIAL).filter(([, v]) => v === c).map(([k]) => (k === "United Arab Emirates" ? "UAE" : k === "United Kingdom" ? "UK" : k === "United States" ? "USA" : k)).join(" / ")}`;

export const splitPhone = (v: string) => {
  const m = v.match(/^\+(\d{1,4}) (\d*)$/);
  return m && m[1] !== "92" ? { code: m[1], num: m[2] } : { code: "92", num: v };
};
const maskPk = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d; };
export const joinPhone = (code: string, num: string) => (code === "92" ? maskPk(num) : `+${code} ${num.replace(/\D/g, "").replace(/^0+/, "").slice(0, 14)}`);

export function PhoneInput({ id, value, onChange, className, invalid }: { id?: string; value: string; onChange: (v: string) => void; className?: string; invalid?: boolean }) {
  const { code, num } = splitPhone(value);
  return (
    <div className={cn("flex gap-2", className)}>
      <select aria-label="Country code" className="input mono w-[7.5rem] shrink-0 px-2" value={code} onChange={(e) => onChange(joinPhone(e.target.value, e.target.value === "92" ? "" : num.replace(/\D/g, "")))}>
        {CODES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
      </select>
      <input id={id} inputMode="numeric" autoComplete="tel" aria-invalid={invalid || undefined} placeholder={code === "92" ? "03XX-XXXXXXX" : "e.g. 501234567"}
        className="input mono min-w-0 flex-1" value={num} onChange={(e) => onChange(joinPhone(code, e.target.value))} />
    </div>
  );
}
