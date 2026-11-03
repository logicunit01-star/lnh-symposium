export type Perm =
  | "dashboard" | "registrations" | "registrations.edit" | "checkin" | "sessions" | "sessions.edit"
  | "abstracts" | "abstracts.review" | "feedback" | "content" | "settings" | "users" | "messages" | "notifications" | "certificates"
  // Workshop Programme (WP) committee workflow
  | "workshops" | "workshops.all" | "workshops.submit" | "workshops.edit" | "workshops.review" | "venues"
  // Scientific programme
  | "dept.abstracts" | "dept.sessions" | "dept.guests" | "dept.flyers" | "programme" | "programme.edit" | "programme.approve" | "invitations" | "departments"
  // Marketing (workshop flyer review only) and Food department (read-only catering view)
  | "flyers" | "catering"
  // Automated email management (templates, schedule, sent log) and volunteer approvals
  | "emails" | "volunteers";

const WP: Perm[] = ["workshops", "workshops.all", "workshops.submit", "workshops.edit", "workshops.review", "venues"];
const SCI: Perm[] = ["programme", "programme.edit", "programme.approve", "invitations", "departments"];
const ALL: Perm[] = [...SCI, "flyers", "catering", "dashboard", "registrations", "registrations.edit", "checkin", "sessions", "sessions.edit", "abstracts", "abstracts.review", "feedback", "content", "settings", "users", "messages", "notifications", "certificates", "emails", "volunteers", ...WP];

/**
 * Note (SC feedback, 29 Oct 2026): abstract accept / reject / return decisions are made only in the HOD (department) portal.
 * "abstracts.review" on the admin side covers reassigning, venue placement and decision emails, not the decision itself.
 * After the agenda deadline only the Scientific Committee (and Super Admin) edit and finalise sessions; see editRule().
 */
export const ROLE_PERMS: Record<string, Perm[]> = {
  SUPER_ADMIN: ALL.filter((p) => !p.startsWith("dept.")),
  ADMIN: ALL.filter((p) => p !== "users" && !p.startsWith("dept.")),
  // Symposium secretariat: runs the event; pre-fills sessions before the deadline; cannot finalise the programme
  SECRETARIAT: ALL.filter((p) => p !== "users" && p !== "settings" && p !== "programme.approve" && !p.startsWith("dept.")),
  // Co-Chairs: change and approve
  WP_CHAIR: ["dashboard", "sessions", "checkin", "feedback", ...WP],
  // Committee members: read and change (mark under review, edit unlocked requests), cannot approve/reject
  WP_MEMBER: ["sessions", "feedback", "workshops", "workshops.all", "workshops.edit"],
  // Department login (one per speciality): workshops, abstract review, session agenda, guest approvals, session flyer approval
  HOD: ["workshops", "workshops.submit", "dept.abstracts", "dept.sessions", "dept.guests", "dept.flyers"],
  // Scientific Committee: edits and finalises the scientific agenda (also after the deadline)
  SCIENTIFIC_COMMITTEE: ["dashboard", "sessions", "abstracts", "abstracts.review", "feedback", "programme", "programme.edit", "programme.approve", "invitations"],
  // Scientific Committee Chair: approves sessions, releases the programme, the only role that may change an HOD-approved session flyer
  SC_CHAIR: ["dashboard", "sessions", "abstracts", "abstracts.review", "feedback", "programme", "programme.edit", "programme.approve", "invitations", "departments", "venues", "emails"],
  // Marketing department designated users: review workshop flyers only
  MARKETING: ["flyers"],
  // Food department: read-only headcounts for catering
  CATERING: ["catering"],
  // Chairperson, Facilitation Committee: approves volunteer registrations
  FACILITATION_CHAIR: ["volunteers"],
  REGISTRATION_DESK: ["dashboard", "registrations", "registrations.edit", "checkin", "sessions", "certificates", "messages", "workshops", "workshops.all"],
  VIEWER: ["dashboard", "registrations", "sessions", "feedback", "workshops", "workshops.all"],
};
export const can = (role: string | undefined, p: Perm) => !!role && (ROLE_PERMS[role] || []).includes(p);
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", SCIENTIFIC_COMMITTEE: "Scientific Committee", REGISTRATION_DESK: "Registration Desk", VIEWER: "Viewer",
  WP_CHAIR: "WP Committee Co-Chair", WP_MEMBER: "WP Committee Member", HOD: "Department login (HOD)", SC_CHAIR: "Scientific Committee Chair", SECRETARIAT: "Symposium Secretariat", MARKETING: "Marketing (flyer review)", CATERING: "Food department (read only)",
  FACILITATION_CHAIR: "Chairperson, Facilitation Committee",
};
/** Roles that may edit and finalise a scientific session after the department deadline. */
export const POST_LOCK_EDITORS = ["SC_CHAIR", "SCIENTIFIC_COMMITTEE", "SUPER_ADMIN"];
/** Roles that may change a session whose flyer the HOD has approved (locked). */
export const FLYER_LOCK_EDITORS = ["SC_CHAIR", "SUPER_ADMIN"];
/** Landing page for a role (first page it can open). */
export const homeFor = (role?: string) => can(role, "dashboard") ? "/admin" : can(role, "dept.abstracts") ? "/admin/dept" : can(role, "workshops") ? "/admin/workshops"
  : can(role, "flyers") ? "/admin/flyers" : can(role, "catering") ? "/admin/catering" : can(role, "volunteers") ? "/admin/volunteers" : "/admin/login";
