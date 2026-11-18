// Automated email templates (Scientific Committee feedback, 29 Oct 2026). Shared by the server and the admin editor.
// Body: plain text; a blank line starts a new paragraph; **text** is bold; {{field}} is replaced by the merge value.
// A line whose merge field is empty is left out (for example "Abstract ID:" in a chairperson's invitation).

/** category: grouping in the admin. locked: always sent (security, staff duties). composed: staff write the text each time (only the sender settings apply). */
export type TemplateDef = { name: string; audience: string; when: string; subject: string; body: string; buttonLabel?: string; switchable?: boolean; category: Category; locked?: boolean; composed?: boolean };
export const CATEGORIES = ["Registration and payment", "Account and security", "Guests and volunteers", "Workshops", "Certificates and feedback", "Abstracts", "Invitations", "Scientific programme (departments)", "Reminders", "Staff and enquiries"] as const;
export type Category = (typeof CATEGORIES)[number];

export const MERGE_FIELDS: [string, string][] = [
  ["name", "Recipient's name (author, chair, co-chair, speaker, panelist)"],
  ["role", "Recipient's role (Chairperson, Panelist, Oral presenter…)"],
  ["session_name", "Session name"],
  ["session_date", "Session date"],
  ["session_time", "Session time slot"],
  ["venue", "Venue"],
  ["department", "Department / speciality"],
  ["abstract_title", "Abstract title"],
  ["author_name", "Presenting author"],
  ["abstract_id", "Abstract ID"],
  ["status", "Approval / review status"],
  ["ticket_no", "Workshop ticket number"],
  ["event_name", "Symposium name"],
  ["link", "Personal link (tracking, response or portal page)"],
  ["reg_no", "Registration number"],
  ["amount", "Amount (PKR)"],
  ["details_html", "Registration details table (generated; keep on a line of its own)"],
  ["code", "One-time code"],
  ["purpose", "What the code is for (sign in, verify your account…)"],
  ["workshop", "Workshop title"],
  ["workshop_date", "Workshop date"],
  ["note", "Note from the committee / approver"],
  ["registration_type", "guest or volunteer"],
  ["approver", "Who approves (HOD / Chairperson)"],
  ["institution", "Institution"],
  ["contact_email", "Symposium contact email"],
  ["pay_by_note", "Pay-by sentence (unpaid workshop seats; empty when not needed)"],
  ["hold_hours", "Seat hold in hours (Event settings)"],
  ["reply_email", "Address replies to this email go to (the sending mailbox)"],
  ["certificate_no", "Certificate number"],
  ["enquiry_from", "Enquiry: sender name, email and phone"],
  ["message", "Enquiry message"],
  ["participants", "Expected participants"],
  ["qr_html", "QR code image (generated; keep on a line of its own)"],
  ["contact_phone", "Symposium contact phone"],
  ["workshop_time", "Workshop time"],
  ["payment_status", "Payment status (Paid / Pending / Complimentary)"],
  ["transaction_id", "Payment transaction / reference number"],
  ["confirm_by", "Abstract: confirm participation by (date)"],
  ["schedule_update_by", "Abstract: schedule updates posted by (date)"],
  ["registration_deadline", "Abstract: presenting author registers by (date)"],
  ["schedule_link", "Link to the agenda"],
  ["registration_link", "Link to symposium registration"],
  ["sc_email", "Scientific Committee email"],
];

