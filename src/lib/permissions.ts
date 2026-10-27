export type Perm =
  | "dashboard" | "registrations" | "registrations.edit" | "checkin" | "sessions" | "sessions.edit"
  | "abstracts" | "abstracts.review" | "feedback" | "content" | "settings" | "users" | "messages" | "notifications" | "certificates"
  // Workshop Programme (WP) committee workflow
  | "workshops" | "workshops.all" | "workshops.submit" | "workshops.edit" | "workshops.review" | "venues"
  // Scientific programme
  | "dept.abstracts" | "dept.sessions" | "programme" | "programme.edit" | "programme.approve" | "invitations" | "departments"
  // Marketing (flyer review only) and Food department (read-only catering view)
  | "flyers" | "catering";

const WP: Perm[] = ["workshops", "workshops.all", "workshops.submit", "workshops.edit", "workshops.review", "venues"];
const SCI: Perm[] = ["programme", "programme.edit", "programme.approve", "invitations", "departments"];
const ALL: Perm[] = [...SCI, "flyers", "catering", "dashboard", "registrations", "registrations.edit", "checkin", "sessions", "sessions.edit", "abstracts", "abstracts.review", "feedback", "content", "settings", "users", "messages", "notifications", "certificates", ...WP];

export const ROLE_PERMS: Record<string, Perm[]> = {
  SUPER_ADMIN: ALL.filter((p) => !p.startsWith("dept.")),
  ADMIN: ALL.filter((p) => p !== "users" && !p.startsWith("dept.")),
  // Symposium secretariat: runs the event; edits after lock only with SC Chair authorisation
  SECRETARIAT: ALL.filter((p) => p !== "users" && p !== "settings" && p !== "programme.approve" && !p.startsWith("dept.")),
  // Co-Chairs: change and approve
  WP_CHAIR: ["dashboard", "sessions", "checkin", "feedback", ...WP],
  // Committee members: read and change (mark under review, edit unlocked requests), cannot approve/reject
  WP_MEMBER: ["sessions", "feedback", "workshops", "workshops.all", "workshops.edit"],
  // Heads of Department: submit Form A and track their own department only
  // Department login (one per speciality): workshops, abstract review and scientific session agenda
  HOD: ["workshops", "workshops.submit", "dept.abstracts", "dept.sessions"],
  SCIENTIFIC_COMMITTEE: ["dashboard", "sessions", "abstracts", "abstracts.review", "feedback", "programme", "programme.edit", "invitations"],
  // Scientific Committee Chair: approves sessions, authorises post-lock changes, releases the programme
  SC_CHAIR: ["dashboard", "sessions", "abstracts", "abstracts.review", "feedback", "programme", "programme.edit", "programme.approve", "invitations", "departments", "venues"],
  // Marketing department designated users: review workshop flyers only
  MARKETING: ["flyers"],
  // Food department: read-only headcounts for catering
  CATERING: ["catering"],
  REGISTRATION_DESK: ["dashboard", "registrations", "registrations.edit", "checkin", "sessions", "certificates", "messages", "workshops", "workshops.all"],
  VIEWER: ["dashboard", "registrations", "sessions", "feedback", "workshops", "workshops.all"],
};
export const can = (role: string | undefined, p: Perm) => !!role && (ROLE_PERMS[role] || []).includes(p);
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", SCIENTIFIC_COMMITTEE: "Scientific Committee", REGISTRATION_DESK: "Registration Desk", VIEWER: "Viewer",
  WP_CHAIR: "WP Committee Co-Chair", WP_MEMBER: "WP Committee Member", HOD: "Department login (HOD)", SC_CHAIR: "Scientific Committee Chair", SECRETARIAT: "Symposium Secretariat", MARKETING: "Marketing (flyer review)", CATERING: "Food department (read only)",
};
/** Landing page for a role (first page it can open). */
export const homeFor = (role?: string) => can(role, "dashboard") ? "/admin" : can(role, "dept.abstracts") ? "/admin/dept" : can(role, "workshops") ? "/admin/workshops"
  : can(role, "flyers") ? "/admin/flyers" : can(role, "catering") ? "/admin/catering" : "/admin/login";
