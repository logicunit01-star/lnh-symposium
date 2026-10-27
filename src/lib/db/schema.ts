// LNH Symposium — database schema (PostgreSQL, Drizzle ORM)
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, serial, real, jsonb, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date());

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "ADMIN", "SCIENTIFIC_COMMITTEE", "REGISTRATION_DESK", "VIEWER", "WP_CHAIR", "WP_MEMBER", "HOD", "SC_CHAIR", "SECRETARIAT", "MARKETING", "CATERING"]);
export const sessionTypeEnum = pgEnum("session_type", ["KEYNOTE", "PLENARY", "SCIENTIFIC", "PANEL", "WORKSHOP", "CEREMONY", "BREAK"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "PAID", "FAILED", "WAIVED", "REFUNDED"]);
export const abstractTypeEnum = pgEnum("abstract_type", ["ORAL", "POSTER"]);
export const abstractStatusEnum = pgEnum("abstract_status", ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REVISION", "BACK"]);
export const channelEnum = pgEnum("channel", ["EMAIL", "SMS"]);

export type SessionSlot = { key: string; day: string; start: string; end: string; optional?: boolean; special?: "PLENARY" | "DEBATE" };

/** Singleton row (id = 1) with editable symposium settings. */
export const event = pgTable("event", {
  id: integer("id").primaryKey().default(1),
  edition: text("edition").notNull().default("9th"),
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  mainTheme: text("main_theme").notNull().default("Shaping the new era of healthcare: AI-Robotics and Digitization"),
  eventDays: jsonb("event_days").$type<string[]>().notNull().default([]), // ISO dates, e.g. ["2027-01-20","2027-01-30","2027-01-31"]
  regPrefix: text("reg_prefix").notNull().default("SYM"),
  processingFeePct: real("processing_fee_pct").notNull().default(0),
  tagline: text("tagline").notNull().default(""),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  venue: text("venue").notNull(),
  virtualLink: text("virtual_link"),
  heroVideoUrl: text("hero_video_url"),
  registrationOpen: boolean("registration_open").notNull().default(true),
  earlyBirdUntil: timestamp("early_bird_until", { withTimezone: true }),
  abstractOpen: timestamp("abstract_open", { withTimezone: true }),
  abstractDeadline: timestamp("abstract_deadline", { withTimezone: true }),
  abstractWordLimit: integer("abstract_word_limit").notNull().default(300),
  contactEmail: text("contact_email").notNull().default("symposium@lnh.edu.pk"),
  contactPhone: text("contact_phone").notNull().default("+92 21 111 456 456"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  youtube: text("youtube"),
  x: text("x"),
  videos: jsonb("videos").$type<string[]>().notNull().default([]),
  // Workshop programme (pre-symposium)
  workshopStart: timestamp("workshop_start", { withTimezone: true }),
  workshopEnd: timestamp("workshop_end", { withTimezone: true }),
  themeWeeks: jsonb("theme_weeks").$type<{ from: string; label: string }[]>().notNull().default([]),
  seatTarget: integer("seat_target").notNull().default(3000),
  usdRate: real("usd_rate").notNull().default(280),
  // Scientific programme (Scientific Committee)
  sessionSlots: jsonb("session_slots").$type<SessionSlot[]>().notNull().default([]),
  abstractP1Open: timestamp("abstract_p1_open", { withTimezone: true }),
  abstractP1Close: timestamp("abstract_p1_close", { withTimezone: true }),
  abstractP2Open: timestamp("abstract_p2_open", { withTimezone: true }),
  abstractP2Close: timestamp("abstract_p2_close", { withTimezone: true }),
  sciLockAt: timestamp("sci_lock_at", { withTimezone: true }), // departments edit session agendas until this date
  programmeReleasedAt: timestamp("programme_released_at", { withTimezone: true }),
  agendaTemplates: jsonb("agenda_templates").$type<Record<string, string>>().notNull().default({}),
  updatedAt: updated(),
});

export const feeCategory = pgTable("fee_category", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  fee: integer("fee").notNull(),
  earlyFee: integer("early_fee").notNull(),
  note: text("note"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  tier: text("tier").notNull().default("GENERAL"), // STUDENT | EMPLOYEE | GENERAL | FOREIGN (revenue dashboard)
});

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("VIEWER"),
  department: text("department"), // HOD scoping
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: created(),
});