export const TEMPLATE_KEYS = [
  "REGISTRATION_RECEIVED", "REGISTRATION_CONFIRMED", "WORKSHOP_CONFIRMED", "PAYMENT_PENDING", "SEAT_HOLD_EXPIRED",
  "SIGN_IN_CODE",
  "GUEST_RECEIVED", "GUEST_TO_APPROVE", "GUEST_NOT_APPROVED",
  "WORKSHOP_REQUEST_APPROVED", "WORKSHOP_REQUEST_REJECTED", "WORKSHOP_FLYER_APPROVED", "WAITLIST_SEAT_FREE", "WORKSHOP_CANCELLED",
  "CERTIFICATE_READY", "WORKSHOP_CERTIFICATE", "WORKSHOP_FEEDBACK_REQUEST",
  "ABSTRACT_RECEIVED", "ABSTRACT_ACCEPTED", "ABSTRACT_ACCEPTED_POSTER", "ABSTRACT_REJECTED", "INVITE_SPEAKER", "INVITE_CHAIR", "INVITE_REMINDER",
  "AGENDA_SUBMITTED", "AGENDA_APPROVED", "SESSION_FLYER_READY", "SESSION_DETAILS_REQUEST",
  "WORKSHOP_REMINDER", "SYMPOSIUM_REMINDER",
  "CONTACT_ENQUIRY", "BROADCAST",
] as const;
/** The Scientific Committee templates (29 Oct 2026) keep the CC address from Event Settings unless a CC is set on the template. */
export const SC_KEYS: TemplateKey[] = ["ABSTRACT_RECEIVED", "ABSTRACT_ACCEPTED", "ABSTRACT_ACCEPTED_POSTER", "ABSTRACT_REJECTED", "INVITE_SPEAKER", "INVITE_CHAIR", "INVITE_REMINDER", "AGENDA_SUBMITTED", "AGENDA_APPROVED", "SESSION_FLYER_READY", "WORKSHOP_REMINDER", "SYMPOSIUM_REMINDER"];
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDef> = {
  ABSTRACT_RECEIVED: {
    category: "Abstracts", name: "Abstract submission acknowledgement", audience: "Presenting author", when: "Immediately after submission",
    subject: "{{event_name}}: abstract received ({{abstract_id}})",
    body: `Dear {{name}},

Your abstract **"{{abstract_title}}"** has been received.

Abstract ID: {{abstract_id}}
Speciality: {{department}}
Status: {{status}}

You can follow the status (under review, accepted or rejected) in your account. Decisions are emailed after the scientific agenda is finalised. All further correspondence will be with you as the presenting author.`,
    buttonLabel: "Track your abstract",
  },
  ABSTRACT_ACCEPTED: {
    category: "Abstracts", name: "Abstract accepted: oral presentation", audience: "Presenting author", when: "Scheduled dispatch, after the agenda is finalised (email only)",
    subject: "Action Required: Abstract Acceptance Notification (Oral Presentation) – {{event_name}} [Abstract ID: {{abstract_id}}]",
    body: `Dear Dr. {{name}},

On behalf of the Scientific Committee, we are delighted to inform you that your abstract has been **ACCEPTED for ORAL PRESENTATION** at the 9th Liaquat National Hospital (LNH) Symposium, to be held from 29 to 31 January 2027. Congratulations!

**ACCEPTED ABSTRACT DETAILS**
Abstract ID: {{abstract_id}} (please quote this in all future correspondence)
Title: {{abstract_title}}
Presentation Type: Oral Presentation

**SESSION DETAILS**
Session Name: {{session_name}}
Day and Date: {{session_date}}
Time Slot: {{session_time}}
Venue: {{venue}}

**PLEASE CONFIRM YOUR PARTICIPATION**
Please confirm by {{confirm_by}} whether you are able to present your accepted abstract at the date and time slot given above, using the button below.

Please select one of the following options:
- **CONFIRMED:** I accept the invitation, I am available on the date and time above, and will attend and present in person.
- **NOT AVAILABLE:** I am unable to present at the scheduled date and time. (If possible, please state a preferred alternative day or time slot and the reason.)

Your response will be recorded on the portal automatically.

**IMPORTANT INFORMATION**
- Your abstract has been accepted in its submitted form. No changes to the abstract content can be made after acceptance.
- The presenting author is required to present the abstract in person at the symposium and must be available at the scheduled time of the session.
- The session details are given above. Any update to the date, time or venue will be posted on the symposium portal by {{schedule_update_by}}. Please check the schedule here: {{schedule_link}}
- The presenting author must complete symposium registration by {{registration_deadline}}. Registration link: {{registration_link}}
- Your accepted abstract will be published in the electronic Abstract Book of the 9th LNH Symposium.
- If you have any questions, please contact the Scientific Committee at {{sc_email}}, quoting your Abstract ID.

We look forward to welcoming you to the symposium.

Kind regards,
Scientific Committee
{{event_name}}
{{sc_email}}`,
    buttonLabel: "Confirm participation",
  },
  ABSTRACT_ACCEPTED_POSTER: {
    category: "Abstracts", name: "Abstract accepted: ePoster presentation", audience: "Presenting author", when: "Scheduled dispatch, after the agenda is finalised (email only)",
    subject: "Action Required: Abstract Acceptance Notification (ePoster Presentation) – {{event_name}} [Abstract ID: {{abstract_id}}]",
    body: `Dear Dr. {{name}},

On behalf of the Scientific Committee, we are delighted to inform you that your abstract has been **ACCEPTED for ePOSTER PRESENTATION** at the 9th Liaquat National Hospital (LNH) Symposium, to be held from 29 to 31 January 2027. Congratulations!

**ACCEPTED ABSTRACT DETAILS**
Abstract ID: {{abstract_id}} (please quote this in all future correspondence)
Title: {{abstract_title}}
Presentation Type: ePoster Presentation (displayed on LED screens)

**SESSION DETAILS**
Session Name: {{session_name}}
Day and Date: {{session_date}}
Display Time Slot: {{session_time}}
Venue for e-poster display: {{venue}}

**PLEASE CONFIRM YOUR PARTICIPATION**
Please confirm by {{confirm_by}} whether you are able to present your accepted ePoster at the date and time slot given above, using the button below.

Please select one of the following options:
- **CONFIRMED:** I accept the invitation, I am available on the date and time above, and will attend and present my ePoster in person.
- **NOT AVAILABLE:** I am unable to present at the scheduled date and time. (If possible, please state a preferred alternative day or time slot and the reason.)

Your response will be recorded on the portal automatically.

**IMPORTANT INFORMATION**
- Your abstract has been accepted in its submitted form. No changes to the abstract content can be made after acceptance.
- The presenting author is required to present the ePoster in person at the symposium and must be available at the scheduled time of the ePoster session.
- The session details are given above. Any update to the date, time or venue will be posted on the symposium portal by {{schedule_update_by}}. Please check the schedule here: {{schedule_link}}
- The presenting author must complete symposium registration by {{registration_deadline}}. Registration link: {{registration_link}}
- Your accepted abstract will be published in the electronic Abstract Book of the 9th LNH Symposium.
- If you have any questions, please contact the Scientific Committee at {{sc_email}}, quoting your Abstract ID.

**ePOSTER SUBMISSION GUIDELINES**
ePosters will be shown on LED screens in the ePoster area. Please design your ePoster for on-screen viewing, not for printing. Guidelines will be provided by the Poster Committee.
- The presenting author must be at the ePoster screen during the scheduled session to present and answer questions from the judges and visitors.
- ePosters will be judged by a panel and awards given for the best ePosters.

We look forward to welcoming you to the symposium.

Kind regards,
Scientific Committee
{{event_name}}
{{sc_email}}`,
    buttonLabel: "Confirm participation",
  },
  ABSTRACT_REJECTED: {
    category: "Abstracts", name: "Abstract not accepted", audience: "Presenting author", when: "Scheduled dispatch, after the agenda is finalised (email only)",
    subject: "Abstract Submission Outcome – {{event_name}} [Abstract ID: {{abstract_id}}]",
    body: `Dear Dr. {{name}},

Thank you for submitting your abstract to the 9th Liaquat National Hospital (LNH) Symposium, to be held from 29 to 31 January 2027, and for your interest in contributing to the scientific programme.

**SUBMISSION DETAILS**
Abstract ID: {{abstract_id}}
Title: {{abstract_title}}
Presenting Author: {{author_name}}

After careful review, we regret to inform you that your abstract has not been accepted for presentation at this symposium.

The Scientific Committee received a large number of submissions of high quality, and the number of oral and ePoster slots is limited. Each abstract was reviewed by two independent reviewers of your speciality, against the criteria of scientific merit, originality, methodology, clarity and relevance to the symposium themes. Selection was therefore highly competitive, and this decision does not reflect on the value of your work or your research efforts.

We sincerely appreciate the time and effort you put into your submission. We encourage you to continue your research and to submit your work to future LNH Symposia and other scientific forums.

We would be glad to welcome you at the symposium as a delegate. Registration details are available here: {{registration_link}}

If you have any questions, please contact the Scientific Committee at {{sc_email}}, quoting your Abstract ID.

With kind regards,
Scientific Committee
{{event_name}}
{{sc_email}}`,
    buttonLabel: "Register as a delegate",
  },
  INVITE_SPEAKER: {
    category: "Invitations", name: "Invitation: speakers, panelists and abstract presenters", audience: "Guest / invited speakers, keynote speakers, panelists, oral and poster presenters", when: "Scheduled dispatch (31 December, after the agenda is finalised)",
    subject: "{{event_name}}: invitation as {{role}}",
    body: `Dear {{name}},

On behalf of the Scientific Committee, we are pleased to invite you as **{{role}}** at the {{event_name}}.

Session: {{session_name}}
Topic / abstract: {{abstract_title}}
Abstract ID: {{abstract_id}}
Date: {{session_date}}
Time: {{session_time}}
Venue: {{venue}}

Please confirm whether you accept this invitation.`,
    buttonLabel: "Accept or decline",
  },
  INVITE_CHAIR: {
    category: "Invitations", name: "Invitation: chairperson, co-chairperson and moderator", audience: "Chairpersons, co-chairpersons and moderators", when: "Scheduled dispatch (31 December, after the agenda is finalised)",
    subject: "{{event_name}}: invitation as {{role}} · {{session_name}}",
    body: `Dear {{name}},

On behalf of the Scientific Committee, we are pleased to invite you as **{{role}}** of the session **"{{session_name}}"** ({{department}}) at the {{event_name}}.

Date: {{session_date}}
Time: {{session_time}}
Venue: {{venue}}

Please confirm whether you accept this invitation.`,
    buttonLabel: "Accept or decline",
  },
  INVITE_REMINDER: {
    category: "Invitations", name: "Invitation reminder", audience: "Invitees who have not answered", when: "Reminder dispatch",
    subject: "Reminder: {{event_name}} invitation as {{role}}",
    body: `Dear {{name}},

This is a reminder of our invitation to you as **{{role}}** at the {{event_name}}.

Session: {{session_name}}
Date: {{session_date}}
Time: {{session_time}}
Venue: {{venue}}

We would be grateful if you could confirm whether you accept.`,
    buttonLabel: "Accept or decline",
  },
  AGENDA_SUBMITTED: {
    category: "Scientific programme (departments)", name: "Scientific agenda submitted", audience: "Department HOD", when: "When the department submits its agenda",
    subject: "{{event_name}}: agenda received · {{department}}",
    body: `Dear {{name}},

The scientific session agenda **"{{session_name}}"** for {{department}} has been submitted to the Scientific Committee.

Status: {{status}}

The original submission is kept on record. You can edit the agenda until the deadline; after it, only the Scientific Committee can make changes.`,
    buttonLabel: "View your agenda",
  },
  AGENDA_APPROVED: {
    category: "Scientific programme (departments)", name: "Scientific agenda approved", audience: "Department HOD", when: "When the Scientific Committee approves the session",
    subject: "{{event_name}}: agenda approved · {{session_name}}",
    body: `Dear {{name}},

The Scientific Committee has approved the scientific session **"{{session_name}}"** ({{department}}).

Date: {{session_date}}
Time: {{session_time}}
Venue: {{venue}}
Status: {{status}}

The session flyer will be sent to you for final approval.`,
    buttonLabel: "View your agenda",
  },
  SESSION_FLYER_READY: {
    category: "Scientific programme (departments)", name: "Session flyer ready for HOD approval", audience: "Department HOD", when: "When the flyer is generated after content approval",
    subject: "{{event_name}}: please approve the flyer · {{session_name}}",
    body: `Dear {{name}},

The flyer for **"{{session_name}}"** ({{department}}) has been generated from the approved session content.

Please review and approve it. Once approved it is locked; later changes can be made only through the Scientific Sessions Chairperson.`,
    buttonLabel: "Review the flyer",
  },
  WORKSHOP_REMINDER: {
    category: "Reminders", name: "Workshop reminder (day before)", audience: "Workshop ticket holders", when: "Automatically, about a day before each workshop (daily scheduler)", switchable: true,
    subject: "Tomorrow: {{session_name}}",
    body: `Dear {{name}},

This is a reminder of your workshop **"{{session_name}}"**.

Date: {{session_date}}
Time: {{session_time}}
Venue: {{venue}}
Ticket: {{ticket_no}}

Please arrive 15 minutes early and show your workshop ticket QR at the door. It is on your ticket page and in your confirmation PDF.`,
    buttonLabel: "Show my ticket",
  },
  WORKSHOP_CANCELLED: {
    category: "Workshops", name: "Workshop cancelled", audience: "Workshop ticket holders", when: "When the Workshop Programme Co-Chairs cancel a workshop (low-fill decision \"Cancel\")",
    subject: "Workshop cancelled: {{session_name}}",
    body: `Dear {{name}},

We regret to inform you that the Pre-Symposium Workshop **"{{session_name}}"** ({{session_date}}) has been cancelled.

Ticket: {{ticket_no}}

The symposium secretariat will contact you about a refund, or a seat in another workshop if you prefer. You can also reply to this email or write to {{contact_email}}.

We apologise for the inconvenience.`,
    buttonLabel: "View my registration",
  },
  SYMPOSIUM_REMINDER: {
    category: "Reminders", name: "Symposium reminder (day before)", audience: "Symposium Pass holders (paid or complimentary)", when: "Automatically, the day before the symposium starts (daily scheduler)", switchable: true,
    subject: "Tomorrow: {{event_name}}",
    body: `Dear {{name}},

This is a reminder that the **{{event_name}}** begins tomorrow.

Date: {{session_date}}
Venue: {{venue}}
Registration No.: {{ticket_no}}

Registration opens at 8:30 am. Please bring your registration ID card or show your Symposium Pass QR at the entrance. Your ticket page also has the Scientific Agenda and the e-abstract book.`,
    buttonLabel: "Show my pass",
  },
  // ---- added 14 Nov 2026 (Email settings): every notification the site sends now has an editable template ----
  REGISTRATION_RECEIVED: {
    category: "Registration and payment", name: "Registration received (payment pending)", audience: "Participant", when: "Right after registering, while payment is pending",
    subject: "{{event_name}}: registration received ({{reg_no}})",
    body: `Dear {{name}},

Thank you for registering for the **{{event_name}}**.

{{details_html}}

Your registration is confirmed once the payment of **{{amount}}** is received. A PDF with all the details you submitted is attached.

{{pay_by_note}}`,
    buttonLabel: "Complete payment",
  },
  REGISTRATION_CONFIRMED: {
    category: "Registration and payment", name: "Symposium registration confirmed", audience: "Participant with symposium registration", when: "When the payment is received (or a complimentary registration is approved). Also sent by WhatsApp with the QR code",
    subject: "Registration Confirmed – {{event_name}}",
    body: `Dear {{name}},

Greetings from Liaquat National Hospital! We are pleased to confirm your registration for the **{{event_name}}**.

Thank you for being part of this prestigious academic event.

Registration ID: **{{reg_no}}**

**Your QR Code:** Please keep your registration QR code handy and present it at the entry counter on the day. It will be scanned for attendance verification and entry.

{{qr_html}}

**Want to learn more? Join our Pre-Symposium Workshops:**
1. Log in to the symposium portal with your registered email.
2. Browse the workshops and select your sessions.
3. Pay the fee, where applicable, to confirm your seat.

You will then receive a separate email with your workshop QR code and session details. Seats are limited and allocated on a first-come, first-served basis.

**Need help?**
Email: Reply to this email or write to {{reply_email}} | Phone: {{contact_phone}}

We look forward to welcoming you!

Kind regards,
Registration Committee
{{event_name}}
Liaquat National Hospital, Karachi`,
    buttonLabel: "View my registration",
  },
  WORKSHOP_CONFIRMED: {
    category: "Registration and payment", name: "Workshop registration confirmed", audience: "Workshop participant (one email per workshop)", when: "When the workshop payment is received. Also sent by WhatsApp with the QR code",
    subject: "Workshop Registration Confirmed – {{workshop}}, {{event_name}}",
    body: `Dear {{name}},

Greetings from Liaquat National Hospital!

Your registration for the Pre-Symposium Workshop of the **{{event_name}}** is confirmed.

**Workshop Details**
Workshop: {{workshop}}
Date & Time: {{workshop_date}}, {{workshop_time}}
Venue: {{venue}}
Registration ID: {{ticket_no}}

**Payment Details**
Status: {{payment_status}}
Amount Paid: {{amount}}
Transaction ID: {{transaction_id}}

Your unique registration QR code is provided below. Please present it at the registration counter for verification and attendance marking. Keep it on your mobile device or carry a printed copy. Kindly arrive 15 minutes before the workshop.

{{qr_html}}

This QR code is unique to you. Please do not share it.

**For Assistance:** Please reply to this email.
{{department}} | {{reply_email}} | {{contact_phone}}

We look forward to welcoming you!

Kind regards,
Registration Committee
{{event_name}}
Liaquat National Hospital, Karachi`,
    buttonLabel: "View my registration",
  },
  PAYMENT_PENDING: {
    category: "Registration and payment", name: "Payment pending reminder", audience: "Participant with an unpaid registration", when: "Automatically, 48 hours after registering and then every 72 hours (daily scheduler)", switchable: true,
    subject: "Payment pending: {{reg_no}}",
    body: `Dear {{name}},

Your registration **{{reg_no}}** for the {{event_name}} is awaiting payment of **{{amount}}**. Workshop seats are limited and are confirmed on payment.

{{pay_by_note}}`,
    buttonLabel: "Pay now",
  },
  SEAT_HOLD_EXPIRED: {
    category: "Registration and payment", name: "Unpaid registration cancelled (seat hold ended)", audience: "Participant with an unpaid workshop registration", when: "Automatically, when the seat hold (Event settings) ends without payment",
    subject: "Registration {{reg_no}} cancelled: payment not received",
    body: `Dear {{name}},

We did not receive the payment of **{{amount}}** for registration **{{reg_no}}** within {{hold_hours}} hours, so the registration has been cancelled and its workshop seats were released to other participants.

Workshop(s): {{workshop}}

You are welcome to register again while seats are available. If you have already paid, please reply to this email with your payment receipt and registration number.`,
    buttonLabel: "Register again",
  },
  SIGN_IN_CODE: {
    category: "Account and security", name: "One-time code", audience: "Participant", when: "When someone signs up, signs in, resets a password or looks up a registration", locked: true,
    subject: "Your LNH Symposium code: {{code}}",
    body: `Use this code to {{purpose}}:

**{{code}}**

It expires in 5 minutes. If you did not ask for it, ignore this email.`,
  },
  GUEST_RECEIVED: {
    category: "Guests and volunteers", name: "Guest / volunteer registration received", audience: "Guest or volunteer", when: "Right after a guest or volunteer registers",
    subject: "{{event_name}}: registration received ({{reg_no}})",
    body: `Dear {{name}},

Your registration {{role}} has been received. Registration number: **{{reg_no}}**.

It will be confirmed after approval by {{approver}}. Your pass and QR code are emailed once approved.`,
    buttonLabel: "View your registration",
  },
  GUEST_TO_APPROVE: {
    category: "Guests and volunteers", name: "Guest / volunteer registration to approve", audience: "HOD (guests) or Chairperson, Facilitation Committee (volunteers)", when: "When a guest or volunteer registers", locked: true,
    subject: "{{event_name}}: {{registration_type}} registration to approve ({{reg_no}})",
    body: `Dear {{name}},

{{author_name}} ({{institution}}) has registered {{role}}.

Please approve or decline in the portal.`,
    buttonLabel: "Review",
  },
  GUEST_NOT_APPROVED: {
    category: "Guests and volunteers", name: "Guest / volunteer registration not approved", audience: "Guest or volunteer", when: "When the approver declines",
    subject: "{{event_name}}: registration {{reg_no}}",
    body: `Dear {{name}},

Your {{registration_type}} registration **{{reg_no}}** could not be approved.
Note: {{note}}

For questions, contact {{contact_email}}.`,
  },
  WORKSHOP_REQUEST_APPROVED: {
    category: "Workshops", name: "Workshop request approved", audience: "HOD who submitted the request", when: "When the committee approves a workshop request",
    subject: "Workshop request approved: {{workshop}}",
    body: `Dear {{name}},

The Workshop Programme Committee has **approved** "{{workshop}}" ({{workshop_date}}).
Committee note: {{note}}

It is now live in the catalogue. The flyer goes to the Marketing department for review; we will email it to you once approved.`,
  },
  WORKSHOP_REQUEST_REJECTED: {
    category: "Workshops", name: "Workshop request not approved", audience: "HOD who submitted the request", when: "When the committee does not approve a workshop request",
    subject: "Workshop request not approved: {{workshop}}",
    body: `Dear {{name}},

The Workshop Programme Committee has **not approved** "{{workshop}}" ({{workshop_date}}).
Committee note: {{note}}`,
  },
  WORKSHOP_FLYER_APPROVED: {
    category: "Workshops", name: "Workshop flyer approved", audience: "HOD who submitted the request", when: "When Marketing approves the workshop flyer",
    subject: "Flyer approved: {{workshop}}",
    body: `Dear {{name}},

The Marketing department has approved the flyer for "{{workshop}}" ({{workshop_date}}).

Download and share it with the button below.`,
    buttonLabel: "Download the flyer",
  },
  WAITLIST_SEAT_FREE: {
    category: "Workshops", name: "Waitlist: a seat is free", audience: "People on a workshop waitlist", when: "When the committee emails the waitlist after seats open",
    subject: "A seat is free: {{workshop}}",
    body: `Dear {{name}},

A seat has opened in **{{workshop}}** on {{workshop_date}}. Seats go to whoever pays first.`,
    buttonLabel: "Book now",
  },
  CERTIFICATE_READY: {
    category: "Certificates and feedback", name: "Symposium e-certificate ready", audience: "Participant", when: "When the secretariat issues certificates",
    subject: "{{event_name}}: your e-certificate",
    body: `Dear {{name}},

Thank you for participating in the **{{event_name}}**. Your certificate of participation (No. **{{certificate_no}}**) is ready to download.`,
    buttonLabel: "Download certificate",
  },
  WORKSHOP_CERTIFICATE: {
    category: "Certificates and feedback", name: "Workshop certificate ready", audience: "Workshop participant", when: "Automatically, once attendance is confirmed and the feedback form is submitted",
    subject: "Workshop certificate: {{workshop}}",
    body: `Dear {{name}},

Thank you for attending **{{workshop}}** and for your feedback. Your workshop certificate (No. **{{certificate_no}}**) is ready to download.`,
    buttonLabel: "Download certificate",
  },
  WORKSHOP_FEEDBACK_REQUEST: {
    category: "Certificates and feedback", name: "Workshop feedback request", audience: "Workshop participant", when: "When the department focal person confirms attendance and no feedback is in yet",
    subject: "Your feedback on {{workshop}}",
    body: `Dear {{name}},

Your department has confirmed your attendance at **{{workshop}}**. Please complete the short feedback form; your e-certificate is emailed as soon as you submit it.`,
    buttonLabel: "Give feedback",
  },
  SESSION_DETAILS_REQUEST: {
    category: "Scientific programme (departments)", name: "Session ready to complete", audience: "Department logins", when: "When the secretariat pre-fills a department's scientific session",
    subject: "Complete your session details: {{department}}",
    body: `Dear {{name}},

The symposium secretariat has entered your department's session ({{session_time}}, about {{participants}} participants).

Please sign in and add the session title, type, chairperson, co-chairperson, moderator, speakers and presenters before the agenda lock date.`,
    buttonLabel: "Complete the session",
  },
  CONTACT_ENQUIRY: {
    category: "Staff and enquiries", name: "Website enquiry", audience: "Symposium contact address (Event Settings)", when: "When someone sends the contact form", locked: true,
    subject: "[Website enquiry] {{status}}",
    body: `**{{enquiry_from}}**

{{message}}`,
  },
  BROADCAST: {
    category: "Staff and enquiries", name: "Messages from staff (Reminders & Certificates)", audience: "Participants chosen by staff", when: "When staff send a message from Reminders & Certificates", composed: true,
    subject: "(written by staff when sending)", body: "(written by staff when sending)",
  },
};

