# LNH Symposium — Website & Management System

Full-stack website for the **9th LNH Symposium 2027 — Healthcare Conundrum: Cost, Quality & Technology** (Liaquat National Hospital & Medical College, Karachi).
Dark, high-impact "LEAP-style" design in LNH navy / blue / red, with a complete registration, abstract, payment, check-in, feedback and e-certificate back end.

> All names, dates, fees, speakers and committee members are **placeholder content**. Edit them from the admin panel (`/admin`).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, React Server Components, Server Actions) + TypeScript |
| Styling | Tailwind CSS 3 — brand colours in `tailwind.config.ts` (`lnh.navy`, `lnh.blue`, `lnh.red`…) |
| Database | PostgreSQL via Drizzle ORM (`src/lib/db/schema.ts`) — embedded PGlite locally, PostgreSQL 14+ in production |
| Auth | Email + password (bcrypt), signed JWT cookie, role-based permissions |
| PDFs | `pdf-lib` — registration confirmation & e-certificates with QR codes |
| Email / SMS | SMTP (nodemailer) and any HTTP SMS gateway — logged to DB if not configured |
| Payments | Pluggable: `mock` (testing), `jazzcash` (hosted checkout), `manual` (bank transfer); PayFast stub |

## Quick start on Windows (no database install needed)

