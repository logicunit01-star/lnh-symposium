import type { ProgrammeSession } from "./queries";
import { fmtDate, fmtTime24, ymdPk } from "./utils";

export type WorkshopDTO = {
  id: string; slug: string; venueId: string | null; building: string | null; title: string; description: string | null; department: string | null; format: string | null; track: string | null;
  date: string; dateLabel: string; timeLabel: string; hall: string | null; cme: number | null;
  capacity: number | null; left: number | null; fee: number; regularFee: number;
  faculty: { name: string; degrees: string | null; designation: string | null; role: string }[];
};

export function toWorkshopDTO(s: ProgrammeSession, taken: Record<string, number>, early: boolean): WorkshopDTO {
  const fee = early && s.earlyFee != null ? s.earlyFee : s.fee;
  return {
    id: s.id, slug: s.slug, venueId: s.venueId, building: s.venue ? `${s.venue.building}${s.venue.floor ? `, ${s.venue.floor} floor` : ""}` : null, title: s.title, description: s.description, department: s.department, format: s.format, track: s.track,
    date: ymdPk(s.startsAt), dateLabel: fmtDate(s.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    timeLabel: `${fmtTime24(s.startsAt)}–${fmtTime24(s.endsAt)}`, hall: s.hall, cme: s.cmeHours,
    capacity: s.capacity, left: s.capacity == null ? null : Math.max(0, s.capacity - (taken[s.id] ?? 0)),
    fee, regularFee: s.fee,
    faculty: s.speakers.length
      ? s.speakers.map(({ speaker, role }) => ({ name: `${speaker.title ?? ""} ${speaker.name}`.trim(), degrees: speaker.degrees, designation: speaker.designation, role }))
      : s.leadFaculty ? [{ name: s.leadFaculty, degrees: s.facultyDegrees, designation: null, role: "Lead Faculty" }] : [],
  };
}
