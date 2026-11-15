// LNH Symposium — database schema (PostgreSQL, Drizzle ORM)
import {
  pgTable, pgEnum, type AnyPgColumn, text, integer, boolean, timestamp, serial, real, jsonb, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date());

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "ADMIN", "SCIENTIFIC_COMMITTEE", "REGISTRATION_DESK", "VIEWER", "WP_CHAIR", "WP_MEMBER", "HOD", "SC_CHAIR", "SECRETARIAT", "MARKETING", "CATERING", "FACILITATION_CHAIR", "FOCAL_PERSON"]);
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
  whatsapp: text("whatsapp"), // LNH WhatsApp link for the footer (14.11.2026)
  // 14.11.2026: guest and volunteer forms are not public; they open only from a link with this code
  guestCode: text("guest_code"),
  // Abstract decision emails (14.11.2026 templates): dates and the Scientific Committee address shown in them
  abstractConfirmBy: timestamp("abstract_confirm_by", { withTimezone: true }),
  scheduleUpdateBy: timestamp("schedule_update_by", { withTimezone: true }),
  presenterRegBy: timestamp("presenter_reg_by", { withTimezone: true }),
  scEmail: text("sc_email"),
  videos: jsonb("videos").$type<string[]>().notNull().default([]),
  // Homepage (changes 11.11.2026): ticker text, gallery link, and pages that show only once they go live
  tickerItems: jsonb("ticker_items").$type<string[]>().notNull().default([]),
  galleryUrl: text("gallery_url"),
  galleryThumbUrl: text("gallery_thumb_url"),
  agendaLive: boolean("agenda_live").notNull().default(false),
  speakersLive: boolean("speakers_live").notNull().default(false),
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
  // SC feedback (29 Oct 2026): quality-check guidelines shown to HODs while reviewing
  qcGuidelines: text("qc_guidelines"),
  // Registration forms 2027: additional banquet pass
  banquetFee: integer("banquet_fee").notNull().default(4000),
  banquetMax: integer("banquet_max").notNull().default(2),
  // Automated email: official sender and CC (Scientific Committee mailbox)
  emailFrom: text("email_from"),
  emailCc: text("email_cc"),
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
  designations: jsonb("designations").$type<string[]>().notNull().default([]), // registration form 2027: designations in this fee tier
});

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<Role>().notNull().default("VIEWER"), // global role (lib/permissions ROLE_PERMS); department roles are in user_departments
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  signedOutAt: timestamp("signed_out_at", { withTimezone: true }), // sign-ins issued before this are no longer accepted (password reset, deactivation)
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
  // every department field in the database must hold a name from this table (foreign keys, ON UPDATE CASCADE: a rename here updates them all)
  name: text("name").notNull().unique(),
  code: text("code"), // short code, e.g. CARD
  kind: text("kind").notNull().default("CLINICAL"), // CLINICAL | NON_CLINICAL | ALLIED
  email: text("email"), // official department email
  needsReview: boolean("needs_review").notNull().default(false), // added by the migration from an unrecognised spelling: rename or merge it
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  p1SubmittedAt: timestamp("p1_submitted_at", { withTimezone: true }), // HOD sent Phase 1 decisions back
  p2Required: boolean("p2_required").notNull().default(false), // new abstracts assigned in Phase 2
  p2SubmittedAt: timestamp("p2_submitted_at", { withTimezone: true }),
});

/** People of a department and their role in it (15 Nov 2026). One role per person per department; a person may belong to several departments. */
export const userDepartments = pgTable("user_departments", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  department: text("department").notNull().references(() => departments.name, { onUpdate: "cascade" }),
  role: text("role").$type<"HEAD" | "COORDINATOR" | "FOCAL_PERSON">().notNull(),
  createdAt: created(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.department] }), dIdx: index("ud_dept_idx").on(t.department) }));

/** Contributing departments of a workshop (replaces the comma-separated "contributors" text). */
export const sessionDepartments = pgTable("session_departments", {
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  department: text("department").notNull().references(() => departments.name, { onUpdate: "cascade" }),
}, (t) => ({ pk: primaryKey({ columns: [t.sessionId, t.department] }) }));

