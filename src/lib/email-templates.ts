// Automated email templates (Scientific Committee feedback, 29 Oct 2026). Shared by the server and the admin editor.
// Body: plain text; a blank line starts a new paragraph; **text** is bold; {{field}} is replaced by the merge value.
// A line whose merge field is empty is left out (for example "Abstract ID:" in a chairperson's invitation).

export type TemplateDef = { name: string; audience: string; when: string; subject: string; body: string; buttonLabel?: string; switchable?: boolean };

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
];

export const TEMPLATE_KEYS = ["ABSTRACT_RECEIVED", "ABSTRACT_ACCEPTED", "ABSTRACT_REJECTED", "INVITE_SPEAKER", "INVITE_CHAIR", "INVITE_REMINDER", "AGENDA_SUBMITTED", "AGENDA_APPROVED", "SESSION_FLYER_READY", "WORKSHOP_REMINDER", "SYMPOSIUM_REMINDER"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDef> = {
  ABSTRACT_RECEIVED: {
    name: "Abstract submission acknowledgement", audience: "Presenting author", when: "Immediately after submission",
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
    name: "Abstract accepted", audience: "Presenting author", when: "Scheduled dispatch (31 December, after the agenda is finalised)",
    subject: "{{event_name}}: abstract {{abstract_id}} accepted",
    body: `Dear {{name}},

We are pleased to inform you that your abstract **"{{abstract_title}}"** ({{abstract_id}}) has been **{{status}}**.

Presenting author: {{author_name}}
Session: {{session_name}}
Date: {{session_date}}
Time: {{session_time}}
Venue: {{venue}}

The presenting author must register for the symposium.`,
    buttonLabel: "Register for the symposium",
  },
  ABSTRACT_REJECTED: {
    name: "Abstract not accepted", audience: "Presenting author", when: "Scheduled dispatch (31 December, after the agenda is finalised)",
    subject: "{{event_name}}: decision on abstract {{abstract_id}}",
    body: `Dear {{name}},

Thank you for submitting **"{{abstract_title}}"** ({{abstract_id}}). After review by the department, we regret that it could not be accepted this year.

We hope to see you at the symposium.`,
  },
  INVITE_SPEAKER: {
    name: "Invitation: speakers, panelists and abstract presenters", audience: "Guest / invited speakers, keynote speakers, panelists, oral and poster presenters", when: "Scheduled dispatch (31 December, after the agenda is finalised)",
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
    name: "Invitation: chairperson, co-chairperson and moderator", audience: "Chairpersons, co-chairpersons and moderators", when: "Scheduled dispatch (31 December, after the agenda is finalised)",
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
    name: "Invitation reminder", audience: "Invitees who have not answered", when: "Reminder dispatch",
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
    name: "Scientific agenda submitted", audience: "Department HOD", when: "When the department submits its agenda",
    subject: "{{event_name}}: agenda received · {{department}}",
    body: `Dear {{name}},

The scientific session agenda **"{{session_name}}"** for {{department}} has been submitted to the Scientific Committee.

Status: {{status}}

The original submission is kept on record. You can edit the agenda until the deadline; after it, only the Scientific Committee can make changes.`,
    buttonLabel: "View your agenda",
  },
  AGENDA_APPROVED: {
    name: "Scientific agenda approved", audience: "Department HOD", when: "When the Scientific Committee approves the session",
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
    name: "Session flyer ready for HOD approval", audience: "Department HOD", when: "When the flyer is generated after content approval",
    subject: "{{event_name}}: please approve the flyer · {{session_name}}",
    body: `Dear {{name}},

The flyer for **"{{session_name}}"** ({{department}}) has been generated from the approved session content.

Please review and approve it. Once approved it is locked; later changes can be made only through the Scientific Sessions Chairperson.`,
    buttonLabel: "Review the flyer",
  },
  WORKSHOP_REMINDER: {
    name: "Workshop reminder (day before)", audience: "Workshop ticket holders", when: "Automatically, about a day before each workshop (daily scheduler)", switchable: true,
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
  SYMPOSIUM_REMINDER: {
    name: "Symposium reminder (day before)", audience: "Symposium Pass holders (paid or complimentary)", when: "Automatically, the day before the symposium starts (daily scheduler)", switchable: true,
    subject: "Tomorrow: {{event_name}}",
    body: `Dear {{name}},

This is a reminder that the **{{event_name}}** begins tomorrow.

Date: {{session_date}}
Venue: {{venue}}
Registration No.: {{ticket_no}}

Registration opens at 8:30 am. Please bring your registration ID card or show your Symposium Pass QR at the entrance. Your ticket page also has the Scientific Agenda and the e-abstract book.`,
    buttonLabel: "Show my pass",
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
  return fill(body, vars, true).split(/\n{2,}/).map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</p>`).join("");
}

/** Sample values for the admin preview. */
export const SAMPLE_VARS: MergeVars = {
  name: "Dr. Ayesha Khan", role: "Oral presenter", session_name: "Advances in interventional cardiology", session_date: "Friday 29 January 2027",
  session_time: "08:30–10:30", venue: "Hall-B (Convention Center)", department: "Cardiology", abstract_title: "Same-day discharge after elective PCI",
  author_name: "Dr. Ayesha Khan", ticket_no: "SYM-2027-00012-W1", abstract_id: "ABS-2027-0001", status: "accepted as an oral presentation", event_name: "9th LNH Symposium 2027", link: "https://lnh-symposium.vercel.app",
};
