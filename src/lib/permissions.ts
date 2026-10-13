export type Perm =
  | "dashboard" | "registrations" | "registrations.edit" | "checkin" | "sessions" | "sessions.edit"
  | "abstracts" | "abstracts.review" | "feedback" | "content" | "settings" | "users" | "messages" | "notifications" | "certificates";

const ALL: Perm[] = ["dashboard", "registrations", "registrations.edit", "checkin", "sessions", "sessions.edit", "abstracts", "abstracts.review", "feedback", "content", "settings", "users", "messages", "notifications", "certificates"];

export const ROLE_PERMS: Record<string, Perm[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "users"),
  SCIENTIFIC_COMMITTEE: ["dashboard", "sessions", "abstracts", "abstracts.review", "feedback"],
  REGISTRATION_DESK: ["dashboard", "registrations", "registrations.edit", "checkin", "sessions", "certificates", "messages"],
  VIEWER: ["dashboard", "registrations", "sessions", "feedback"],
};
export const can = (role: string | undefined, p: Perm) => !!role && (ROLE_PERMS[role] || []).includes(p);
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", SCIENTIFIC_COMMITTEE: "Scientific Committee", REGISTRATION_DESK: "Registration Desk", VIEWER: "Viewer",
};