export type MergeVars = Partial<Record<string, string | null | undefined>>;

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const FIELD = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Fill merge fields. Lines whose merge field has no value are dropped. */
export function fill(text: string, vars: MergeVars, html: boolean) {
  return text.split("\n").filter((line) => [...line.matchAll(FIELD)].every((m) => (vars[m[1]] ?? "").toString().trim() !== ""))
    .map((line) => (html ? esc(line) : line).replace(FIELD, (_, k) => { const v = (vars[k] ?? "").toString(); return html ? esc(v) : v; }))
    .join("\n");
}

/** Body text → HTML paragraphs (bold with **text**). */
export function bodyToHtml(body: string, vars: MergeVars) {
  // A paragraph that is only an *_html field (e.g. {{details_html}}) is inserted as generated HTML; every other value is escaped.
  return body.split(/\n{2,}/).map((para) => {
    const raw = para.trim().match(/^\{\{\s*([a-z_]+_html)\s*\}\}$/);
    if (raw) return (vars[raw[1]] ?? "").toString();
    const f = fill(para, vars, true);
    return f.trim() ? `<p>${f.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</p>` : "";
  }).join("");
}

/** Sample values for the admin preview. */
export const SAMPLE_VARS: MergeVars = {
  pay_by_note: "Please pay by 20 Nov 2026, 10:30 (Pakistan time). After that, unpaid workshop seats are released to other participants and this registration is cancelled.", hold_hours: "72",
  name: "Dr. Ayesha Khan", role: "Oral presenter", session_name: "Advances in interventional cardiology", session_date: "Friday 29 January 2027",
  session_time: "08:30–10:30", venue: "Hall-B (Convention Center)", department: "Cardiology", abstract_title: "Same-day discharge after elective PCI",
  author_name: "Dr. Ayesha Khan", ticket_no: "SYM-2027-00012-W1", abstract_id: "ABS-2027-0001", status: "accepted as an oral presentation", event_name: "9th LNH Symposium 2027", link: "https://symposium2027.lnh.edu.pk",
  reg_no: "SYM-2027-00012", amount: "PKR 6,000", code: "482915", purpose: "sign in to your account", workshop: "Critical Care Day: Ventilation and Bedside Ultrasound",
  workshop_date: "Tuesday 15 December 2026", note: "Please add the facilitators' names.", registration_type: "guest", approver: "the Head of the Cardiology department",
  institution: "Liaquat National Hospital", contact_email: "symposium@lnh.edu.pk", certificate_no: "LNH27-C00012", enquiry_from: "Dr. Sara Ali <sara@example.com> 0300-1234567",
  message: "Is parking available for participants?", participants: "120",
  qr_html: '<p style="text-align:center"><span style="display:inline-block;width:180px;height:180px;line-height:180px;background:#eef2f9;border:1px dashed #9aa8c2;color:#5b6b8c;font-size:13px">QR code</span></p>',
  contact_phone: "021-34412679", workshop_time: "09:00 – 13:00", payment_status: "Paid", transaction_id: "LNHS2611140930AB12",
  confirm_by: "Friday 8 January 2027", schedule_update_by: "Friday 15 January 2027", registration_deadline: "Friday 15 January 2027",
  schedule_link: "https://symposium2027.lnh.edu.pk/agenda", registration_link: "https://symposium2027.lnh.edu.pk/register", sc_email: "Symposium.Scientific@lnh.edu.pk", reply_email: "registration@symposium2027.lnh.edu.pk",
  details_html: '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:14px"><tr><td style="padding:6px 0;color:#5b6b8c">Registration No.</td><td style="font-weight:700;font-size:18px">SYM-2027-00012</td></tr><tr><td style="padding:6px 0;color:#5b6b8c">Total fee</td><td><b>PKR 6,000</b></td></tr><tr><td style="padding:6px 0;color:#5b6b8c">Status</td><td><b style="color:#0b8a4c">CONFIRMED</b></td></tr></table>',
};