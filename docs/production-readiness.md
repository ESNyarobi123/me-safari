# Production readiness and release runbook

This runbook is intentionally stricter than the local setup. It separates **configuration that is ready** from **product capabilities that are still launch blockers**. A green build never overrides a blocked payment or storage adapter.

## Current release status

| Area | Status | Evidence / requirement |
|---|---|---|
| API, worker and web builds | Ready | `pnpm build:api`, `pnpm build:worker`, `pnpm build:web`; artifacts checked by the preflight. |
| Production module resolution | Ready | API/worker start compiled JavaScript with `node --conditions=production`; `@ma/backend` and `@ma/database` resolve their `dist` exports. |
| Health checks | Ready | `GET /v1/health/live` and `GET /v1/health/ready` (readiness checks PostgreSQL and Redis). |
| HTTPS/CORS/secrets guards | Ready | Boot rejects placeholders, HTTP public URLs, wildcard CORS and mock payments in production. |
| Live payment adapter | **Blocked** | Only the development `mock` adapter exists. Real card/mobile-money collection requires a verified provider adapter, webhook signature verification and sandbox certification. |
| Private object storage | **Blocked** | Local private storage is development-only. Production needs private object storage, encryption at rest, short-lived downloads and malware scanning for untrusted uploads. |
| Push notifications | Optional | `PUSH_PROVIDER=disabled` keeps portal/email notifications; enabling Expo push needs device-token operations and delivery monitoring. |
| Backups and monitoring | Operator setup | The database and private-file paths are known; schedules, offsite encryption, retention and alert routing are owner/operator decisions. |

Do not announce "payments live" or accept real money until the two blocked rows are closed and verified.

## Preflight gate

Run before every release and after any environment change:

```bash
pnpm build:api && pnpm build:worker
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1 pnpm build:web
NODE_ENV=production pnpm preflight:production
```

The `example.com` hosts in commands are placeholders. The API URL must be the real production URL at build time; preflight rejects a bundle that still contains the localhost fallback.

On a production host, pass the service environment file explicitly. The command refuses to read a repository `.env` when `NODE_ENV=production`:

```bash
NODE_ENV=production node --env-file=/etc/ma-safaris/api.env --import tsx scripts/production-preflight.ts
```

Useful variants (with the service environment file):

```bash
ENV_FILE=/etc/ma-safaris/api.env
NODE_ENV=production node --env-file="$ENV_FILE" --import tsx scripts/production-preflight.ts --skip-connect
NODE_ENV=production node --env-file="$ENV_FILE" --import tsx scripts/production-preflight.ts --json
```

The command reads the process environment (or `.env` for local checks), never prints secret values, and exits non-zero for any `FAIL` or `BLOCKED` item. It checks:

- `NODE_ENV=production`, random secrets (not placeholders), HTTPS public URLs and explicit HTTPS CORS origins.
- `TRUST_PROXY` is a concrete proxy address, not a wildcard.
- `/v1` suffix on `PUBLIC_API_BASE_URL`; no loopback production URLs; bare web/CORS origins with no path or trailing slash.
- development payment simulation disabled; remote SMTP with a non-Mailpit port, valid TLS mode and approved sender; no demo seed password.
- API, worker, backend, database and static web build artifacts present; the static export contains no `localhost`/loopback API URL (a build made with the development fallback fails here); both compiled API and worker graphs load with `--conditions=production`.
- private storage writable and configured with an absolute path; PostgreSQL and Redis reachable when connectivity is enabled; no unfinished Prisma migration remains. `rediss://` is accepted for TLS Redis.

Expected current result: configuration checks pass only after the environment is filled in, and two `BLOCKED` items remain for payment and storage. That is the honest release state.

## Recommended topology

```text
Internet
  ├─ app.example.com  ── Caddy/HTTPS ── /srv/ma-safaris/web (static export)
  └─ api.example.com  ── Caddy/HTTPS ── 127.0.0.1:4000 (API)
                                         ├─ PostgreSQL 17 (private)
                                         ├─ Redis 8 (private, BullMQ)
                                         └─ private object storage (future)
Worker ── PostgreSQL + Redis + SMTP + storage (no public port)
```

