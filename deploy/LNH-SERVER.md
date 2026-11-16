# Deploying the 9th LNH Symposium portal to the LNH server

Instructions for the person (or agent, e.g. Codex) deploying this repository to LNH's own server. Written 13 Nov 2026 by Logic Unit.

| | |
|---|---|
| Domain | `https://symposium2027.lnh.edu.pk` |
| Server | AlmaLinux 10.2, cPanel/WHM with Apache, root via `sudo su` (host `symp.lnh.edu.pk`, 192.145.37.174) |
| cPanel account | `symposium2027` (the app runs as this user, in `/home/symposium2027/lnh-symposium`) |
| Runtime | Node.js **22 LTS** via nvm for the `symposium2027` user. Do **not** use the system Node 26 (Next.js 14 is not tested on it). |
| Database | PostgreSQL on the same server (needs version 13 or newer; the migrations use `gen_random_uuid()`) |
| Process manager | PM2 (`deploy/ecosystem.config.cjs`): `lnh-symposium` (website, `127.0.0.1:3000` only) and `lnh-notifier` (sends emails, WhatsApp, SMS) |
| Web server | cPanel Apache as reverse proxy (`deploy/apache-proxy.conf`), SSL from cPanel AutoSSL |

## Rules (please follow)

1. **No demo data in production.** Always set `SEED_DEMO=0` and `OTP_DEMO=0` in `.env`. Without them a fresh database gets demo staff logins with a known password, and sign-up codes are shown on screen.
2. **Never commit `.env`** or paste its values into logs, tickets or chat. Permissions: `chmod 600 .env`.
3. **Database changes only through migrations.** `npm run db:setup` applies `drizzle/*.sql` and seeds settings; it is safe to repeat. The app also applies pending migrations on start. Do not run `drizzle-kit push`, and do not hand-edit tables.
4. **Do not use the embedded PGlite database** (`DATABASE_URL` empty or `pglite:`) on the server. It is for local development only. `DATABASE_URL` must be `postgresql://...`.
5. **One process each** (`instances: 1`) for `lnh-symposium` and `lnh-notifier`. Rate limits, sign-in throttling and the PayPro token cache are in memory. `.env` must have `NOTIFIER=worker`: the website then only queues messages and `lnh-notifier` sends them.
6. Run `npm run db:setup` **before** `npm run build` (the build reads the database).
7. Install with plain `npm ci` (do not export `NODE_ENV=production` in the shell first): `npm run db:setup` needs the dev dependency `tsx`.
8. If you are unsure about anything that touches live data (an existing database, payments), stop and ask the project owner instead of guessing.

## First deployment

### 1. PostgreSQL

Check: `systemctl is-active postgresql && psql --version`. If PostgreSQL is not installed, install it through **WHM → Configure PostgreSQL** (it keeps cPanel aware of it), not with a plain `dnf install`.

Create the database and user for the `symposium2027` account. Use **cPanel (account symposium2027) → PostgreSQL Databases**, so cPanel's backups include it. cPanel prefixes the names, e.g. database `symposium2027_lnh`, user `symposium2027_app`. Give the user ALL privileges on the database. Use a long random password (`openssl rand -hex 24`).

Check from the server: `psql "postgresql://symposium2027_app:PASSWORD@127.0.0.1:5432/symposium2027_lnh" -c "select version();"`

### 2. Node 22 and the code (as the app user)

```bash
su - symposium2027 -s /bin/bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh && nvm install 22 && nvm alias default 22
npm install -g pm2
git clone git@github.com:logicunit01-star/lnh-symposium.git ~/lnh-symposium   # read-only deploy key, or HTTPS with a read-only token
mkdir -p ~/logs
```

### 3. Settings

```bash
cd ~/lnh-symposium
cp deploy/lnh-server.env.example .env && chmod 600 .env
# fill in DATABASE_URL, AUTH_SECRET, CRON_SECRET (openssl rand -hex 32 each), SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
```

Keep `PAYMENT_PROVIDER=manual`; PayPro is switched on by the Super Admin in Admin → Payments (see "PayPro" below). SMTP values come from LNH IT; until then emails are not delivered.

### 4. Install, database, build, start

```bash
cd ~/lnh-symposium
npm ci
npm run db:setup        # expect: "Database ready (PostgreSQL)." and "Seed complete (no demo content, SEED_DEMO=0)."
npm run build
pm2 start deploy/ecosystem.config.cjs   # starts lnh-symposium and lnh-notifier
pm2 save
curl -sI http://127.0.0.1:3000/ | head -1    # expect HTTP/1.1 200
pm2 logs lnh-notifier --lines 5 --nostream  # expect "[notifier] started"
```

Start PM2 on boot (as root): `pm2 startup systemd -u symposium2027 --hp /home/symposium2027`, run the command it prints, then as the app user `pm2 save` again.

### 5. Apache reverse proxy and SSL (as root)

```bash
for t in std ssl; do d=/etc/apache2/conf.d/userdata/$t/2_4/symposium2027/symposium2027.lnh.edu.pk; mkdir -p $d; cp /home/symposium2027/lnh-symposium/deploy/apache-proxy.conf $d/lnh-proxy.conf; done
/scripts/rebuildhttpdconf && /scripts/restartsrv_httpd
/usr/local/cpanel/bin/autossl_check --user=symposium2027
```

The domain must point to 192.145.37.174 (`getent hosts symposium2027.lnh.edu.pk`) before AutoSSL can issue the certificate. Then check `https://symposium2027.lnh.edu.pk` opens the site with a valid certificate. If the proxy modules are missing, enable `mod_proxy` and `mod_proxy_http` in WHM → EasyApache 4.

