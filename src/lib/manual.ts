import type { Perm } from "./permissions";

/**
 * Training Manual (LNH, 23 Nov 2026): the user guide shown under Admin → Training Manual.
 * One chapter per area; each section is one feature or setting, searchable by its title, text and keywords.
 * perm: who uses this feature (the "Only what my login can use" filter); no perm = everyone.
 * Keep this file in step with the portal when a feature changes.
 */
export type ManualSection = {
  id: string; title: string; perm?: Perm | Perm[]; where?: string; summary: string;
  steps?: string[]; fields?: [string, string][]; tips?: string[]; keywords?: string;
};
export type ManualChapter = { id: string; title: string; intro: string; sections: ManualSection[] };

export const MANUAL: ManualChapter[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "start", title: "Getting started",
    intro: "How the admin console works, how to sign in, and how your role decides what you see.",
    sections: [
      {
        id: "sign-in", title: "Signing in and signing out", where: "Admin console → /admin/login",
        summary: "Every staff member has their own login (email and password) created by the Super Admin in Users & Roles. Department logins (one per department) are also available for the Head of Department.",
        steps: [
          "Open the admin console address and enter your email and password.",
          "After signing in you land on your home page: the Overview for most roles, or your department page for department staff.",
          "To finish, press Sign out at the bottom of the left-hand menu. You are signed out automatically after 12 hours.",
        ],
        tips: [
          "Forgot your password? Ask the Super Admin to set a new one in Users & Roles. Signing in again after a password reset is required on every device.",
          "Never share your login. Every change is recorded with your name in the change logs.",
        ],
        keywords: "login password logout session expire forgot",
      },
      {
        id: "layout", title: "The console layout",
        summary: "The left-hand menu lists only the sections your role can use. The logo at the top opens your home page (the dashboard). At the bottom: Training Manual, View website (opens the public site in a new tab), your name, role and departments, and Sign out.",
        tips: [
          "On a phone, open the menu with the menu button at the top left.",
          "All dates and times in the portal are Pakistan time (PKT) and use the 24-hour clock where a time is entered.",
          "Most lists have filters at the top; the address in the browser keeps the filter, so you can bookmark or share a filtered view.",
        ],
        keywords: "menu sidebar navigation logo dashboard home mobile time zone PKT 24 hour",
      },
      {
        id: "roles", title: "Roles: who sees what",
        summary: "Each login has one global role and any number of department roles. The global role decides the console-wide sections; department roles (Head, Coordinator, Focal person) give access to that department's work only.",
        fields: [
          ["Super Admin", "Everything, including Users & Roles, Payments, Email settings and WhatsApp / SMS."],
          ["Admin", "Runs the event: everything except users, programme approval and department portals."],
          ["Symposium Secretariat", "Day-to-day running: registrations, sessions, content, emails; cannot change Event settings, approve workshops or finalise the programme."],
          ["Scientific Committee", "Abstracts and the scientific agenda; edits sessions also after the department deadline."],
          ["Scientific Committee Chair", "As the Scientific Committee, plus approving sessions, releasing the programme, departments, venues and the automated emails; the only role that may change an HOD-approved session flyer."],
          ["WP Committee Co-Chair", "Workshop Programme: reviews and approves workshop requests, low-fill decisions, attendance."],
          ["WP Committee Member", "Workshop Programme: reads and edits unlocked requests; cannot approve or reject."],
          ["Registration Desk", "Registrations, onsite desk, check-in, enquiries."],
          ["Marketing (flyer review)", "Workshop flyer review only."],
          ["Food department (read only)", "Catering headcounts only."],
          ["Chairperson, Facilitation Committee", "Volunteer approvals only."],
          ["Viewer", "Read-only dashboards, registrations, sessions, feedback and workshops."],
          ["Department staff only", "No global access; everything comes from department roles."],
          ["Head of Department (department role)", "Abstract review, session agenda, session flyer approval, guest approvals, workshop requests for that department."],
          ["Coordinator (department role)", "Prepares the department's workshop requests and session details."],
          ["Focal person (department role)", "Confirms workshop attendance for that department."],
        ],
        tips: ["The full permission table is in Users & Roles → What each role can do."],
        keywords: "permissions access super admin secretariat HOD head coordinator focal person viewer marketing catering facilitation co-chair",
      },
      {
        id: "staff-preview", title: "Staff preview of pages that are not live yet",
        summary: "The Agenda, Workshops and E-certificates pages show \"Coming soon\" to the public until they are switched on in Event settings. While you are signed in to the admin console you still see the real page, with a yellow note saying what the public sees.",
        keywords: "coming soon preview hidden live switch",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "website", title: "The public website",
    intro: "What visitors see, page by page, and where each part is managed in the admin console.",
    sections: [
      {
        id: "home", title: "Home page", where: "https://symposium2027.lnh.edu.pk/",
        summary: "The home page is built from Event settings and the programme. Sections from top to bottom:",
        fields: [
          ["Hero", "Event name, theme, dates, tagline, day short labels and the Register / View Agenda buttons. View Agenda appears only when \"Agenda is live\" is ticked."],
          ["Ticker", "The moving line of messages. Event settings → Homepage ticker (one message per line)."],
          ["One theme. Three frontiers.", "Three icons with their names (AI, Robotics, Digitization by default). Event settings → Themes section: name 1 to 3, heading, small line above and text."],
          ["Pre-symposium workshops", "Short introduction and the button to the workshop catalogue (\"Workshops: coming soon\" until workshops are live)."],
          ["At a glance", "Heading \"Three Days of Insights & Innovation\" and Explore the Agenda. The three day cards (Day 1 to 3 themes and sessions) appear only when the agenda is live."],
          ["Teaser and gallery", "The first YouTube video in Event settings → Homepage teaser videos, and the previous symposium gallery link."],
          ["Speakers", "Shown only when \"Speakers are live\" is ticked."],
          ["Footer", "Contact details, social links (Facebook, Instagram, LinkedIn, YouTube, X, WhatsApp), the venue map with venue chips, and the Logic Unit credit."],
        ],
        tips: ["The logo at the top left always opens the home page."],
        keywords: "homepage hero ticker frontiers glance day cards teaser gallery footer logo social",
      },
      {
        id: "pages", title: "Information pages",
        summary: "About, Organizing Committee, Awards, Venue Map, Contact and Search.",
        fields: [
          ["About", "\"About the 9th LNH Symposium\" with the theme line and the symposium description."],
          ["Organizing Committee", "Committee members by committee. Managed in Speakers & Committee."],
          ["Awards", "The five symposium awards with their icons."],
          ["Venue Map", "Guide map of the symposium venues with numbered pins. Choose a pin or a venue tab for its details and, once the programme is released, the sessions held there each day. The venue chips in the footer open the map with that venue selected."],
          ["Contact", "Enquiry form; messages arrive in Enquiries."],
          ["Search", "Searches sessions, workshops (also by workshop ID, e.g. WS-0003), speakers and halls."],
        ],
        keywords: "about committee awards venue map pins chips contact enquiry search",
      },
      {
        id: "programme-pages", title: "Agenda and programme pages",
        summary: "The Agenda shows the full programme by day with filters by session type and hall, a CSV download and \"My itinerary\". Until \"Agenda is live\" is ticked it shows \"Coming soon\". The Programme menu also has Plenary, Debate, Scientific Sessions, Pre-symposium activities, Inaugural session, Meet the Experts and Webinar pages.",
        tips: [
          "Plenary, Debate and Scientific Sessions fill in from the approved scientific programme after it is released.",
          "Pre-symposium activities, Inaugural session and Meet the Experts are entered in Scientific Programme → Programme pages and stay hidden until published.",
        ],
        keywords: "agenda programme schedule plenary debate scientific sessions inaugural webinar meet the experts itinerary csv",
      },
      {
        id: "workshop-catalogue", title: "Workshop catalogue",
        summary: "Lists approved workshops by theme week and date, with search, a calendar and filters. Each card shows the department, workshop ID (WS-0001), Workshop Director, date, time, venue, CME hours, seats left and fee, with Add ticket. Each workshop also has its own shareable page and flyer.",
        tips: [
          "Shows \"Coming soon\" until \"Pre-symposium workshops are live\" is ticked; workshop tickets cannot be bought until then.",
          "A full workshop offers a waiting list.",
        ],
        keywords: "workshops catalogue cards add ticket seats waitlist flyer WS id coming soon",
      },
      {
        id: "abstracts-site", title: "Abstract submission and e-abstract book",
        summary: "Authors submit abstracts online between the opening date and the deadline (Event settings). Each gets a reference number and an acknowledgement email. Accepted abstracts appear in the e-abstract book.",
        keywords: "abstract submit deadline word limit e-book reference",
      },
      {
        id: "certificates-site", title: "E-certificates and verification",
        summary: "Participants download their certificate with their registration number and email. Every certificate has a QR code that opens a verification page. The page shows \"Coming soon\" until \"E-certificates are available\" is ticked. Workshop IDs are never printed on certificates.",
        keywords: "certificate download verify QR coming soon",
      },
      {
        id: "feedback-site", title: "Feedback pages",
        summary: "The QR on the back of the ID card opens the participant's own feedback page: their workshops (once attendance is recorded) and the symposium sessions. There is also feedback on the symposium as a whole. Results appear live in Live Feedback.",
        keywords: "feedback QR rating session workshop symposium",
      },
      {
        id: "analytics", title: "Website analytics (Google Tag Manager)",
        summary: "The live website loads LNH's Google Tag Manager container GTM-W2W8D2H4; Google Analytics 4 and other tags are set up by LNH inside the container. Test sites and the admin console are not tracked.",
        tips: [
          "Personal links (e-tickets, invitations, registration look-ups, ?t= codes) are never sent to Google: Tag Manager loads only on public pages, and every page change is sent as a \"virtual_page_view\" event with a cleaned page address.",
          "A different container can be set with GTM_ID in the server settings file.",
        ],
        keywords: "google analytics GA4 tag manager GTM tracking privacy",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "participant", title: "The participant journey",
    intro: "What a participant does from creating an account to collecting the certificate. Useful when helping someone on the phone or at the desk.",
    sections: [
      {
        id: "account", title: "Account, sign-up and one-time codes",
        summary: "Participants create an account with name, email, mobile number and password. A 6-digit code verifies the account. Codes are also used to sign in without a password, to reset a password and to look up registrations.",
        steps: [
          "Sign up with the short form; a code is sent by email, and by SMS when SMS codes are set up (xNotify template for \"One-time code (OTP) by SMS\").",
          "Enter the code within 5 minutes. After 5 wrong attempts a new code is needed; at most 4 codes per request.",
          "Mobile numbers: Pakistan as 03XX-XXXXXXX; other countries choose the country code (e.g. +971) and type the number.",
        ],
        tips: ["Codes are never shown in the portal's logs. If a code does not arrive, check the Email settings delivery mode and the WhatsApp / SMS message log."],
        keywords: "sign up signup account OTP code SMS email verify password reset mobile country code",
      },
      {
        id: "register", title: "Registration, cart and checkout",
        summary: "The participant chooses the Symposium Registration (fee by designation and category, early-bird before the early-bird date), optional extra banquet passes and any workshops, then checks out.",
        steps: [
          "Register page: choose designation; the fee tier follows it. Workshops are separate tickets and do not need the symposium registration.",
          "Checkout: title, gender, CNIC (optional; passport for other countries), address, province, country, qualification, institution, specialty, WhatsApp number. Missing fields are listed in an amber box and highlighted in red.",
          "Confirm and pay: the order gets a registration number (prefix from Event settings, e.g. SYM-2027-00001) and goes to payment.",
        ],
        tips: ["Unpaid workshop seats are held for the number of hours in Event settings → Unpaid workshop seat hold; after that the order is cancelled and the seats are released (0 = never)."],
        keywords: "register registration cart checkout designation fee tier early bird banquet CNIC passport WhatsApp missing fields seat hold",
      },
      {
        id: "pay", title: "Paying",
        summary: "With PayPro switched on, the participant pays by card, bank app, ATM or over the counter. With payments Off, they see the bank details and the desk records the payment. Confirmation arrives by email, with WhatsApp when set up.",
        keywords: "payment pay PayPro card bank ATM counter consumer number confirmation",
      },
      {
        id: "eticket", title: "E-ticket, ID card and QR codes",
        summary: "After payment the participant receives the confirmation email with the registration PDF (ID card with QR), and can open the e-ticket page at any time. The Symposium Registration QR admits to the symposium; each workshop ticket has its own QR for that workshop's door. The QR on the back opens their personal feedback page.",
        keywords: "e-ticket ticket QR ID card badge PDF confirmation",
      },
      {
        id: "lookup", title: "My registrations and My bookings",
        summary: "Signed-in participants see their orders under My bookings. Anyone can find their registrations under My registrations with the mobile number (a code is sent to the registered email and mobile) or with the registration number and email.",
        keywords: "my registrations bookings lookup find order",
      },
      {
        id: "guest-volunteer", title: "Guest and volunteer forms",
        summary: "Invited speakers, chairs, moderators, panelists and volunteers register on special forms that need the access code from Event settings. Guests are approved by their department (Guest Approvals); volunteers by the Facilitation Committee chair (Volunteers). Approval issues the complimentary or volunteer pass.",
        keywords: "guest volunteer form access code invited speaker chair moderator panelist pass approval",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "registrations", title: "Registrations, desk and check-in",
    intro: "Finding and managing registrations, registering walk-ins, and admitting people on the day.",
    sections: [
      {
        id: "overview", title: "Overview dashboard", perm: "dashboard", where: "Overview",
        summary: "Days to go, registrations, payments, income and workshop figures at a glance, with links to the detailed screens.",
        keywords: "overview dashboard kpi statistics",
      },
      {
        id: "reg-list", title: "Registrations list", perm: "registrations", where: "Registrations",
        summary: "Every registration with search (name, email, phone, registration number), status and category filters.",
        steps: ["Type in the search box and choose a status or category; press Filter.", "Open a row for the full record.", "Export CSV downloads all registrations with their sessions and workshop IDs (roles with export rights)."],
        keywords: "registrations list search filter status category export csv excel",
      },
      {
        id: "reg-record", title: "A registration record", perm: "registrations.edit", where: "Registrations → open a registration",
        summary: "Participant details, order items, payments, flags, messages sent and notes.",
        fields: [
          ["Mark as paid & notify", "Record a payment received at the desk or by bank (choose Bank transfer, Cash, Card, Cheque); sends the confirmation."],
          ["Waive fee", "Free registration (e.g. guests); issues the pass."],
          ["Cancel (frees seats)", "Cancels the order and releases workshop seats. Re-open undoes it."],
          ["Mark refunded", "Records a refund."],
          ["Payment flags", "DUPLICATE (paid twice), LATE (paid after the order was cancelled) or SHORT (less than due). Check, act, then Mark resolved."],
          ["Resend email + WhatsApp / SMS", "Sends the confirmation again."],
          ["Notes", "Internal notes, not shown to the participant."],
        ],
        keywords: "mark paid waive cancel refund resend notes flags duplicate late short resolve record",
      },
      {
        id: "onsite", title: "Onsite registration desk", perm: "registrations.edit", where: "Onsite Desk",
        summary: "Register LNH staff and walk-in participants on the Registration Form 2027. Designation sets the fee tier; LNH staff give their employee number. Recent desk registrations are listed below the form.",
        keywords: "onsite desk walk-in staff employee number",
      },
      {
        id: "checkin", title: "Check-in desk", perm: "checkin", where: "Check-in",
        summary: "Scan the Symposium Registration QR at the symposium entrance, or a workshop ticket QR at that workshop's door, or search by registration number, name, email or phone.",
        tips: [
          "Warnings tell you what to do: payment pending (collect or record it before admitting), guest or volunteer not approved, workshop tickets only (no symposium registration), registration not found.",
          "Checked-in workshop participants are pre-ticked on the attendance list for the focal person.",
        ],
        keywords: "check-in checkin scan QR door entrance admit badge",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "payments", title: "Payments (PayPro)",
    intro: "Super Admin only. How participants pay, and the payments that need attention.",
    sections: [
      {
        id: "pay-mode", title: "Payment mode and credentials", perm: "payments", where: "Payments (PayPro)",
        summary: "Choose how participants pay and keep the PayPro credentials. Saved credentials are encrypted and never shown again; leave a field blank to keep what is saved.",
        fields: [
          ["Off: bank transfer", "No online payment. Participants see the bank details; the desk marks payments as received."],
          ["PayPro demo", "PayPro's test system. No real money; use it to test before going live."],
          ["PayPro live", "Real payments by card, bank app, ATM and over the counter."],
          ["Test connection", "Signs in to PayPro with the saved credentials and reports the answer."],
          ["PayPro callback", "The address PayPro calls when a bank, ATM or counter payment is made. Give it to PayPro with the server's IP for their allowlist."],
        ],
        tips: ["Only the Super Admin enters credentials, on this screen. Never send them by email or chat."],
        keywords: "paypro payment mode demo live off bank credentials test connection callback",
      },
      {
        id: "pay-action", title: "Payments that need action", perm: "payments", where: "Payments (PayPro)",
        summary: "Payments flagged DUPLICATE, LATE or SHORT are listed here with a link to the registration. Decide (refund, re-open, collect the difference), then press Mark resolved on the registration.",
        keywords: "flagged payments duplicate late short refund resolve",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "workshops", title: "Workshop Programme",
    intro: "Pre-symposium workshops from request to certificate: Form A, committee approval, catalogue, flyers, daily requirements, attendance.",
    sections: [
      {
        id: "wp-dashboard", title: "Committee dashboard", perm: "workshops", where: "Workshop Programme → Dashboard",
        summary: "Registrations against the seat target, capacity fill, income, pending requests, low-fill alerts and the list of workshops with filters (status, theme week, department, date).",
        steps: [
          "Each workshop shows its ID (WS-0001), date and time, venue, registered and capacity, and status.",
          "Low-fill alert: a workshop under the fill threshold close to its date. Co-Chairs decide: run, merge, cancel or extend the marketing push.",
          "Export PDF downloads the workshops in the current filter, with totals.",
        ],
        tips: ["Department staff see only their department's workshops."],
        keywords: "workshop dashboard kpi seat target fill income low fill alert decision export pdf filter",
      },
      {
        id: "wp-ids", title: "Workshop IDs (WS-0001)",
        summary: "Every workshop gets a unique ID automatically when it is created: WS-0001, WS-0002 and so on. IDs are never reused. The ID appears in the portal, on the website (cards, workshop page, search), in the workshop PDFs and in the registrations export, but never on certificates.",
        keywords: "workshop id number code WS reference",
      },
      {
        id: "form-a", title: "Workshop request (Form A)", perm: ["workshops.submit", "workshops.edit"], where: "Workshop Programme → New request",
        summary: "The Workshop Director's request. After approval the same record makes the catalogue card, the flyer and the daily requirements sheet.",
        fields: [
          ["Title and flyer summary", "Title up to 100 characters (best under 70 for the flyer); flyer summary up to 140."],
          ["Department and category", "Owning department, contributing departments, category A (multidisciplinary) or B (departmental)."],
          ["Date, start time and duration", "No past dates; inside the workshop window (Event settings). Sundays are allowed. 2- or 3-day workshops run 09:00-17:00 each day."],
          ["Venue and seat cap", "The room check runs as you choose; a clash shows other free rooms and other free dates. The seat cap cannot exceed the room."],
          ["Mode", "Onsite, Online (with link) or Hybrid."],
          ["Fee and CME hours", "Workshop fee (one price) and CME hours."],
          ["Workshop Director and facilitators", "Name, degrees, contact, short profile, facilitator names."],
          ["Content", "Description, educational objectives, preliminary programme, target audience, format."],
          ["People and equipment", "Numbers of facilitators, volunteers, technicians; equipment items with quantity and source."],
        ],
        keywords: "form a request new workshop director date sunday venue room clash capacity fee cme equipment facilitators",
      },
      {
        id: "wp-approvals", title: "Approvals queue", perm: "workshops.review", where: "Workshop Programme → Approvals",
        summary: "Requests oldest first. Mark Under review, Approve or Reject (a reason is required). Approving publishes the workshop to the catalogue, locks its core fields and generates the flyer for Marketing.",
        tips: ["Only the WP Committee Co-Chairs (and Super Admin) approve or reject; members can mark under review and edit unlocked requests."],
        keywords: "approve reject review queue lock publish",
      },
      {
        id: "wp-page", title: "A workshop's page", perm: "workshops", where: "Workshop Programme → open a workshop",
        summary: "Everything about one workshop: status, flyer status, schedule, director, people and equipment, waiting list, registrations, campus map and the request history.",
        fields: [
          ["Edit", "Change the request (logged in the history). Decided requests can be changed only by the committee."],
          ["Details PDF", "The full workshop record as a PDF."],
          ["Flyer PDF / preview", "The flyer on the official template."],
          ["Participants", "The participant list with attendance and feedback."],
          ["Waitlist", "Email the next people when seats become free."],
        ],
        keywords: "workshop details pdf flyer participants waitlist history edit",
      },
      {
        id: "wp-daily", title: "Daily requirements", perm: "workshops", where: "Workshop Programme → Daily",
        summary: "One consolidated sheet per day for the Duty Officer, Skill Lab and stores: workshops, rooms, times, people and equipment.",
        keywords: "daily requirements sheet duty officer skill lab stores equipment",
      },
      {
        id: "venues", title: "Venues & Map", perm: "venues", where: "Venues & Map",
        summary: "Rooms with seating capacity, online facility and location on the campus map. Form A reads these. Deleting a room that workshops use deactivates it instead.",
        keywords: "venues rooms capacity map location building",
      },
      {
        id: "flyer-review", title: "Flyer review (Marketing)", perm: "flyers", where: "Flyer Review",
        summary: "Each approved workshop gets a flyer on the official template. Approve it, or send it back with the change needed. Approved flyers become downloadable for the public and the workshop team.",
        keywords: "flyer review marketing approve changes",
      },
      {
        id: "attendance", title: "Workshop attendance and e-certificates", perm: "attendance", where: "Workshop Attendance",
        summary: "The department focal person confirms who attended each workshop once it has started. People checked in at the door are pre-ticked; untick anyone who did not attend. The workshop e-certificate is emailed automatically once attendance is confirmed and the participant has submitted the feedback form.",
        keywords: "attendance focal person confirm certificate workshop feedback",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "scientific", title: "Scientific programme and departments",
    intro: "Abstracts, department sessions, the scientific agenda, invitations and session flyers.",
    sections: [
      {
        id: "dept-portal", title: "Department portal", perm: ["dept.abstracts", "dept.sessions", "dept.flyers", "dept.guests"], where: "My Department",
        summary: "The department's home: abstract review, the scientific session agenda, session flyer approval, guest approvals and workshop requests, with counts and deadlines.",
        keywords: "department portal HOD my department",
      },
      {
        id: "dept-abstracts", title: "Abstract review (HOD)", perm: "dept.abstracts", where: "Abstract Review",
        summary: "The HOD decides each abstract of the speciality: Accept (oral or poster), Reject, or Return to the Symposium Secretariat. Phase 1 dates and Phase 2 (reassigned abstracts) dates are set in Event settings. Quality-check guidelines are shown on the screen.",
        tips: ["Authors are told the decision on the scheduled decision date, not immediately."],
        keywords: "abstract review accept reject return oral poster HOD phase 1 phase 2",
      },
      {
        id: "dept-sessions", title: "Session agenda (department)", perm: "dept.sessions", where: "Session Agenda",
        summary: "The department enters its scientific session: type, title, expected audience, chairs, speakers, moderators, panelists and presenters (accepted abstracts by ID fill in automatically). The agenda template for the chosen session type appears under it.",
        tips: [
          "Departments can edit until the Department agenda deadline; after that only the Scientific Committee can edit. The first submission is kept as the read-only \"Original agenda\".",
          "The Scientific Committee can also enter every session itself in Scientific Programme → New session, without the department.",
        ],
        keywords: "session agenda department submit chair speaker presenter template deadline lock original",
      },
      {
        id: "dept-flyers", title: "Session flyers (HOD approval)", perm: "dept.flyers", where: "Session Flyers",
        summary: "After the Scientific Committee approves the session content, its flyer is generated for the HOD's final approval. Once approved the flyer is locked; later changes go through the Scientific Sessions Chairperson.",
        keywords: "session flyer approve HOD lock",
      },
      {
        id: "dept-guests", title: "Guest approvals", perm: "dept.guests", where: "Guest Approvals",
        summary: "Invited speakers, chairpersons, moderators and panelists who registered for the department's sessions. Approval issues their complimentary pass.",
        keywords: "guest approval invited speaker complimentary pass",
      },
      {
        id: "abstracts-admin", title: "Abstracts (Secretariat)", perm: "abstracts", where: "Abstracts",
        summary: "All abstracts with filters by department, stage and format. Returned abstracts are reassigned here for Phase 2; accepted ones get a venue. Decision emails go on the scheduled date (Automated emails → Schedule).",
        keywords: "abstracts reassign phase 2 venue decision email schedule",
      },
      {
        id: "sci-programme", title: "Scientific programme", perm: "programme", where: "Scientific Programme",
        summary: "All department session proposals with slot and venue allotment and clash checks.",
        steps: [
          "Open a session; allot the day and time slot and the hall (clashes are refused).",
          "Approve (SC Chair or Super Admin): the department is told and the session flyer goes to the HOD.",
          "Release programme: approved sessions appear on the public Agenda and Scientific Sessions pages.",
          "New session: enter a session on behalf of a department, or set up the plenary and debate sessions.",
        ],
        tips: ["Agenda lock shows whether departments can still edit (Department agenda deadline in Event settings)."],
        keywords: "scientific programme allot slot hall approve release plenary debate clash",
      },
      {
        id: "agenda-templates", title: "Agenda templates", perm: "settings", where: "Event settings → Agenda template",
        summary: "One template per session type (e.g. Research papers only, Panel discussion). It is guidance shown to departments when they pick that session type; it does not change the agenda itself. A file (Word, PDF, Excel or PowerPoint, up to 5 MB) can be attached for download.",
        keywords: "agenda template session type guidance file upload",
      },
      {
        id: "programme-pages-admin", title: "Programme pages", perm: "programme", where: "Scientific Programme → Programme pages",
        summary: "Pre-symposium activities, Inaugural session and Meet the Experts: date and time, programme, description and people (photograph, name, affiliation, qualification). Each page stays hidden until it is published.",
        keywords: "programme pages inaugural pre-symposium meet the experts publish",
      },
      {
        id: "invitations", title: "Invitations", perm: "invitations", where: "Invitations",
        summary: "Invitation emails to chairs, co-chairs, moderators, panelists, guest speakers and oral presenters of approved, scheduled sessions, plus accepted posters. Each carries the session, date, time slot and venue, with accept and decline links. Remind non-responders, or withdraw an invitation.",
        keywords: "invitations invite accept decline remind withdraw speakers chairs",
      },
      {
        id: "sessions", title: "Sessions & Programme", perm: "sessions", where: "Sessions & Programme",
        summary: "Every session and workshop with its own dashboard: participants, attendance, live feedback and the feedback QR poster. New session is for keynotes, plenaries, ceremonies and breaks; workshops come from Form A and department sessions from the Scientific Programme.",
        keywords: "sessions dashboard keynote ceremony break participants attendance qr poster",
      },
      {
        id: "feedback", title: "Live feedback", perm: "feedback", where: "Live Feedback",
        summary: "Real-time results of QR feedback across all sessions and workshops, and the symposium-as-a-whole feedback. Refreshes every 10 seconds; Export CSV downloads all answers.",
        keywords: "feedback live results ratings export",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "communications", title: "Emails, WhatsApp and SMS",
    intro: "Every email and message goes through one queue with retries. Set up the mailboxes and xNotify first, then the individual notifications.",
    sections: [
      {
        id: "email-settings", title: "Email settings", perm: "mail", where: "Email settings",
        summary: "The mailboxes the site sends from and how emails are delivered.",
        fields: [
          ["Mailboxes", "Address, sender name, server and password (entered by the Super Admin; stored encrypted). A mailbox is switched on once its password is saved. Send a test email to check it."],
          ["Send emails", "Every notification is delivered to its recipient (live)."],
          ["Test mode", "Every email goes to one test address instead of the real recipient; the subject shows who it was for. Sign-in codes are never redirected."],
          ["Log only", "Nothing is sent; emails are only recorded under Automated emails → Sent emails."],
        ],
        keywords: "email settings mailbox smtp password delivery test mode log only send",
      },
      {
        id: "auto-emails", title: "Automated emails", perm: "emails", where: "Automated emails",
        summary: "Every email the site sends has a template here, grouped by type. Each can use its own mailbox, sender name, CC and reply-to.",
        steps: [
          "Open a template, change the subject and text (variables in {curly_brackets} are filled in automatically), and Save. Restore default text undoes your changes.",
          "Send a sample to me shows how it looks.",
          "Schedule: dispatch dates for batch emails (e.g. abstract decisions after the agenda is final). Send now or Cancel a scheduled run.",
          "Sent emails: the log with status (Sent, Waiting / retrying, Failed, Logged, Cancelled) and filters.",
        ],
        keywords: "automated emails templates subject text variables schedule sent log cc reply-to sender",
      },
      {
        id: "xnotify", title: "WhatsApp & SMS (xNotify)", perm: "messaging", where: "WhatsApp / SMS (xNotify)",
        summary: "The portal calls the eOcean xNotify API once per message; xNotify delivers it by WhatsApp or SMS using templates approved in LNH's eOcean account. Templates have fixed text, so free-text news goes by email only.",
        fields: [
          ["Send messages through xNotify", "Master switch."],
          ["API key (x-api-key)", "From eOcean; stored encrypted. Leave blank to keep the saved key."],
          ["Preferred channel", "Whatsapp or SMS, or empty to let xNotify choose. Not sent with one-time codes."],
          ["Template ID per message", "Symposium registration confirmed (2730), Workshop registration confirmed (2731), One-time code (OTP) by SMS (2780), reminders, certificates. Empty = that message is not sent."],
          ["Sending limits", "Emails and messages per minute, attempts before giving up (retries after 1, 5, 15, 60, 180 and 360 minutes)."],
          ["Send test", "Sends a chosen message with sample values to a mobile number and shows xNotify's answer."],
          ["Message log", "Every message with its status and error; retry or cancel queued ones."],
        ],
        tips: ["A one-time code is never retried (it lasts 5 minutes) and is masked in the log."],
        keywords: "whatsapp sms xnotify eocean api key template id 2730 2731 2780 otp test log retry queue",
      },
      {
        id: "reminders", title: "Reminders & certificates", perm: "notifications", where: "Reminders & Certificates",
        summary: "Send news and reminders by email to an audience (all registrants, confirmed participants, payment pending, or participants of one session), and issue e-certificates. Tick the confirmation before Send now.",
        tips: ["Automatic reminders (day before a workshop or the symposium, payment pending) run on their schedule; the notification log shows the latest 30."],
        keywords: "reminders news broadcast audience certificates issue send",
      },
      {
        id: "enquiries", title: "Enquiries", perm: "messages", where: "Enquiries",
        summary: "Messages sent from the website's Contact page. Reply by email and mark them handled.",
        keywords: "enquiries contact messages inbox",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "settings", title: "Event settings and content",
    intro: "The settings that drive the website and the portal, and the people and departments behind them.",
    sections: [
      {
        id: "settings-event", title: "Event settings: event and registration", perm: "settings", where: "Event settings",
        summary: "The basic event details and registration rules.",
        fields: [
          ["Edition, Event name, Event title / theme, Main theme, Tagline", "Shown in the website header, hero, emails and PDFs."],
          ["Symposium days", "YYYY-MM-DD, comma separated."],
          ["Starts / Ends, Venue, Virtual platform link", "Event dates and place."],
          ["Hero background video URL", "An .mp4 for the home page hero."],
          ["Registration number prefix", "e.g. SYM gives SYM-2027-00001."],
          ["Tax & processing fee (%)", "Added at checkout."],
          ["Early-bird ends", "Early-bird pricing for the Symposium Registration until this date."],
          ["Additional banquet pass fee and passes allowed", "Extra banquet passes per registration."],
          ["Registration open", "Switches registration on or off."],
        ],
        keywords: "event settings name theme tagline days dates venue prefix tax processing fee early bird banquet registration open",
      },
      {
        id: "settings-workshops", title: "Event settings: pre-symposium workshops", perm: "settings", where: "Event settings → Pre-symposium workshops",
        fields: [
          ["Workshop window opens / closes", "Form A dates must fall inside it."],
          ["Theme weeks", "One per line: start date and label (shown as weeks in the catalogue)."],
          ["Seat target", "For the committee dashboard."],
          ["PKR per USD", "For the revenue dashboard."],
          ["Unpaid workshop seat hold, hours", "Unpaid orders are cancelled after this and seats released; 0 = never."],
        ],
        summary: "Dates and targets for the workshop programme.",
        keywords: "workshop window theme weeks seat target usd seat hold",
      },
      {
        id: "settings-scientific", title: "Event settings: scientific programme", perm: "settings", where: "Event settings → Scientific programme",
        summary: "Slots, abstract review phases and deadlines.",
        fields: [
          ["Session slots", "One per line: YYYY-MM-DD HH:MM-HH:MM; add \"optional\", or \"plenary\" / \"debate\" for the committee's fixed sessions."],
          ["Abstract submission opens / deadline / word limit", "The public abstract form."],
          ["Abstract review Phase 1 and Phase 2 dates", "HOD review windows (Phase 2 for reassigned abstracts)."],
          ["Department agenda deadline", "Departments are locked after this; Scientific Committee edits only."],
          ["Presenters confirm by, Final schedule shared by, Presenter registration deadline", "Dates used in the abstract emails."],
          ["Scientific Committee email", "Shown in the abstract emails (empty = contact email)."],
          ["Abstract quality-check guidelines", "One per line, shown to HODs."],
          ["Scientific Committee sender name and CC", "For Scientific Committee emails; each notification can override the CC."],
          ["Agenda templates", "Guidance per session type, with an optional file."],
        ],
        keywords: "session slots plenary debate abstract phase deadline agenda lock presenters guidelines scientific committee email cc template",
      },
      {
        id: "settings-website", title: "Event settings: website and home page", perm: "settings", where: "Event settings",
        summary: "Contact details, social links, home page wording and the switches that make pages live.",
        fields: [
          ["Contact email and phone; Facebook, Instagram, LinkedIn, YouTube, X, WhatsApp", "Footer and Contact page."],
          ["Guest and volunteer forms: access code", "Letters and numbers, at least 8. Change it to stop old links working. The invitation links are shown under it."],
          ["Homepage teaser / promo videos", "YouTube addresses, one per line; the first is the main video."],
          ["Day 1-3 theme", "Used by the At a glance day cards and the agenda."],
          ["Day 1-3 short label", "The pills in the hero."],
          ["Themes section: name 1-3", "The \"One theme. Three frontiers.\" names (AI, Robotics, Digitization by default), independent of the day themes."],
          ["Themes / Programme section headings", "Small line above, heading and highlighted part; text under the themes heading."],
          ["Homepage ticker", "One message per line."],
          ["Previous symposium gallery link and thumbnail", "The gallery card."],
          ["Agenda is live", "The Agenda page, the homepage day cards and View Agenda; otherwise \"Coming soon\"."],
          ["Pre-symposium workshops are live", "The Workshops pages and workshop tickets; otherwise \"Coming soon\"."],
          ["E-certificates are available", "The E-certificates page; otherwise \"Coming soon\"."],
          ["Speakers are live", "Explore Speakers and the speakers section on the home page."],
        ],
        tips: ["Leave a wording field empty to use the default shown in grey."],
        keywords: "contact social links access code videos day themes frontiers ticker gallery live switches coming soon speakers",
      },
      {
        id: "content", title: "Speakers & committee", perm: "content", where: "Speakers & Committee",
        summary: "Add, edit and delete speakers and organizing committee members. Changes appear on the website immediately.",
        keywords: "speakers committee members photo content",
      },
      {
        id: "departments", title: "Departments", perm: "departments", where: "Departments",
        summary: "The list of departments used everywhere (abstract specialities, sessions, workshops). Add, edit, activate, merge a duplicate into the correct department, see its people, and set the department email (notifications go there and to its people). The change log records every change.",
        keywords: "departments add merge email people change log specialty",
      },
      {
        id: "volunteers", title: "Volunteers", perm: "volunteers", where: "Volunteers",
        summary: "Volunteer registrations awaiting approval, approved and declined. Approval issues the volunteer pass.",
        keywords: "volunteers approve pass facilitation",
      },
      {
        id: "catering", title: "Catering headcounts", perm: "catering", where: "Catering Headcounts",
        summary: "Read-only figures for the Food department, updating live as people register. Print with the Print button.",
        keywords: "catering food headcount banquet print",
      },
      {
        id: "users", title: "Users & roles", perm: "users", where: "Users & Roles",
        summary: "Create logins, give each a global role and department roles, deactivate leavers, and reset passwords. Filter by role, department and status. What each role can do lists every permission; the change log records who changed what.",
        steps: [
          "Add a user with name, email, a temporary password and the global role.",
          "Add department roles (Head, Coordinator, Focal person) for the departments they work for.",
          "Ask the person to change the password after the first sign-in.",
        ],
        keywords: "users roles logins create deactivate password reset department roles permissions change log",
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "help", title: "Troubleshooting and FAQ",
    intro: "Quick answers to the questions the desk and the committees ask most.",
    sections: [
      {
        id: "faq-email", title: "A participant did not receive an email",
        summary: "Check in this order:",
        steps: [
          "Automated emails → Sent emails: search the address. Sent means it left the server (ask them to check spam); Failed shows the error; Logged means delivery is in Log only mode.",
          "Email settings: the delivery mode should be Send emails and the mailbox switched on.",
          "Resend from the registration record (Resend email + WhatsApp / SMS).",
        ],
        keywords: "email not received spam failed resend",
      },
      {
        id: "faq-whatsapp", title: "Email went but WhatsApp did not",
        summary: "Open WhatsApp / SMS (xNotify) → Message log and find the number.",
        steps: [
          "No row: xNotify is switched off, or that message has no template ID, or the participant gave no valid mobile number.",
          "Failed: the error from xNotify is shown (e.g. a missing template variable means the template in eOcean expects a variable the portal does not send).",
          "Sent: xNotify accepted it; delivery to the phone is then eOcean's side.",
        ],
        keywords: "whatsapp not received sms failed template variable",
      },
      {
        id: "faq-payment", title: "A participant paid but the registration still shows pending",
        summary: "Bank, ATM and counter payments are confirmed by the PayPro callback, usually within minutes. If it does not arrive, check Payments (PayPro) for flagged payments, ask for the payment receipt, and use Mark as paid & notify on the registration.",
        keywords: "payment pending paid not updated callback receipt",
      },
      {
        id: "faq-code", title: "A participant does not get the sign-in code",
        summary: "Codes go to the account's email, and by SMS when SMS codes are set up. They expire after 5 minutes; a new one can be requested after 30 seconds. In Test mode, codes are not redirected, so they are not sent at all. Signing in with the password always works.",
        keywords: "code otp not received expired sign in",
      },
      {
        id: "faq-coming-soon", title: "A page says \"Coming soon\"",
        summary: "The Agenda, Workshops and E-certificates pages go live with their switches in Event settings (Agenda is live, Pre-symposium workshops are live, E-certificates are available).",
        keywords: "coming soon page hidden live switch",
      },
      {
        id: "faq-locked", title: "I cannot edit a session or workshop",
        summary: "After the Department agenda deadline only the Scientific Committee edits sessions; after an HOD approves a session flyer only the SC Chair can change it. A decided workshop request is locked for departments; the committee or Super Admin can still edit it, and changes are logged.",
        keywords: "locked cannot edit deadline flyer approved decided",
      },
      {
        id: "glossary", title: "Glossary",
        summary: "Terms used in the portal.",
        fields: [
          ["Symposium Registration (pass)", "The main registration for the three symposium days, including the banquet."],
          ["Workshop ticket", "A separate ticket for one pre-symposium workshop."],
          ["Form A", "The workshop request form."],
          ["WS-0001", "A workshop's unique ID."],
          ["HOD", "Head of Department."],
          ["SC / WP", "Scientific Committee / Workshop Programme committee."],
          ["Phase 1 / Phase 2", "First abstract review by the speciality's HOD / review of abstracts reassigned by the Secretariat."],
          ["PKT", "Pakistan Standard Time; every time in the portal."],
          ["xNotify", "eOcean's service that sends the WhatsApp and SMS messages."],
          ["PayPro", "The online payment gateway."],
        ],
        keywords: "glossary terms definitions",
      },
    ],
  },
];