/** Who changed which staff login (role, departments, status, password) and when. */
export const staffAudit = pgTable("staff_audit", {
  id: id(),
  actor: text("actor").notNull(),
  targetId: text("target_id"),
  target: text("target").notNull(),
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: created(),
}, (t) => ({ tIdx: index("sa_target_idx").on(t.targetId) }));

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
  usage: text("usage").notNull().default("BOTH"), // WORKSHOP | SCIENTIFIC | BOTH (D5, 13 Nov: the 43-room list is for workshops only)
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
  department: text("department").references((): AnyPgColumn => departments.name, { onUpdate: "cascade" }),
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
  // Workshop Decisions and New Requirements (13 Nov 2026)
  days: integer("days").notNull().default(1), // D1: 1, or 2 / 3 consecutive full days (09:00-17:00 each)
  proposedTitle: text("proposed_title"), // N1: title as first proposed; "title" is the finalised title
  organiser: text("organiser"),
  objectives: text("objectives"),
  targetAudience: text("target_audience"),
  prelimProgramme: text("prelim_programme"),
  mode: text("mode").notNull().default("ONSITE"), // N2: ONSITE | ONLINE | HYBRID
  onlineLink: text("online_link"),
  facilitatorNames: jsonb("facilitator_names").$type<string[]>().notNull().default([]), // N3 (the Workshop Director is leadFaculty)
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
  // SC feedback: the department's agenda exactly as first submitted (kept unchanged)
  originalAgenda: jsonb("original_agenda").$type<Record<string, unknown>>(),
  originalSubmittedAt: timestamp("original_submitted_at", { withTimezone: true }),
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
  // Asked at checkout since release 2 (short sign-up)
  gender: text("gender"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  pmdcNo: text("pmdc_no"),
  specialty: text("specialty"),
  designation: text("designation"),
  institution: text("institution"),
  address: text("address"),
  city: text("city"),
  whatsapp: text("whatsapp"),
  cnic: text("cnic"),
  country: text("country"),
  province: text("province"),
  qualification: text("qualification"),
  employeeNo: text("employee_no"),
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
  whatsapp: text("whatsapp"),
  cnic: text("cnic"),
  country: text("country"),
  province: text("province"),
  qualification: text("qualification"),
  categoryId: integer("category_id").notNull().references(() => feeCategory.id),
  banquetQty: integer("banquet_qty").notNull().default(0),
  banquetFee: integer("banquet_fee").notNull().default(0),
  // PARTICIPANT | GUEST (speaker, chair, moderator, panelist) | VOLUNTEER
  regType: text("reg_type").notNull().default("PARTICIPANT"),
  guestRole: text("guest_role"), // INVITED_SPEAKER | CHAIRPERSON | MODERATOR | PANELIST
  guestSession: text("guest_session"),
  department: text("department").references((): AnyPgColumn => departments.name, { onUpdate: "cascade" }), // guests: the department that invited them (department list)
  volunteerDepartment: text("volunteer_department"), // volunteers: their own department / programme, free text
  academicYear: text("academic_year"),
  approvalStatus: text("approval_status"), // guests and volunteers: PENDING | APPROVED | REJECTED
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalNote: text("approval_note"),
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
  // Symposium Pass held by this registration (admits to all symposium sessions; includes one banquet pass). Workshop-only orders: false.
  hasPass: boolean("has_pass").notNull().default(false),
  // Later orders of the same delegate point at their first registration (shown under one registration number)
  primaryRegId: text("primary_reg_id"),
  remindedAt: timestamp("reminded_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => ({ emailIdx: index("reg_email_idx").on(t.email), payIdx: index("reg_pay_idx").on(t.paymentStatus), accIdx: index("reg_account_idx").on(t.accountId) }));

export const registrationItems = pgTable("registration_items", {
  id: id(),
  registrationId: text("registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "restrict" }),
  fee: integer("fee").notNull(),
  attendedAt: timestamp("attended_at", { withTimezone: true }),
  // Release 3 (D4): each workshop ticket has its own number and QR, e.g. SYM-2027-00012-W1
  ticketNo: text("ticket_no").unique(),
  remindedAt: timestamp("reminded_at", { withTimezone: true }),
  // N5/N6 (13 Nov 2026): the department focal person verifies attendance; the workshop e-certificate follows verification + feedback
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  certNo: text("cert_no").unique("reg_item_cert_uq"),
  certAt: timestamp("cert_at", { withTimezone: true }),
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
  specialty: text("specialty").notNull().references((): AnyPgColumn => departments.name, { onUpdate: "cascade" }),
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
  assignedDept: text("assigned_dept").references((): AnyPgColumn => departments.name, { onUpdate: "cascade" }), // department currently reviewing
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
  // N7 workshop feedback form (13 Nov 2026): 12 statements (1-5), recommend Yes/Maybe/No, contact opt-in
  registrationId: text("registration_id").references(() => registrations.id, { onDelete: "set null" }),
  answers: jsonb("answers").$type<number[]>(),
  recommendChoice: text("recommend_choice"),
  contactOk: boolean("contact_ok"),
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
  channel: text("channel").notNull(), // EMAIL | WHATSAPP | SMS
  to: text("to").notNull(),
  cc: text("cc"),
  sender: text("sender"),
  templateKey: text("template_key"),
  ref: text("ref"), // abstract ID, registration no. or session title the message is about
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull(), // QUEUED | SENDING | SENT | LOGGED (not sent: Log only mode, or no provider) | FAILED (gave up) | CANCELLED
  error: text("error"),
  createdAt: created(),
  // outbox (Part C, 14.11.2026): what the sender needs to deliver it; cleared once sent
  payload: jsonb("payload").$type<OutboxPayload>(),
  attempts: integer("attempts").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  providerRef: text("provider_ref"),
}, (t) => ({ qIdx: index("nl_queue_idx").on(t.status, t.nextAttemptAt) }));
export type OutboxPayload = {
  // EMAIL
  html?: string; from?: string; accountId?: string | null; replyTo?: string | null;
  attachments?: { filename: string; content: string /* base64 */; contentType?: string; cid?: string }[];
  // WHATSAPP / SMS
  messageKey?: string; templateId?: string; mediaUrl?: string; email?: string; text?: string; via?: "XNOTIFY" | "GATEWAY";
};

/** Super Admin → Notifications: eOcean xNotify (WhatsApp and SMS), message template IDs and sending limits. API key encrypted (lib/secret-box). */
export const notifySettings = pgTable("notify_settings", {
  id: integer("id").primaryKey().default(1),
  waEnabled: boolean("wa_enabled").notNull().default(false),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  apiUrl: text("api_url").notNull().default("https://api.xnotify.ai/v2/send"),
  apiKey: text("api_key"),
  authId: text("auth_id"),
  authUsername: text("auth_username"),
  waChannel: text("wa_channel").notNull().default("Whatsapp"),
  smsChannel: text("sms_channel").notNull().default("SMS"),
  templates: jsonb("templates").$type<Record<string, { wa?: string; sms?: string }>>().notNull().default({}),
  emailPerMin: integer("email_per_min").notNull().default(60),
  msgPerMin: integer("msg_per_min").notNull().default(30),
  maxAttempts: integer("max_attempts").notNull().default(6),
  workerSeenAt: timestamp("worker_seen_at", { withTimezone: true }),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

/** Editable automated email templates (SC feedback, 29 Oct 2026). Body uses {{merge_fields}}. */
export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  buttonLabel: text("button_label"),
  enabled: boolean("enabled").notNull().default(true), // automatic reminders can be switched off by the admin
  // Email settings (14 Nov 2026): who sends this notification. Empty = the default mailbox / its sender name.
  accountId: text("account_id"),
  fromName: text("from_name"),
  cc: text("cc"),
  replyTo: text("reply_to"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Scheduled email dispatches managed from the admin (e.g. abstract decisions and invitations on 31 Dec). */
export const emailJobs = pgTable("email_jobs", {
  id: id(),
  kind: text("kind").notNull(), // ABSTRACT_DECISIONS | INVITATIONS | INVITE_REMINDERS
  runAt: timestamp("run_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("SCHEDULED"), // SCHEDULED | RUNNING | DONE | CANCELLED | FAILED
  note: text("note"),
  createdBy: text("created_by"),
  ranAt: timestamp("ran_at", { withTimezone: true }),
  result: text("result"),
  createdAt: created(),
});

/** One-time codes (sign-up verification, registration look-up). Codes are stored hashed. */
export const otpCodes = pgTable("otp_codes", {
  id: id(),
  purpose: text("purpose").notNull(), // SIGNUP | LOOKUP | SIGNIN | RESET
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
export type Role = Exclude<(typeof roleEnum.enumValues)[number], "HOD" | "FOCAL_PERSON"> | "DEPARTMENT"; // users.role is text since 0022

export type Account = typeof accounts.$inferSelect;
export type Abstract = typeof abstracts.$inferSelect;
export type SessionPerson = typeof sessionPeople.$inferSelect;

/** Programme pages managed by the Scientific Committee (Dashboard Instructions, revised 06-11-2026):
 *  WEBINAR = Pre-symposium activities (renamed 10 Nov), INAUGURAL = Inaugural session, EXPERTS = Meet the Experts. */
export const programmePages = pgTable("programme_pages", {
  key: text("key").primaryKey(), // WEBINAR | EXPERTS
  title: text("title").notNull(),
  dateText: text("date_text"),
  format: text("format"),
  description: text("description"),
  published: boolean("published").notNull().default(false),
  updatedBy: text("updated_by"),
  updatedAt: updated(),
});

/** Guests shown on a programme page: photo, name, affiliation, qualification. Photo stored base64 (max 1 MB) or as a URL. */
export const programmeGuests = pgTable("programme_guests", {
  id: id(),
  pageKey: text("page_key").notNull().references(() => programmePages.key, { onDelete: "cascade" }),
  name: text("name").notNull(),
  affiliation: text("affiliation"),
  qualification: text("qualification"),
  topic: text("topic"),
  photoUrl: text("photo_url"),
  photoMime: text("photo_mime"),
  photoData: text("photo_data"),
  order: integer("order").notNull().default(0),
  createdAt: created(),
}, (t) => ({ pIdx: index("pg_page_idx").on(t.pageKey) }));
export type ProgrammeGuest = typeof programmeGuests.$inferSelect;

/** PayPro / payment mode set by the Super Admin (Event Settings → Payments). One row (id 1). Credentials are encrypted
 *  with AES-256-GCM (key from AUTH_SECRET) and never sent back to the browser. Kept out of the event table so public
 *  pages that read event settings can never carry them. */
export const paymentSettings = pgTable("payment_settings", {
  id: integer("id").primaryKey().default(1),
  mode: text("mode"), // OFF | DEMO | LIVE; null = use the server settings file (PAYMENT_PROVIDER / PAYPRO_*)
  secrets: text("secrets"), // encrypted JSON: { demo: {baseUrl, clientId, clientSecret, merchantId}, live: {...}, callback: {username, password} }
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

/** Email sending accounts (mailboxes) managed by the Super Admin / Admin in Admin → Email settings (14 Nov 2026).
 *  The SMTP password is encrypted (lib/secret-box.ts) and never sent back to the browser. */
export const mailAccounts = pgTable("mail_accounts", {
  id: id(),
  label: text("label").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(465),
  security: text("security").notNull().default("SSL"), // SSL (465) | STARTTLS (587) | NONE
  username: text("username").notNull(),
  secret: text("secret"), // encrypted password
  fromName: text("from_name").notNull(),
  fromAddress: text("from_address").notNull(),
  replyTo: text("reply_to"),
  isDefault: boolean("is_default").notNull().default(false),
  active: boolean("active").notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row (id 1): how emails leave the site. SEND = deliver; LOG = record only; TEST = deliver every email to testAddress. */
export const mailSettings = pgTable("mail_settings", {
  id: integer("id").primaryKey().default(1),
  mode: text("mode").notNull().default("SEND"),
  testAddress: text("test_address"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