Port 3000 must not be open in the firewall; the app listens on 127.0.0.1 only.

### 6. Scheduled jobs (crontab of `symposium2027`)

```cron
# payment-pending and workshop reminders, PayPro reconcile, daily email jobs (09:05 PKT)
5 9 * * * curl -fsS -H "Authorization: Bearer CRON_SECRET_VALUE" https://symposium2027.lnh.edu.pk/api/cron/reminders > /dev/null
# scheduled email dispatches (abstract decisions, invitations)
*/15 * * * * curl -fsS -H "Authorization: Bearer CRON_SECRET_VALUE" https://symposium2027.lnh.edu.pk/api/cron/emails > /dev/null
```

Replace `CRON_SECRET_VALUE` with the value from `.env`. The server time zone must be Asia/Karachi for 09:05 to mean PKT (`timedatectl`); otherwise adjust the hour.

### 7. After the first start

- The admin console is at `https://symposium2027.lnh.edu.pk/admin/login`. Sign in with `SEED_ADMIN_EMAIL`.
- Staff logins have no "forgot password" link. To set or reset a staff password on the server (typing is hidden, nothing is stored in shell history or `.env`):
  `su - symposium2027 -s /bin/bash -c 'cd ~/lnh-symposium && source ~/.nvm/nvm.sh && npm run admin:password -- admin@lnh.edu.pk'`
  (add `--create` to create a Super Admin with that email). Remove `SEED_ADMIN_PASSWORD` from `.env` after the first setup.
- In Admin → Event Settings, check the event details, contact email/phone and the workshop window (15 Dec 2026 – 16 Jan 2027).
- Create the real staff logins in Users & Roles (HODs, committee, one "Department focal person" per department).

## Updating (every release)

```bash
su - symposium2027 -s /bin/bash
cd ~/lnh-symposium
git pull --ff-only
npm ci
npm run db:setup
npm run build
pm2 startOrReload deploy/ecosystem.config.cjs   # website and notifier (first time after 14.11.2026 it also starts lnh-notifier); then pm2 save
curl -sI http://127.0.0.1:3000/ | head -1
```

Release with the outbox (14.11.2026 Part C), once: add `NOTIFIER=worker` to `.env` before the reload, then `pm2 save`. Check Admin → WhatsApp & SMS shows "lnh-notifier running".

If `db:setup` fails, do **not** build or reload: the running version keeps working on the old database. Report the error.

## Existing data

**Decided 13 Nov 2026 by the project owner: start fresh.** Nothing is copied from the current Vercel site (its data is test data only). Create a new, empty database and run `npm run db:setup` with `SEED_DEMO=0`. Do not import, dump or restore anything from Vercel/Neon.

## PayPro

Managed in the admin since 14 Nov 2026: **Admin → Payments (Super Admin only)**. The Super Admin chooses Off (bank transfer) / PayPro demo / PayPro live and enters the demo and live credentials and the callback username/password there. They are stored encrypted (AES-256-GCM, key derived from `AUTH_SECRET`) and never shown again. "Test connection" checks the saved credentials without creating anything.

- Do **not** put PayPro credentials in `.env` any more. Leave `PAYMENT_PROVIDER=manual` there; it applies only when the admin choice is "Server settings file".
- **Never change `AUTH_SECRET`** once credentials are saved: they could no longer be decrypted (the Super Admin would have to enter them again). It also signs everyone out.
- Give PayPro the callback URL `https://symposium2027.lnh.edu.pk/paypro/uis` with the username/password set in Admin → Payments. LNH's merchant account (Liaquat_OPD) may already send callbacks to another LNH system; pending orders are therefore also checked with PayPro on every `/api/cron/emails` run (every 15 minutes), so the `*/15` cron line in section 6 is required.
- Our order numbers start with `LNHS` so they never clash with other systems on the same merchant account.

## Emails, WhatsApp and SMS (outbox)

- Every message is written to the database first (`notification_log`, status QUEUED) and sent by `lnh-notifier`, with limits per minute and retries (1, 5, 15, 60, 180, 360 minutes). Admin → WhatsApp & SMS (Super Admin) shows the queue, failed messages ("Send now", "Cancel") and whether the notifier is running.
- If `lnh-notifier` is stopped, nothing is lost: messages wait and go out when it starts again. `pm2 restart lnh-notifier`; logs `pm2 logs lnh-notifier`.
- WhatsApp/SMS through eOcean xNotify: the Super Admin enters the API key and a template ID per message in Admin → WhatsApp / SMS (xNotify); xNotify decides WhatsApp or SMS. eOcean must be able to fetch `https://symposium2027.lnh.edu.pk/api/qr/...` (the QR image sent with WhatsApp messages), so that path must stay public.

## Backups

- Database: cPanel backups include PostgreSQL databases created through cPanel. Also keep a nightly dump: `pg_dump -Fc "$DATABASE_URL" > ~/backups/lnh-$(date +%F).dump` (keep 14 days).
- Uploaded files (abstract posters, agenda files, photos) are stored **in the database**, so the dump covers them.

## Troubleshooting

- Logs: `pm2 logs lnh-symposium` or `~/logs/lnh-error.log`; sender: `pm2 logs lnh-notifier` or `~/logs/notifier-error.log`. On start the app prints `[db] migrations up to date` or `[db] MIGRATION FAILED ...`.
- `column ... does not exist`: migrations did not run. Run `npm run db:setup` and `pm2 reload lnh-symposium`.
- 502/503 from Apache: the app is not running (`pm2 status`) or the proxy include is missing (`/scripts/rebuildhttpdconf`).
- Sign-in loops on https: check `APP_URL` is the https address and the proxy sends `X-Forwarded-Proto`.
