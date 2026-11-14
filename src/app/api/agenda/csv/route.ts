import { getProgramme } from "@/lib/queries";
import { toCsv, csvResponse } from "@/lib/csv";
import { fmtDate, fmtTime24, SESSION_TYPE_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";
/** D6 (13 Nov): the published agenda as CSV (respects the type and hall filters). */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const type = (u.get("type") || "").toUpperCase(), hall = u.get("hall") || "";
  const rows = (await getProgramme()).filter((p) => p.type !== "BREAK" && (!type || p.type === type) && (!hall || p.hall === hall)).map((p) => ({
    Day: p.day === 0 ? "Workshop" : `Day ${p.day}`, Date: fmtDate(p.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    Start: fmtTime24(p.startsAt), End: fmtTime24(p.endsAt), Type: SESSION_TYPE_LABEL[p.type] ?? p.type, Session: p.title, Hall: p.hall ?? "", Department: p.department ?? "",
  }));
  return csvResponse("lnh-symposium-agenda.csv", toCsv(rows.length ? rows : [{ Day: "", Date: "", Start: "", End: "", Type: "", Session: "", Hall: "", Department: "" }]));
}