Rules:

- Only the reverse proxy exposes ports 443/80. PostgreSQL, Redis, the API and the worker stay on a private network or loopback.
- Web and API use different hostnames, so `ALLOWED_WEB_ORIGINS` must list the exact web origin (for example `https://app.example.com`).
- The API and worker run as the same unprivileged service account with write access only to the private-storage path and logs.
- Node 24 is required. The release artifacts are compiled JavaScript; `tsx` is a development tool.
- Static web is deployed atomically: build into a versioned directory, then switch a symlink; keep the previous version for rollback.

## Environment files

Keep separate files for the API and worker, readable only by the service account (`0600`), for example `/etc/ma-safaris/api.env` and `/etc/ma-safaris/worker.env`.

Required keys:

```dotenv
NODE_ENV=production
API_HOST=127.0.0.1
API_PORT=4000
TRUST_PROXY=127.0.0.1,::1

DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/ma_safaris
REDIS_URL=redis://REDIS_HOST:6379

JWT_ACCESS_SECRET=<random 64+ chars>
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30

PUBLIC_API_BASE_URL=https://api.example.com/v1
PUBLIC_WEB_URL=https://app.example.com
ALLOWED_WEB_ORIGINS=https://app.example.com
COMPANY_TIMEZONE=Africa/Dar_es_Salaam

PAYMENT_PROVIDER=snippe
ENABLE_DEV_PAYMENT_SIMULATION=false
SNIPPE_API_KEY=snp_<live key with collection:create + collection:read>
SNIPPE_WEBHOOK_SECRET=whsec_<dashboard webhook signing key>
SNIPPE_BASE_URL=https://api.snippe.sh
SNIPPE_HTTP_TIMEOUT_MS=10000
# Approved TZS per 1 USD, frozen on each payment intent. Required for USD bookings.
SNIPPE_TZS_PER_USD=2600

STORAGE_DRIVER=local
LOCAL_PRIVATE_STORAGE_PATH=/var/lib/ma-safaris/private-storage

SMTP_HOST=smtp.provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM=M&A Safaris <no-reply@your-domain.example>
PUSH_PROVIDER=disabled
```

`PUBLIC_WEB_URL` and every `ALLOWED_WEB_ORIGINS` entry must be a bare origin: no path, query, wildcard or trailing slash. The `example.com`/`.example` hosts in this template are deliberately rejected by the production guards; replace every one with the real domain. `SMTP_HOST` must be remote (not `localhost`/`127.0.0.1`), port `1025` is refused, port `465` requires `SMTP_SECURE=true`, and the sender must not use a development or reserved example domain. Production email requires TLS (implicit on 465, STARTTLS on 587) and a TLS 1.2 minimum. The API also refuses to boot when these production guards fail.

`TRUST_PROXY` defaults to loopback (`127.0.0.1,::1`), which is correct when Caddy runs on the same host. It controls the client IP used by rate limits and public-inquiry deduplication; keep it aligned with the real proxy address (or proxy CIDR) and never use `*`/`true`. If the API is accidentally exposed directly, a wildcard would let clients spoof `X-Forwarded-For`.

`STORAGE_DRIVER=local` is a placeholder until object storage exists; the preflight keeps it `BLOCKED`. Do not set `PAYMENT_PROVIDER=mock` in production — the process refuses to boot.

### Snippe mobile money (TZS)

Set `PAYMENT_PROVIDER=snippe` and create a Snippe API key with the `collection:create` **and** `collection:read` scopes. The read scope is required for status reconciliation (`GET /v1/payments/{reference}`), including recovery after a network timeout. The API key and webhook secret are validated at boot: the key must start with `snp_`, the signing key must be at least 32 characters, and `SNIPPE_BASE_URL` must be HTTPS. Missing or placeholder credentials stop the process before it binds a port.

