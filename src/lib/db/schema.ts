// LNH Symposium — database schema (PostgreSQL, Drizzle ORM)
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, serial, real, jsonb, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date());

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "ADMIN", "SCIENTIFIC_COMMITTEE", "REGISTRATION_DESK", "VIEWER", "WP_CHAIR", "WP_MEMBER", "HOD"]);
export const sessionTypeEnum = pgEnum("session_type", ["KEYNOTE", "PLENARY", "SCIENTIFIC", "PANEL", "WORKSHOP", "CEREMONY", "BREAK"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "PAID", "FAILED", "WAIVED", "REFUNDED"]);
export const abstractTypeEnum = pgEnum("abstract_type", ["ORAL", "POSTER"]);
export const abstractStatusEnum = pgEnum("abstract_status", ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REVISION"]);
export const channelEnum = pgEnum("channel", ["EMAIL", "SMS"]);

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
  createdAt: created(),
}, (t) => ({ dayIdx: index("sessions_day_idx").on(t.day, t.startsAt) }));

export const sessionSpeakers = pgTable("session_speakers", {
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  speakerId: text("speaker_id").notNull().references(() => speakers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("Speaker"),
}, (t) => ({ pk: primaryKey({ columns: [t.sessionId, t.speakerId] }) }));

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
  gender: text("gender").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
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
  createdAt: created(),
  updatedAt: updated(),
}, (t) => ({ statusIdx: index("abs_status_idx").on(t.status) }));

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

/** Atomic counters for human-readable numbers. */
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

// ---------- relations ----------
export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  venue: one(venues, { fields: [sessions.venueId], references: [venues.id] }),
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
export const abstractsRelations = relations(abstracts, ({ one }) => ({
  reviewer: one(users, { fields: [abstracts.reviewerId], references: [users.id] }),
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
