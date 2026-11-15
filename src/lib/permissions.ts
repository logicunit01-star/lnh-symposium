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
  | "emails" | "volunteers"
  // N5 (13 Nov): workshop attendance verification by the department focal person
  | "attendance"
  // PayPro switch and credentials: Super Admin only (14 Nov 2026)
  | "payments"
  // Email settings (mailboxes, delivery mode, sender of each notification): Super Admin and Admin (14 Nov 2026)
  | "mail"
  // WhatsApp & SMS (eOcean settings, template IDs) and the message queue: Super Admin only (14.11.2026 Part C)
  | "messaging";

const WP: Perm[] = ["workshops", "workshops.all", "workshops.submit", "workshops.edit", "workshops.review", "venues"];
const SCI: Perm[] = ["programme", "programme.edit", "programme.approve", "invitations", "departments"];
const ALL: Perm[] = [...SCI, "flyers", "catering", "dashboard", "registrations", "registrations.edit", "checkin", "sessions", "sessions.edit", "abstracts", "abstracts.review", "feedback", "content", "settings", "users", "messages", "notifications", "certificates", "emails", "volunteers", "attendance", ...WP];

/**
 * Note (SC feedback, 29 Oct 2026): abstract accept / reject / return decisions are made only in the HOD (department) portal.
 * "abstracts.review" on the admin side covers reassigning, venue placement and decision emails, not the decision itself.
 * After the agenda deadline only the Scientific Committee (and Super Admin) edit and finalise sessions; see editRule().
 */