- `POST /v1/bookings/:id/payment-intents` calls `POST https://api.snippe.sh/v1/payments` with `payment_type=mobile`, the booking amount and the customer's Tanzanian number. The merchant reference is sent as the `Idempotency-Key`, so retries cannot create a second charge.
- The traveller receives a USSD prompt and authorises with a PIN. The API never marks a payment paid from the browser: settlement is accepted only from `POST /v1/webhooks/payments/snippe` after HMAC-SHA256 verification (timestamped `{timestamp}.{raw_body}`, five-minute replay window) or from an authenticated status query.
- Snippe collects TZS only, with a 500 TZS minimum. The customer profile must have a valid `+255` mobile number and an email before a payment intent can be created.
- The catalogue is priced in USD, while Snippe charges TZS. Set an approved `SNIPPE_TZS_PER_USD` rate; it is frozen into the payment attempt, disclosed in `nextAction` (provider amount, ledger amount and rate), and used for both the charge and reconciliation. The booking ledger still posts the USD amount. Changing the rate affects new intents only.
- Snippe denominates TZS in whole shillings while the ledger stores TZS minor units. The adapter converts native TZS amounts (which must be whole shillings) and refuses fractional-shilling charges instead of silently rounding.
- Provider amounts are reconciled against the frozen `providerAmountMinor`/`providerCurrency` on the attempt, not against the booking currency. A mismatched event is quarantined with `PAYMENT_MISMATCH`; it is never posted as paid.
- A network error can leave an attempt `UNKNOWN` without a verified outcome. Operations review the Snippe dashboard, then use `GET /v1/admin/payment-intents?open=true` and `POST /v1/admin/payment-intents/:id/void` (re-authenticated, version-checked, reason recorded) to unblock a new attempt. A late verified capture is still reconciled and posted.
- Snippe does not expose an API refund. Approving a refund moves it to `PENDING`; Operations pays it out, then records the settlement with `POST /v1/admin/refunds/:id/settle` (re-authenticated `refund.approve`, version-checked, audited).

Register the webhook URL in the Snippe dashboard (or rely on the per-payment `webhook_url` sent by the API): `https://<api-host>/v1/webhooks/payments/snippe`. Keep the signing key out of logs and rotate it through the dashboard if it is ever exposed.

### Verifying live Snippe access

Run the read-only checks after setting the credentials:

```bash
npm run verify:snippe
```

This confirms `collection:read`, prints the configured webhook URL and FX rate, and verifies the HMAC implementation against the configured signing key. It sends no USSD prompt and moves no money.

To exercise the full collection flow, a phone owner must approve a real prompt:

```bash
npm run verify:snippe -- --phone 255712345678 --email ops@your-domain.example --amount 500 --yes
```

The script creates the minimum 500 TZS payment, masks the phone number, polls the status endpoint and reports whether the provider reached a terminal state. Approval moves real money, and Snippe has no refund API; reverse it manually if the test is not intended. Confirm the signed webhook reached `POST /v1/webhooks/payments/snippe` before enabling customer payments.

Generate secrets without printing them to shell history:

```bash
openssl rand -hex 48
```

The backend deliberately does not load a repository `.env` when `NODE_ENV=production`. The systemd templates set `Environment=NODE_ENV=production` after `EnvironmentFile`, so a stale `NODE_ENV=development` in an env file cannot disable the production guards. Use `node --env-file=...` or the service environment for every production command.

Rotate `JWT_ACCESS_SECRET` only with a planned session invalidation, because every existing access token stops verifying. The same secret derives the AES key for sealed outbox email payloads: drain pending outbox events first, or those queued emails become undecryptable. Keep a protected copy of the pre-rotation secret for pending-event recovery, then retire it.

## Release sequence

1. **Build on CI or the host**
   ```bash
   pnpm install --frozen-lockfile
   pnpm build:api
   pnpm build:worker
   NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1 pnpm build:web
   ```
   `NEXT_PUBLIC_*` values are inlined at build time. A web build made without the production API URL embeds the localhost fallback and the preflight rejects it.
2. **Migrate the database** with the migration/owner credential, not the runtime credential:
   ```bash
   DATABASE_URL=<migration-url> pnpm --filter @ma/database migrate
   ```
   Review the migration plan and take a backup before destructive or data-rewriting changes.