1. Install **Node.js 20+** (https://nodejs.org).
2. Double-click **`setup.bat`** — installs packages, creates `.env` with random secrets, creates the database and default data, and builds the site.
3. Double-click **`start.bat`** — runs the site and opens http://localhost:3000. Admin: http://localhost:3000/admin
   (`dev.bat` runs development mode with live reload while editing.)

By default the app uses an **embedded PostgreSQL (PGlite)** stored in the `.data` folder, so nothing else needs installing.
To use a real PostgreSQL server (recommended for production), set `DATABASE_URL="postgresql://user:pass@host:5432/lnh"` in `.env` and run `npm run db:setup` again.
To reset the local database, stop the site, delete the `.data` folder, and run `npm run db:setup`.

## Quick start (manual / Linux / macOS)

```bash
npm install
cp .env.example .env          # edit secrets; DATABASE_URL defaults to embedded PGlite
npm run db:setup              # creates tables + seeds settings, fee categories, first admin and dummy content
npm run db:demo               # optional fake data for demos — NOT for production
npm run dev                   # http://localhost:3000   admin: http://localhost:3000/admin
```

Default admin login comes from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` (default `admin@lnh.edu.pk` / `ChangeMe!2026`). **Change it immediately.**

## Demo content and new visitor flow (Oct 2026)

- Theme: *Shaping the new era of healthcare: AI-Robotics and Digitization*. Symposium days 20, 30 and 31 Jan 2027 (Day 1 AI, Day 2 Robotics, Day 3 Digitization); pre-conference workshops 14 Dec 2026 – 12 Jan 2027. All dates are editable in **Admin → Event Settings**.
- Visitor flow: `/workshops` (week tabs, calendar, department/format filters, seat tracker) → cart (sessions + workshops) → `/account` (sign-up with password policy, or sign-in) → `/checkout` (ledger, pass category, PayPro methods) → payment → QR pass with the JSON payload. Registration numbers: `SYM-2027-00001` (prefix configurable).
- Only workshops with status **APPROVED** appear publicly; set status per session in Admin → Sessions.
- **Admin → Event Settings → Reset demo content** (Super Admin) loads this demo programme and clears registrations and accounts. Use it once after deploying this version, because older databases still hold the previous demo programme.

## Workshop Programme committee workflow (Oct 2026)

- **Admin → Workshop Programme**: committee console with live KPIs (registrations vs 3,000-seat target, capacity fill by department, evaluation queue new vs under review, workshop income), revenue by registrant type (Student / LNH employee / General / Foreign, PKR with USD), the amber alert for approved workshops under 40% full within 7 days (Co-Chairs choose run / merge / cancel / extend marketing), and the programme matrix (date, 24h time, venue, registered, cap, status pill, View / Edit / Action) with venue-clash detection. Use *Simulate date* to preview alerts.
- **Form A** (`/admin/workshops/new`): Workshop Directors / HODs submit title, category, theme week (auto), departments, date picker, 24-hour times, venue with live capacity / online facility / location card and campus map, seat cap (≤ room), fee, CME, lead faculty (degrees, contact, education & experience), staff and equipment lines.
- **Approvals**: members mark *Under review*; Co-Chairs approve or reject (reason required). Approve/Reject locks the core fields; Co-Chairs can unlock for revision. Every change is logged in the request history and the proposer is emailed.
- After approval the same record drives the public catalogue card, a **flyer PDF** (`/api/workshops/<slug>/flyer`) and the **daily requirements sheet** (printable; staff and equipment consolidated by source).
- **Venues & map** (`/admin/venues`, public `/venues`): rooms, capacity, online facility, location and schematic campus map pins.
- **Waitlist**: full workshops show *Join waitlist*; the committee emails the next people when seats free up.
- Roles: `WP_CHAIR` (change + approve), `WP_MEMBER` (read + change), `HOD` (submit + see own department only; set the department in Users & Roles). Demo users `hod.criticalcare@`, `hod.nursing@`, `wp.chair@`, `wp.member@lnh.edu.pk` use the `SEED_ADMIN_PASSWORD`.

## Scientific programme and abstracts v2 (LNH forms, 23 Oct 2026)

- **Dates and rooms:** symposium days 29, 30 and 31 Jan 2027; fixed session slots (Fri/Sat 08:30–10:30, 13:45–15:30, 15:45–17:30; Sun 09:00–11:00, 11:15–13:00, 13:15–15:30 optional); 16 real rooms in Convention Center, College of Nursing, BSMT, LNMC and Radiology. Slots, review windows, lock date and agenda templates are in Event Settings.
- **Departments:** 52-speciality master list. Admin → Departments creates one login per speciality (passcode shown once, CSV download); that login opens the department portal (abstract review, session agenda, workshop requests) and sees only its own records.
- **Abstracts:** signed-in authors (email-verified) submit oral / poster / either, speciality, presenting author, up to 6 co-authors, title ≤ 35 words, structured sections ≤ 300 words, 3–5 keywords, declaration. Automatic ID `ABS-2027-NNNN`, confirmation email, duplicate-title check.
- **Review:** Phase 1, each department scores (5 criteria) and decides Accept as oral / poster, Reject or Back to secretariat inside its window, then sends decisions and keeps read-only lists. The Scientific Committee checks quality, finalises, and reassigns returned abstracts to another department, which gets a Phase 2 window. Decisions are emailed in bulk.
- **Scientific sessions:** departments submit the Scientific Sessions' Program Details form (session type, preferred slots, audience, chair, co-chair, LNH moderator, panelists, speakers, oral presenters linked by abstract ID). The committee allots slot and room (room double-booking refused, capacity warning), sees people clashes, approves, and releases the programme. Departments edit until the lock date; after it, the SC Chair authorises a 48-hour secretariat edit. The provisional schedule stays committee-only until release.
- **Invitations:** one click emails every chair, co-chair, moderator, panelist, speaker, oral presenter and accepted poster with session, date, time and venue; recipients accept or decline at `/invite/<token>`. Tracker: not sent, no response, accepted, declined, reminders, failed, withdrawn.
- **e-Abstract book:** `/abstracts/book`, searchable, published on release (committee can preview).
- Demo logins (password = `SEED_ADMIN_PASSWORD`): `hod.cardiology@`, `hod.anesthesia@`, `hod.nursing@`, `sc.chair@`, `sc.member@`, `secretariat@`, `marketing@`, `food@lnh.edu.pk`.

## SC requirements V1.0 and poster update (26 Oct 2026)

- **50 specialities:** physiotherapy, speech therapy and occupational therapy are one session ("Physiotherapy / Speech therapy / Occupational therapy"); migration 0005 merges existing records and logins.
- **Plenary and debate:** fixed committee sessions on Day 1 and Day 2, 11:00–13:00 (slots tagged `plenary` / `debate` in Event Settings). Scientific Programme → "+ Plenary / debate" records keynote speaker(s), panelists and moderator; chair and co-chair are optional. Departments cannot pick these slots, and speciality sessions cannot be allotted into them.
- **Abstract grid:** accepted abstracts get a venue (from the venue master) and a free placement field (poster board, slot, remarks), inline in the grid or on the abstract page. Poster invitations use them. SC Chair can open the venue master.
- **Marketing (flyer review only):** role `MARKETING`, page Admin → Flyer Review. Each approved workshop's flyer waits for Marketing; approve (emails the requester the link) or request changes with a note (shown to the WP committee, who resend it). The public flyer link works only after approval; staff can preview before.
- **Food department (read only):** role `CATERING`, page Admin → Catering Headcounts: delegates per symposium day, speakers per day, and per-workshop participants plus workshop team, with daily totals. Printable.
- **Flyer template:** `src/lib/pdf.ts` `workshopFlyerPdf` follows the 9th LNH Symposium poster (gradient, LNH logo, title art, dates, theme, campus artwork, Poppins). Assets in `assets/flyer/`.
- **Light mode:** public site toggle (sun/moon in the nav, also in the mobile menu); remembered per browser; admin stays as is. Colours are CSS variables in `src/app/globals.css`.

## Put it online (Vercel + Neon, free tier)

From Windows, double-click **`deploy.bat`** and follow the 5 prompts:
1. Sign in to Vercel (browser opens; free account — sign up with GitHub, Google or email).
2. The project `lnh-symposium` is created automatically.
3. Enter the admin email/password for the live site (secrets are generated for you).
4. In the browser: **Storage → Create Database → Neon** (region Singapore, Free) → connect to `lnh-symposium`. This sets `DATABASE_URL`.
5. Press a key — the site builds, creates its tables, seeds default data and goes live at `https://lnh-symposium.vercel.app` (or similar).

Run `deploy.bat` again any time to publish changes. On every deploy `vercel-build` runs `scripts/setup.ts` (safe/idempotent migrations + seed) and then `next build`.
A daily reminder job is scheduled in `vercel.json` (Vercel Cron → `/api/cron/reminders`, authorised with `CRON_SECRET`).

Add in Vercel → Project → Settings → Environment Variables when ready: `SMTP_*`, `MAIL_FROM`, `SMS_API_URL`, payment keys (`PAYMENT_PROVIDER`, `JAZZCASH_*`) and `APP_URL` once you attach a custom domain (e.g. `https://symposium.lnh.edu.pk`, via Settings → Domains). Redeploy after changing variables.

> Vercel's free Hobby plan is for non-commercial use; for the official hospital site use the Pro plan or LNH's own server.

## Production on your own server

```bash
# DATABASE_URL=postgresql://… in .env
npm install && npm run db:setup && npm run build && npm start   # behind Nginx/IIS with HTTPS
```
- Set `APP_URL` to the public URL (used in emails, PDFs and QR codes).
- Set a long random `AUTH_SECRET` and `CRON_SECRET`.
- Schedule `GET /api/cron/reminders` with header `Authorization: Bearer <CRON_SECRET>` once a day, or run `npm run reminders`.

## Features mapped to the requirements document

### Public website
| Requirement | Where |
|---|---|
| Hero with video banner, title, date, venue, CTAs (Register / Agenda / Speakers) | `/` — set a background `.mp4` in *Event Settings → Hero video* |
| Highlights, videos, "Learn more" | `/` (bento highlights, YouTube videos from settings) |
| Sticky navigation bar | `src/components/site/Nav.tsx` (glass bar, dropdowns, mobile menu) |
| About, Organizing Committee | `/about`, `/committee` |
| Agenda / schedule | `/agenda` (day tabs, timeline) |
| Speakers with photo, bio, topic, LinkedIn | `/speakers` |
| Workshops with participant limits + "Register for Workshops" | `/workshops` (live seats left) |
| Scientific & Plenary sessions + registration CTA | `/sessions` |
| Registration with fees, early-bird, student rates, all required fields | `/register` (4-step form) |
| Unique registration number, auto-allotted | `LNH27-0001…` (atomic counter) |
| Confirmation by email (PDF of all submitted details) and SMS | `src/lib/registration.ts` |
| Participant caps | enforced in a DB transaction with row locks |
| Payment gateway integrated in registration | `/register/success/[token]` → `/api/pay/[token]` |
| Abstract submission (paper & poster), guidelines, open/deadline dates, word limit | `/abstracts` |
| Awards, Contact form + details | `/awards`, `/contact` |
| Footer: quick links, social icons, Google Map of LNH | `src/components/site/Footer.tsx` |
| E-certificates (download + online verification) | `/certificates`, `/verify/[code]` |
| QR feedback per workshop/session | `/feedback/[slug]` |
| Registration status lookup | `/register/status` |

### Admin panel (`/admin`) — role-based
| Requirement | Where |
|---|---|
| Comprehensive dashboard with facts & figures | Overview: registrations, revenue, outstanding, by-category, 30-day trend, capacity |
| Dashboard per workshop/session (discrete & comprehensive) | Sessions → each session: registered/paid/attended, participant list, live feedback, QR |
| Abstracts visible by user role | Abstracts list/review (Scientific Committee role), decisions emailed to authors |
| Real-time compilation of feedback | Live Feedback board (auto-refresh) + per-session live widget |
| Registration management | search/filter, manual payment, waive, refund, resend email/SMS, notes |
| Event-day check-in | Check-in desk (USB/phone QR scanner friendly), per-session attendance |
| Reminder emails/SMS to confirmed participants | Reminders & Certificates → broadcast; automatic cron reminders |
| E-certificates for all registered participants | Reminders & Certificates → Issue (optionally only checked-in) |
| CSV exports | registrations (all / per session), abstracts, feedback |
| CMS | Speakers & committee, sessions/workshops, event settings, fee categories, users |

### Roles
| Role | Access |
|---|---|
| Super Admin | everything incl. users |
| Admin | everything except users |
| Scientific Committee | dashboard, sessions, abstracts (review), feedback |
| Registration Desk | dashboard, registrations, payments, check-in, certificates, enquiries |
| Viewer | read-only dashboards |

Edit in `src/lib/permissions.ts`.

## Payments
- `PAYMENT_PROVIDER=mock` — a simulated gateway page (approve/decline) for demos and UAT.
- `PAYMENT_PROVIDER=jazzcash` — JazzCash hosted checkout with HMAC-SHA256 secure hash and verified callback (`/api/payments/jazzcash/callback`). **Verify field names against your merchant integration guide and test in sandbox before go-live.**
- `PAYMENT_PROVIDER=manual` — shows bank details; desk staff mark payments as received.
- PayFast / bank IPG / Easypaisa: add a branch in `src/lib/payments.ts → startCheckout()` and a callback that calls `settlePayment()`.

Settlement is idempotent: it marks the registration **PAID** and sends the confirmation email (with PDF) + SMS.

## Branding
- Colours: `tailwind.config.ts` + CSS variables in `src/app/globals.css` (dark default and light theme).
- Logo and hospital name: official LNH logo from the 9th Symposium poster in `public/brand/` (dark and light variants, mark, campus artwork, poster); naming in `src/lib/brand.ts`.
- Fonts: Sora (display) + Inter (body), self-hosted via `@fontsource` (no Google Fonts call at build time).

## Project structure
```
src/
  app/(site)/        public pages
  app/admin/         admin console (+ actions.ts server actions)
  app/api/           JSON/PDF/CSV/payment/cron endpoints
  components/        site, admin and ui components
  lib/               db schema, auth, registration, payments, pdf, notify, reminders…
scripts/             seed, demo data, reminders
drizzle/             SQL migrations
```

## Security notes
- Admin routes protected by middleware + per-page/per-action permission checks.
- Participant pages use unguessable access tokens (no login needed); look-ups require reg. no. **and** email.
- Rate limiting on public forms (in-memory — use Redis if running multiple instances).
- CSV exports are protected against formula injection.
- Uploads are not accepted from the public; speaker photos are URLs or files you place in `/public`.

## Not included / next steps
- Exact JazzCash/PayFast credentials & go-live certification.
- SMS gateway account (any HTTP-based Pakistani provider works via `SMS_API_URL`).
- Real content, photos, logo and final fee structure.
- Optional: abstract file uploads (PDF), multi-reviewer scoring, Urdu translation.