export const ROLE_PERMS: Record<string, Perm[]> = {
  SUPER_ADMIN: [...ALL.filter((p) => !p.startsWith("dept.")), "payments", "mail", "messaging"],
  ADMIN: [...ALL.filter((p) => p !== "users" && !p.startsWith("dept.")), "mail"],
  // Symposium secretariat: runs the event; pre-fills sessions before the deadline; cannot finalise the programme
  SECRETARIAT: ALL.filter((p) => p !== "users" && p !== "settings" && p !== "programme.approve" && !p.startsWith("dept.")),
  // Co-Chairs: change and approve
  WP_CHAIR: ["dashboard", "sessions", "checkin", "feedback", "attendance", ...WP],
  // Committee members: read and change (mark under review, edit unlocked requests), cannot approve/reject
  WP_MEMBER: ["sessions", "feedback", "workshops", "workshops.all", "workshops.edit"],
  // Department staff only (Heads, focal persons, coordinators): no global access; everything comes from their department roles below
  DEPARTMENT: [],
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
/**
 * Department roles (15 Nov 2026): a user belongs to any number of departments, with one role in each.
 * Their permissions apply to those departments only (see lib/dept.ts, staffScope, attendanceScope).
 */
export const DEPT_ROLES = ["HEAD", "COORDINATOR", "FOCAL_PERSON"] as const;
export type DeptRole = (typeof DEPT_ROLES)[number];
export const DEPT_ROLE_LABEL: Record<DeptRole, string> = { HEAD: "Head of Department", COORDINATOR: "Coordinator", FOCAL_PERSON: "Focal person (attendance)" };
export const DEPT_ROLE_PERMS: Record<DeptRole, Perm[]> = {
  // department portal: workshops, abstract review, session agenda, guest approvals, session flyer approval
  HEAD: ["workshops", "workshops.submit", "dept.abstracts", "dept.sessions", "dept.guests", "dept.flyers"],
  // helps the Head: workshop requests, session agenda and flyers; no abstract decisions or guest approvals
  COORDINATOR: ["workshops", "workshops.submit", "dept.sessions", "dept.flyers"],
  // N5: confirms workshop attendance online (own department only); one active per department
  FOCAL_PERSON: ["attendance"],
};
export type Membership = { department: string; role: DeptRole };

/** Global role permissions plus those of every department role. */
export const permsFor = (role: string | undefined, depts: readonly Membership[] = []) =>
  [...new Set([...(role ? ROLE_PERMS[role] ?? [] : []), ...depts.flatMap((d) => DEPT_ROLE_PERMS[d.role] ?? [])])];
/** Departments where the user's role grants permission p. */
export const deptsWith = (depts: readonly Membership[] | undefined, p: Perm) => [...new Set((depts ?? []).filter((d) => DEPT_ROLE_PERMS[d.role]?.includes(p)).map((d) => d.department))];

type Who = string | { role?: string; perms?: readonly string[] } | null | undefined;
/** who: a signed-in staff member (uses the permissions loaded fresh for this request) or a bare global role. */
export const can = (who: Who, p: Perm) => {
  if (!who) return false;
  if (typeof who === "string") return (ROLE_PERMS[who] || []).includes(p);
  return who.perms ? who.perms.includes(p) : !!who.role && (ROLE_PERMS[who.role] || []).includes(p);
};
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", SCIENTIFIC_COMMITTEE: "Scientific Committee", REGISTRATION_DESK: "Registration Desk", VIEWER: "Viewer",
  WP_CHAIR: "WP Committee Co-Chair", WP_MEMBER: "WP Committee Member", HOD: "Department login (HOD)", SC_CHAIR: "Scientific Committee Chair", SECRETARIAT: "Symposium Secretariat", MARKETING: "Marketing (flyer review)", CATERING: "Food department (read only)",
  FACILITATION_CHAIR: "Chairperson, Facilitation Committee", DEPARTMENT: "Department staff only (no global access)",
};
/** One line per permission, for the Users & Roles screen. */
export const PERM_LABEL: Record<Perm, string> = {
  dashboard: "Overview dashboard", registrations: "View registrations", "registrations.edit": "Edit registrations, onsite desk", checkin: "Check-in",
  sessions: "View sessions", "sessions.edit": "Edit sessions", abstracts: "View abstracts", "abstracts.review": "Reassign abstracts, decision emails",
  feedback: "Feedback results", content: "Website content", settings: "Event settings", users: "Users & roles", messages: "Contact messages",
  notifications: "Reminders & certificates", certificates: "Issue certificates", workshops: "Workshop requests (view)", "workshops.all": "All departments' workshops",
  "workshops.submit": "Submit workshop requests", "workshops.edit": "Edit workshop requests", "workshops.review": "Approve / reject workshops", venues: "Venues",
  "dept.abstracts": "Department: abstract review", "dept.sessions": "Department: session agenda", "dept.guests": "Department: guest approvals", "dept.flyers": "Department: session flyers",
  programme: "Scientific programme (view)", "programme.edit": "Edit programme", "programme.approve": "Approve and release programme", invitations: "Invitations",
  departments: "Departments and department logins", flyers: "Workshop flyer review", catering: "Catering headcounts", emails: "Email templates and schedule",
  volunteers: "Volunteer approvals", attendance: "Workshop attendance", payments: "PayPro settings", mail: "Email settings", messaging: "WhatsApp & SMS settings",
};
/** Roles that may edit and finalise a scientific session after the department deadline. */
export const POST_LOCK_EDITORS = ["SC_CHAIR", "SCIENTIFIC_COMMITTEE", "SUPER_ADMIN"];
/** Roles that may change a session whose flyer the HOD has approved (locked). */
export const FLYER_LOCK_EDITORS = ["SC_CHAIR", "SUPER_ADMIN"];
/** Landing page for a role (first page it can open). */
export const homeFor = (role?: Who) => can(role, "dashboard") ? "/admin" : (can(role, "dept.abstracts") || can(role, "dept.sessions")) ? "/admin/dept" : can(role, "workshops") ? "/admin/workshops"
  : can(role, "flyers") ? "/admin/flyers" : can(role, "catering") ? "/admin/catering" : can(role, "volunteers") ? "/admin/volunteers" : can(role, "attendance") ? "/admin/attendance" : "/admin/no-access";

/** Staff passwords (Users & roles and npm run admin:password). */
export const MIN_STAFF_PASSWORD = 12;