3. **Run the preflight** with the real environment file:
   ```bash
   NODE_ENV=production node --env-file=/etc/ma-safaris/api.env --import tsx scripts/production-preflight.ts
   ```
4. **Publish the web build atomically**
   ```bash
   RELEASE=/srv/ma-safaris/releases/$(date +%Y%m%d%H%M%S)
   mkdir -p "$RELEASE"
   cp -a apps/web/out/. "$RELEASE/"
   ln -sfn "$RELEASE" /srv/ma-safaris/web.next
   mv -Tf /srv/ma-safaris/web.next /srv/ma-safaris/web
   ```
   `mv -Tf` replaces the symlink atomically; keep the previous target for rollback.
5. **Restart the API, then the worker**
   ```bash
   sudo systemctl restart ma-api
   sudo systemctl restart ma-worker
   ```
6. **Verify**
   ```bash
   curl -fsS https://api.example.com/v1/health/live
   curl -fsS https://api.example.com/v1/health/ready
   curl -fsS https://app.example.com/portal/login/ >/dev/null
   ```
   Then sign in with a real staff account, open an inquiry, send a test quote to a controlled mailbox, accept it and complete a simulated payment only on a non-production environment. Real payments stay blocked until the adapter is certified.

## Reverse proxy and services

Example templates are in `deploy/`:

- `deploy/Caddyfile.example` — automatic TLS, static web, API proxy, HSTS, cache policy and dotfile protection.
- `deploy/ma-api.service.example` — hardened systemd unit for the API.
- `deploy/ma-worker.service.example` — hardened systemd unit for the outbox worker.

Both units force `NODE_ENV=production`, create `/var/lib/ma-safaris` via `StateDirectory`, and allow writes only there. Keep `LOCAL_PRIVATE_STORAGE_PATH` under that directory (for example `/var/lib/ma-safaris/private-storage`) or adjust `ReadWritePaths` deliberately; the default repository path is read-only under `ProtectSystem=strict`.

Copy them, replace domain/path/user values and validate before reload:

```bash
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
systemd-analyze verify /etc/systemd/system/ma-api.service
```

Do not add `X-Frame-Options: DENY` globally: the landing page intentionally embeds its isolated product tour in a same-origin iframe. Set a tested CSP rather than a copy-pasted one.

## Monitoring and alerts

Minimum checks:

| Signal | Query / endpoint | Alert |
|---|---|---|
| API liveness | `GET /v1/health/live` | 2 consecutive failures |
| API readiness | `GET /v1/health/ready` | 2 consecutive failures |
| Worker process | systemd `ma-worker` active | inactive > 1 minute |
| Outbox backlog | `SELECT count(*) FROM "OutboxEvent" WHERE "processedAt" IS NULL;` | grows for 5 minutes |
| Failed events | `SELECT count(*) FROM "OutboxEvent" WHERE "state"='FAILED' AND "processedAt" IS NULL;` | any new failure |
| Queue wait/fail | `LLEN bull:ma-outbox:wait`, `ZCARD bull:ma-outbox:failed` | sustained wait or failures |
| Disk | host filesystem | < 20% free |
| TLS | certificate expiry | < 21 days |
| Email | SMTP provider bounce/complaint metrics | provider threshold |

Worker logs are JSON lines; alert on `"level":"error"`. API access logs are JSON lines with `requestId`, method, route template, status and duration; every API response carries `X-Request-Id` (also present in error bodies) for support correlation. Never log tokens, passwords, full payment payloads or document contents.

## Backup and restore

The development helper refuses production on purpose. The production procedure is:

1. Quiesce writes (stop the worker; put the API in maintenance or block mutations) or use a coordinated database/storage snapshot.
2. Run the production backup with PostgreSQL 17 client tools:
   ```bash
   NODE_ENV=production BACKUP_CONFIRM=YES BACKUP_DIR=/var/backups/ma-safaris \
     node --env-file=/etc/ma-safaris/api.env scripts/backup-production.mjs
   ```
   The script reads connection fields from `DATABASE_URL` without putting the password on the command line, writes `database.dump` (custom format), archives private storage when present, and records SHA-256 checksums, byte counts and the `pg_dump` version in `manifest.json`. The checksums detect corruption; they are not a signature, so encrypt and access-control the directory before moving it offsite. It refuses to run with a `pg_dump` older than 17; set `PG_DUMP_BIN` when the PostgreSQL 17 client lives outside `PATH`. It does not read a repository `.env`, so always pass `--env-file` or export the operator environment. `DATABASE_URL` must include an explicit database name and user.
3. Encrypt the directory with an operator-managed key, store it offsite with restricted access, and record the restore point. Separately protect the server secrets needed to operate the restored system, including `JWT_ACCESS_SECRET` (which also decrypts pending sealed email events).
4. Verify the archive before relying on it:
   ```bash
   node scripts/verify-backup.mjs /var/backups/ma-safaris/ma-safaris-<timestamp>
   ```
   The verifier checks the manifest, SHA-256 checksums, byte counts, file/directory permissions, rejects unexpected files, and runs `pg_restore --list` plus `tar -tzf` to prove both archives are readable. Set `PG_RESTORE_BIN` when the PostgreSQL 17 client is outside `PATH`.
5. Test restoration into an isolated environment at least once per release cycle. Production restore requires owner approval and a documented reason:
   ```bash
   pg_restore --no-owner --no-acl --dbname=<isolated-db> database.dump
   mkdir -p <isolated-storage> && tar -xzf private-files.tar.gz -C <isolated-storage>
   ```
   Point a staging API/worker at the restored database and storage, then verify a booking, a payment posting, a generated document and its audit trail.

A backup is not verified until a restore has produced a working booking, payment posting, generated document and audit trail.

## Rollback

- Web: point the `web` symlink back to the previous release directory.
- API/worker: deploy the previous artifact directory and restart both services.
- Database: migrations are forward-only. Do not improvise a down-migration; restore from the pre-release backup only with owner approval, and reconcile payments created after the backup.
- After rollback, re-run health checks and the outbox backlog query.

## Incident checklist

1. Confirm scope: public web, API, worker, payments, email or documents.
2. Capture request IDs from structured logs; never copy bearer tokens or customer documents into chat.
3. If payments are affected, stop new payment intents and reconcile pending intents before restoring service.
4. If the worker is down, commands remain committed in PostgreSQL and the outbox; do not re-run customer mutations manually.
5. If credentials may be exposed, rotate the affected secret, invalidate sessions and audit access.
6. Record the timeline, affected records, customer communication and follow-up owner.

## Launch checklist

- [ ] Domain, TLS and DNS verified; HTTP redirects to HTTPS.
- [ ] `PUBLIC_API_BASE_URL`, `PUBLIC_WEB_URL` and `ALLOWED_WEB_ORIGINS` use the final HTTPS domains; web and CORS values are bare origins.
- [ ] The web export was built with the production `NEXT_PUBLIC_API_BASE_URL`; preflight reports no loopback URL in the bundle.
- [ ] Secrets generated randomly; `.env` files are `0600`, not in the repository, and production commands use `--env-file` instead of a repository `.env`.
- [ ] Database and Redis are private; runtime DB user is not a superuser and does not own the schema.
- [ ] Migrations applied with the owner credential; backup taken.
- [ ] `pnpm preflight:production` has no `FAIL` items.
- [ ] The two `BLOCKED` items are either resolved with verified adapters or the release is explicitly limited to non-payment workflows.
- [ ] API and worker start with `node --conditions=production`; health checks pass.
- [ ] Web release is served from a versioned directory with rollback available.
- [ ] Real staff/customer accounts exist; demo accounts and `SEED_DEMO_PASSWORD` are removed.
- [ ] Email sender domain is authenticated (SPF/DKIM/DMARC) and a test invitation/receipt arrives.
- [ ] Backups are encrypted, offsite, pass `scripts/verify-backup.mjs`, and are restore-tested.
- [ ] Monitoring alerts reach a named on-call owner.
- [ ] Payment and storage limitations are written in the customer-facing copy where relevant.
