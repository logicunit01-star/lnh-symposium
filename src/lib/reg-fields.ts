// Registration Forms 2027 (LNH, received 1 Nov 2026): shared by the client forms and the server.

export const PROVINCES = ["Sindh", "Punjab", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu & Kashmir"];

/** Fee tiers and their designations (defaults; the live mapping is fee_category.designations, editable in Event Settings). */
export const DEFAULT_TIERS: { code: string; early: number; regular: number; designations: string[] }[] = [
  { code: "T1", early: 1050, regular: 1500, designations: ["Undergraduate", "House Officer", "Medical Officer", "Student", "Nurse", "Technician", "Hospital Staff", "Physiotherapist", "Pharmacist"] },
  { code: "T2", early: 2000, regular: 2500, designations: ["Post Graduate", "Resident", "Asst. Manager"] },
  { code: "T3", early: 3000, regular: 3500, designations: ["Senior Registrar", "Fellow", "Deputy Manager"] },
  { code: "T4", early: 5000, regular: 6000, designations: ["Faculty", "Consultant", "Manager", "Head of Department", "General Practitioner"] },
];

export const GUEST_ROLES: Record<string, string> = { INVITED_SPEAKER: "Invited Speaker", CHAIRPERSON: "Chair Person", MODERATOR: "Moderator", PANELIST: "Panelist" };
export const REG_TYPE_LABEL: Record<string, string> = { PARTICIPANT: "Participant", GUEST: "Guest", VOLUNTEER: "Volunteer" };

/** CNIC 12345-1234567-1 for Pakistan; passport number for other countries. Returns the normalised value or null if invalid. */
export function normaliseCnic(v: string, country?: string | null) {
  const raw = (v || "").trim();
  const pk = !country || /^pakistan$/i.test(country.trim());
  if (pk) {
    const d = raw.replace(/\D/g, "");
    return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : null;
  }
  return /^[A-Za-z0-9-]{5,20}$/.test(raw) ? raw.toUpperCase() : null;
}
export const maskCnic = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 13); return d.length > 12 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
export const maskPhone = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d; };
export const PHONE_RE = /^(\+92|0092|0)?3\d{2}[- ]?\d{7}$/;
