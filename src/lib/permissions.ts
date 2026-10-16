export type Perm =
  | "dashboard" | "registrations" | "registrations.edit" | "checkin" | "sessions" | "sessions.edit"
  | "abstracts" | "abstracts.review" | "feedback" | "content" | "settings" | "users" | "messages" | "notifications" | "certificates"
  // Workshop Programme (WP) committee workflow
  | "workshops" | "workshops.all" | "workshops.submit" | "workshops.edit" | "workshops.review" | "venues";

const WP: Perm[] = ["workshops", "workshops.all", "workshops.submit", "workshops.edit", "workshops.review", "venues"];
const ALL: Perm[] = ["dashboard", "registrations", "registrations.edit", "checkin", "sessions", "sessions.edit", "abstracts", "abstracts.review", "feedback", "content", "settings", "users", "messages", "notifications", "certificates", ...WP];

export const ROLE_PERMS: Record<string, Perm[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "users"),
  // Co-Chairs: change and approve
  WP_CHAIR: ["dashboard", "sessions", "checkin", "feedback", ...WP],
  // Committee members: read and change (mark under review, edit unlocked requests), cannot approve/reject
  WP_MEMBER: ["sessions", "feedback", "workshops", "workshops.all", "workshops.edit"],
  // Heads of Department: submit Form A and track their own department only
  HOD: ["workshops", "workshops.submit"],
  SCIENTIFIC_COMMITTEE: ["dashboard", "sessions", "abstracts", "abstracts.review", "feedback"],
  REGISTRATION_DESK: ["dashboard", "registrations", "registrations.edit", "checkin", "sessions", "certificates", "messages", "workshops", "workshops.all"],
  VIEWER: ["dashboard", "registrations", "sessions", "feedback", "workshops", "workshops.all"],
};
export const can = (role: string | undefined, p: Perm) => !!role && (ROLE_PERMS[role] || []).includes(p);
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", SCIENTIFIC_COMMITTEE: "Scientific Committee", REGISTRATION_DESK: "Registration Desk", VIEWER: "Viewer",
  WP_CHAIR: "WP Committee Co-Chair", WP_MEMBER: "WP Committee Member", HOD: "Head of Department",
};
/** Landing page for a role (first page it can open). */
export const homeFor = (role?: string) => can(role, "dashboard") ? "/admin" : can(role, "workshops") ? "/admin/workshops" : "/admin/login";
