"use client";
import { useState } from "react";
import { DIAL } from "@/lib/reg-fields";
import { cn } from "@/lib/utils";

/**
 * Mobile / WhatsApp number with a country code (issues sheet 16 Nov 2026: doctors from abroad).
 * Stored values: Pakistan "03XX-XXXXXXX" (as everywhere else in the portal), any other code "+971 501234567".
 * 26 Nov 2026 (LNH): with the country code chosen, the number is typed WITHOUT the leading 0. For +92 the field takes
 * 3XX-XXXXXXX (10 digits, starting with 3); a leading 0 (or a pasted +92 / 0092 / 92) is dropped as it is typed.
 */
const CODES = [...new Set(Object.values(DIAL))].sort((a, b) => (a === "92" ? -1 : b === "92" ? 1 : Number(a) - Number(b)));
const label = (c: string) => `+${c} ${Object.entries(DIAL).filter(([, v]) => v === c).map(([k]) => (k === "United Arab Emirates" ? "UAE" : k === "United Kingdom" ? "UK" : k === "United States" ? "USA" : k)).join(" / ")}`;

export const splitPhone = (v: string) => {
  const m = v.match(/^\+(\d{1,4}) (\d*)$/);
  return m && m[1] !== "92" ? { code: m[1], num: m[2] } : { code: "92", num: v };
};
/** Pakistani digits as typed after +92: no country code, no leading 0, at most 10 digits. */
const pkDigits = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("0092")) d = d.slice(4);
  else if (d.length > 10 && d.startsWith("92")) d = d.slice(2);
  return d.replace(/^0+/, "").slice(0, 10);
};
const showPk = (d: string) => (d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d);
/** Stored value from a country code and what was typed. Pakistan keeps the 03XX-XXXXXXX form. */
export const joinPhone = (code: string, num: string) => {
  if (code !== "92") return `+${code} ${num.replace(/\D/g, "").replace(/^0+/, "").slice(0, 14)}`;
  const d = pkDigits(num);
  return d ? `0${d.slice(0, 3)}${d.length > 3 ? `-${d.slice(3)}` : ""}` : "";
};

export function PhoneInput({ id, value, onChange, className, invalid }: { id?: string; value: string; onChange: (v: string) => void; className?: string; invalid?: boolean }) {
  const { code, num } = splitPhone(value);
  const pk = code === "92";
  const shown = pk ? showPk(pkDigits(num)) : num;
  const [hint, setHint] = useState("");
  const type = (raw: string) => {
    if (pk) {
      const d = pkDigits(raw);
      // Pakistani mobile numbers start with 3 after +92
      if (d && d[0] !== "3") { setHint("After +92 the mobile number starts with 3, e.g. 333-1234567."); return; }
      setHint(/^\s*0/.test(raw) ? "No need for the 0: +92 is already selected." : "");
    }
    onChange(joinPhone(code, raw));
  };
  return (
    <div className={className}>
      <div className="flex gap-2">
        <select aria-label="Country code" className="input mono w-[7.5rem] shrink-0 px-2" value={code}
          onChange={(e) => { setHint(""); onChange(joinPhone(e.target.value, e.target.value === "92" ? "" : pk ? pkDigits(num) : num.replace(/\D/g, ""))); }}>
          {CODES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
        <input id={id} inputMode="numeric" autoComplete="tel-national" aria-invalid={invalid || undefined} placeholder={pk ? "3XX-XXXXXXX" : "e.g. 501234567"}
          aria-describedby={hint && id ? `${id}-hint` : undefined} className="input mono min-w-0 flex-1" value={shown} onChange={(e) => type(e.target.value)} />
      </div>
      {hint && <p id={id ? `${id}-hint` : undefined} role="status" className="mt-1 text-xs text-amber-500">{hint}</p>}
    </div>
  );
}