export const speakers = pgTable("speakers", {
  id: id(),
  title: text("title"),
  name: text("name").notNull(),
  designation: text("designation"),
  institution: text("institution"),
  country: text("country").default("Pakistan"),
  bio: text("bio"),
  topic: text("topic"),
  photoUrl: text("photo_url"),
  degrees: text("degrees"),
  linkedin: text("linkedin"),
  featured: boolean("featured").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const committee = pgTable("committee_members", {
  id: id(),
  name: text("name").notNull(),
  designation: text("designation"),
  department: text("department"),
  role: text("role").notNull(),
  group: text("group").notNull().default("Organizing Committee"),
  photoUrl: text("photo_url"),
  order: integer("order").notNull().default(0),
});

/** Departments / specialities (master list). Abstract review state per department lives here. */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  p1SubmittedAt: timestamp("p1_submitted_at", { withTimezone: true }), // HOD sent Phase 1 decisions back
  p2Required: boolean("p2_required").notNull().default(false), // new abstracts assigned in Phase 2
  p2SubmittedAt: timestamp("p2_submitted_at", { withTimezone: true }),
});

/** Uploaded agenda template document per session format (SC V1.0: "Agenda template for each format must be uploaded"). Stored base64, max 5 MB. */
export const agendaTemplateFiles = pgTable("agenda_template_files", {
  format: text("format").primaryKey(),
  fileName: text("file_name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: text("data").notNull(),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Rooms on the LNH campus. Map position is a percentage on the campus schematic. */
export const venues = pgTable("venues", {
  id: id(),
  name: text("name").notNull().unique(),
  building: text("building").notNull(),
  floor: text("floor"),
  capacity: integer("capacity").notNull(),
  onlineFacility: text("online_facility"), // e.g. "Zoom + PTZ camera"; null = none
  equipment: text("equipment"),
  mapX: real("map_x").notNull().default(50),
  mapY: real("map_y").notNull().default(50),
  directions: text("directions"),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

export type EquipmentLine = { item: string; qty: number; source: string };

export const sessions = pgTable("sessions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  type: sessionTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  track: text("track"),
  department: text("department"),
  format: text("format"), // Simulation, Hands-on, Lecture, Panel, Drill
  status: text("status").notNull().default("APPROVED"), // DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED
  day: integer("day").notNull().default(1), // 0 = pre-conference workshop
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  hall: text("hall"),
  capacity: integer("capacity"), // null = unlimited
  fee: integer("fee").notNull().default(0), // PKR on top of conference fee
  earlyFee: integer("early_fee"),
  registrable: boolean("registrable").notNull().default(false),
  feedbackOpen: boolean("feedback_open").notNull().default(true),
  cmeHours: real("cme_hours"),
  // Workshop request (Form A) + committee workflow
  category: text("category"), // A = Multidisciplinary, B = Departmental
  themeWeek: integer("theme_week"),
  contributors: text("contributors"), // contributing departments
  venueId: text("venue_id").references(() => venues.id, { onDelete: "set null" }),
  leadFaculty: text("lead_faculty"),
  facultyDegrees: text("faculty_degrees"),
  facultyContact: text("faculty_contact"),
  facultyProfile: text("faculty_profile"), // education & experience
  facilitators: integer("facilitators").notNull().default(0),
  volunteers: integer("volunteers").notNull().default(0),
  technicians: integer("technicians").notNull().default(0),
  equipment: jsonb("equipment").$type<EquipmentLine[]>().notNull().default([]),
  proposedById: text("proposed_by_id").references(() => users.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedById: text("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  locked: boolean("locked").notNull().default(false),
  coChairDecision: text("co_chair_decision"), // RUN | MERGE | CANCEL | PROMOTE (low-fill remediation)
  // Scientific session proposal (department form)
  proposal: boolean("proposal").notNull().default(false), // true = submitted by a department; public only after programme release
  sessionFormat: text("session_format"), // INVITED_PAPERS | PAPERS_ONLY | GUEST_ONLY | PANEL | CASE_BASED | OTHER
  formatOther: text("format_other"),
  preferredSlots: jsonb("preferred_slots").$type<string[]>().notNull().default([]),
  expectedAudience: integer("expected_audience"),
  slotKey: text("slot_key"), // allotted slot
  editGrantUntil: timestamp("edit_grant_until", { withTimezone: true }), // SC Chair authorised a post-lock change
  // Marketing review of the generated workshop flyer: PENDING | APPROVED | CHANGES
  flyerStatus: text("flyer_status"),
  flyerNote: text("flyer_note"),
  flyerReviewedBy: text("flyer_reviewed_by"),
  flyerReviewedAt: timestamp("flyer_reviewed_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => ({ dayIdx: index("sessions_day_idx").on(t.day, t.startsAt) }));

export const sessionSpeakers = pgTable("session_speakers", {
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  speakerId: text("speaker_id").notNull().references(() => speakers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("Speaker"),
}, (t) => ({ pk: primaryKey({ columns: [t.sessionId, t.speakerId] }) }));

/** People on a scientific session (chairs, moderator, panelists, speakers, presenters) with invitation tracking. */
export const sessionPeople = pgTable("session_people", {
  id: id(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // CHAIR | CO_CHAIR | MODERATOR | PANELIST | SPEAKER | PRESENTER
  name: text("name").notNull(),
  designation: text("designation"),
  affiliation: text("affiliation"),
  phone: text("phone"),
  email: text("email"),
  topic: text("topic"),
  timeSlot: text("time_slot"),
  order: integer("order").notNull().default(0),
  abstractId: text("abstract_id").references(() => abstracts.id, { onDelete: "set null" }),
  inviteToken: text("invite_token").unique(),
  inviteStatus: text("invite_status").notNull().default("NOT_SENT"), // NOT_SENT | SENT | ACCEPTED | DECLINED | FAILED | WITHDRAWN
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  reminders: integer("reminders").notNull().default(0),
  lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),
  responseNote: text("response_note"),
}, (t) => ({ sIdx: index("sp_session_idx").on(t.sessionId) }));

/** Status history for workshop requests (audit trail). */
export const sessionReviews = pgTable("session_reviews", {
  id: id(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name"),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  createdAt: created(),
}, (t) => ({ sIdx: index("rev_session_idx").on(t.sessionId) }));

/** Waitlist for full workshops (first come, first served). */
export const waitlist = pgTable("waitlist", {
  id: id(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => ({ uq: uniqueIndex("waitlist_uq").on(t.sessionId, t.email) }));

/** Visitor / participant accounts (separate from staff users). */
export const accounts = pgTable("accounts", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  title: text("title").notNull(),
  gender: text("gender").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  pmdcNo: text("pmdc_no"),
  specialty: text("specialty"),
  designation: text("designation"),
  institution: text("institution").notNull(),
  address: text("address"),
  city: text("city"),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: created(),
});

export const registrations = pgTable("registrations", {
  id: id(),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  regNo: text("reg_no").notNull().unique(),
  accessToken: text("access_token").notNull().unique(),
  title: text("title").notNull(),
  gender: text("gender").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  pmdcNo: text("pmdc_no"),
  specialty: text("specialty"),
  designation: text("designation"),
  institution: text("institution").notNull(),
  address: text("address"),
  city: text("city"),
  categoryId: integer("category_id").notNull().references(() => feeCategory.id),
  conferenceFee: integer("conference_fee").notNull(),
  totalFee: integer("total_fee").notNull(),
  earlyBird: boolean("early_bird").notNull().default(false),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  certificateNo: text("certificate_no").unique(),
  certificateAt: timestamp("certificate_at", { withTimezone: true }),
  notes: text("notes"),
  employeeId: text("employee_id"), // LNH staff registered onsite
  source: text("source").notNull().default("ONLINE"), // ONLINE | ONSITE
  remindedAt: timestamp("reminded_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => ({ emailIdx: index("reg_email_idx").on(t.email), payIdx: index("reg_pay_idx").on(t.paymentStatus) }));

export const registrationItems = pgTable("registration_items", {
  id: id(),
  registrationId: text("registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "restrict" }),
  fee: integer("fee").notNull(),
  attendedAt: timestamp("attended_at", { withTimezone: true }),
}, (t) => ({ uq: uniqueIndex("reg_item_uq").on(t.registrationId, t.sessionId) }));

export const payments = pgTable("payments", {
  id: id(),
  registrationId: text("registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  txnRef: text("txn_ref").notNull().unique(),
  providerRef: text("provider_ref"),
  raw: jsonb("raw"),
  createdAt: created(),
  updatedAt: updated(),
});

export const abstracts = pgTable("abstracts", {
  id: id(),
  refNo: text("ref_no").notNull().unique(),
  type: abstractTypeEnum("type").notNull(),
  title: text("title").notNull(),
  gender: text("gender"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profession: text("profession"),
  organization: text("organization").notNull(),
  department: text("department").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  telephone: text("telephone"),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  qualification: text("qualification"),
  qualificationYear: integer("qualification_year"),
  specialty: text("specialty").notNull(),
  authors: text("authors").notNull(),
  presentingAuthor: text("presenting_author").notNull(),
  abstractTitle: text("abstract_title").notNull(),
  body: text("body").notNull(),
  keywords: text("keywords"),
  wordCount: integer("word_count").notNull(),
  status: abstractStatusEnum("status").notNull().default("SUBMITTED"),
  score: integer("score"),
  reviewerNotes: text("reviewer_notes"),
  reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  // v2 (Oct 2026 form)
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  presentationPref: text("presentation_pref"), // ORAL | POSTER | EITHER
  fullName: text("full_name"),
  designation: text("designation"),
  kind: text("kind"), // ORIGINAL | CASE
  sections: jsonb("sections").$type<Record<string, string>>(),
  coAuthors: jsonb("co_authors").$type<{ name: string; affiliation: string }[]>().notNull().default([]),
  titleKey: text("title_key"), // normalised title for duplicate checks
  assignedDept: text("assigned_dept"), // department currently reviewing
  phase: integer("phase").notNull().default(1),
  hodDecision: text("hod_decision"), // ACCEPT_ORAL | ACCEPT_POSTER | REJECT | BACK
  hodScores: jsonb("hod_scores").$type<Record<string, number>>(),
  hodTotal: integer("hod_total"),
  hodNotes: text("hod_notes"),
  hodBy: text("hod_by"),
  hodAt: timestamp("hod_at", { withTimezone: true }),
  acceptedAs: text("accepted_as"), // ORAL | POSTER
  scNotes: text("sc_notes"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  authorNotifiedAt: timestamp("author_notified_at", { withTimezone: true }),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
  sessionOrder: integer("session_order"),
  // SC V1.0: venue assigned from the abstract grid + free placement field (poster board, slot, remarks)
  venueId: text("venue_id").references(() => venues.id, { onDelete: "set null" }),
  placement: text("placement"),
  // poster presenter invitation tracking
  inviteToken: text("invite_token").unique(),
  inviteStatus: text("invite_status").notNull().default("NOT_SENT"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  reminders: integer("reminders").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => ({ statusIdx: index("abs_status_idx").on(t.status), titleIdx: index("abs_title_key_idx").on(t.titleKey), deptIdx: index("abs_dept_idx").on(t.assignedDept) }));

export const abstractEvents = pgTable("abstract_events", {
  id: id(),
  abstractId: text("abstract_id").notNull().references(() => abstracts.id, { onDelete: "cascade" }),
  actor: text("actor"),
  action: text("action").notNull(),
  note: text("note"),
  createdAt: created(),
}, (t) => ({ aIdx: index("abs_ev_idx").on(t.abstractId) }));

export const feedback = pgTable("feedback", {
  id: id(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  overall: integer("overall").notNull(),
  content: integer("content").notNull(),
  speaker: integer("speaker").notNull(),
  organization: integer("organization").notNull(),
  relevance: integer("relevance").notNull(),
  recommend: boolean("recommend").notNull().default(true),
  comments: text("comments"),
  regNo: text("reg_no"),
  createdAt: created(),
}, (t) => ({ sIdx: index("fb_session_idx").on(t.sessionId) }));

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: created(),
});

export const notificationLog = pgTable("notification_log", {
  id: id(),
  channel: channelEnum("channel").notNull(),
  to: text("to").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull(), // SENT | LOGGED | FAILED
  error: text("error"),
  createdAt: created(),
});

/** One-time codes (sign-up verification, registration look-up). Codes are stored hashed. */
export const otpCodes = pgTable("otp_codes", {
  id: id(),
  purpose: text("purpose").notNull(), // SIGNUP | LOOKUP
  target: text("target").notNull(), // email or normalised phone
  codeHash: text("code_hash").notNull(),
  payload: jsonb("payload"),
  attempts: integer("attempts").notNull().default(0),
  sends: integer("sends").notNull().default(1),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => ({ tIdx: index("otp_target_idx").on(t.purpose, t.target) }));

/** Atomic counters for human-readable numbers. */
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

// ---------- relations ----------
export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  venue: one(venues, { fields: [sessions.venueId], references: [venues.id] }),
  people: many(sessionPeople),
  abstracts: many(abstracts),
  reviews: many(sessionReviews),
  waitlist: many(waitlist),
  speakers: many(sessionSpeakers),
  items: many(registrationItems),
  feedback: many(feedback),
}));
export const speakersRelations = relations(speakers, ({ many }) => ({ sessions: many(sessionSpeakers) }));
export const sessionSpeakersRelations = relations(sessionSpeakers, ({ one }) => ({
  session: one(sessions, { fields: [sessionSpeakers.sessionId], references: [sessions.id] }),
  speaker: one(speakers, { fields: [sessionSpeakers.speakerId], references: [speakers.id] }),
}));
export const accountsRelations = relations(accounts, ({ many }) => ({ registrations: many(registrations) }));
export const registrationsRelations = relations(registrations, ({ one, many }) => ({
  account: one(accounts, { fields: [registrations.accountId], references: [accounts.id] }),
  category: one(feeCategory, { fields: [registrations.categoryId], references: [feeCategory.id] }),
  items: many(registrationItems),
  payments: many(payments),
}));
export const registrationItemsRelations = relations(registrationItems, ({ one }) => ({
  registration: one(registrations, { fields: [registrationItems.registrationId], references: [registrations.id] }),
  session: one(sessions, { fields: [registrationItems.sessionId], references: [sessions.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  registration: one(registrations, { fields: [payments.registrationId], references: [registrations.id] }),
}));
export const abstractsRelations = relations(abstracts, ({ one, many }) => ({
  reviewer: one(users, { fields: [abstracts.reviewerId], references: [users.id] }),
  session: one(sessions, { fields: [abstracts.sessionId], references: [sessions.id] }),
  account: one(accounts, { fields: [abstracts.accountId], references: [accounts.id] }),
  events: many(abstractEvents),
}));
export const abstractEventsRelations = relations(abstractEvents, ({ one }) => ({
  abstract: one(abstracts, { fields: [abstractEvents.abstractId], references: [abstracts.id] }),
}));
export const sessionPeopleRelations = relations(sessionPeople, ({ one }) => ({
  session: one(sessions, { fields: [sessionPeople.sessionId], references: [sessions.id] }),
  abstract: one(abstracts, { fields: [sessionPeople.abstractId], references: [abstracts.id] }),
}));
export const feedbackRelations = relations(feedback, ({ one }) => ({
  session: one(sessions, { fields: [feedback.sessionId], references: [sessions.id] }),
}));
export const feeCategoryRelations = relations(feeCategory, ({ many }) => ({ registrations: many(registrations) }));

export const venuesRelations = relations(venues, ({ many }) => ({ sessions: many(sessions) }));
export const sessionReviewsRelations = relations(sessionReviews, ({ one }) => ({
  session: one(sessions, { fields: [sessionReviews.sessionId], references: [sessions.id] }),
}));
export const waitlistRelations = relations(waitlist, ({ one }) => ({
  session: one(sessions, { fields: [waitlist.sessionId], references: [sessions.id] }),
}));

export type Venue = typeof venues.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type EventSettings = typeof event.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];

export type Account = typeof accounts.$inferSelect;
export type Abstract = typeof abstracts.$inferSelect;
export type SessionPerson = typeof sessionPeople.$inferSelect;
