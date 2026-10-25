# Production deployment — meandadventuresafaris.com

Live stack on `144.202.25.220` (Ubuntu 26.10, Caddy, PostgreSQL 18, Redis 8, Node 24).

```text
Internet
  ├─ meandadventuresafaris.com      ── Caddy/HTTPS ── /srv/ma-safaris/web (Next static export)
  │                                                  └─ /android/ma-safaris-*.apk
  └─ api.meandadventuresafaris.com  ── Caddy/HTTPS ── 127.0.0.1:4000 (Fastify API)
                                                      ├─ PostgreSQL 18 (loopback only)
                                                      ├─ Redis 8 (loopback only, requirepass)
                                                      └─ ma-worker (outbox, no public port)
```

## Paths

| What | Where |
|---|---|
| Application checkout | `/opt/ma-safaris` (git, branch `main`) |
| Web releases | `/srv/ma-safaris/releases/<timestamp>`, `web` is an atomic symlink |
| Service environment | `/etc/ma-safaris/api.env`, `/etc/ma-safaris/worker.env` (0640 root:masafari) |
| Private storage | `/var/lib/ma-safaris/private-storage` |
| systemd units | `/usr/local/lib/systemd/system/ma-api.service`, `ma-worker.service` |
| Caddy config | `/etc/caddy/Caddyfile` (reference copy: `deploy/Caddyfile.meandadventuresafaris`) |
| Service account | `masafari` (system user, no shell) |

`/etc/systemd` writes are blocked for this MCP profile, which is why the units live in
`/usr/local/lib/systemd/system` (a standard admin unit path).

## Release sequence

```bash
# 1. Code
cd /opt/ma-safaris && git pull --ff-only

# 2. Dependencies (skip the Expo workspace on the server)
pnpm install --frozen-lockfile --filter ma-safaris \
  --filter "@ma/api..." --filter "@ma/worker..." --filter "@ma/web..."

# 3. Migrations (owner credential)
DATABASE_URL='postgresql://ma_owner:<owner-pw>@127.0.0.1:5432/ma_safaris' \
  pnpm --filter @ma/database generate
DATABASE_URL='postgresql://ma_owner:<owner-pw>@127.0.0.1:5432/ma_safaris' \
  pnpm --filter @ma/database migrate

# 4. Builds (NEXT_PUBLIC_* values are inlined at build time)
pnpm build:api
pnpm build:worker
NEXT_PUBLIC_API_BASE_URL=https://api.meandadventuresafaris.com/v1 \
NEXT_PUBLIC_SITE_URL=https://meandadventuresafaris.com \
NODE_OPTIONS=--max-old-space-size=1280 pnpm build:web

# 5. Publish the static export atomically
RELEASE=/srv/ma-safaris/releases/$(date +%Y%m%d%H%M%S)
mkdir -p "$RELEASE" && cp -a apps/web/out/. "$RELEASE/"
ln -sfn "$RELEASE" /srv/ma-safaris/web.next && mv -Tf /srv/ma-safaris/web.next /srv/ma-safaris/web

# 6. Restart services
systemctl restart ma-api ma-worker

# 7. Verify
curl -fsS https://api.meandadventuresafaris.com/v1/health/ready
curl -fsS https://meandadventuresafaris.com/ >/dev/null
curl -fsS https://meandadventuresafaris.com/android/ >/dev/null
```

Rollback: point the `web` symlink at the previous release and restart the services with the
previous build (the checkout is git-tracked, so `git checkout <sha>` + rebuild also works).

## Android APK

Built from `apps/mobile` with `EXPO_PUBLIC_API_BASE_URL=https://api.meandadventuresafaris.com/v1`.
`apps/mobile/.env` must hold that value before `assembleRelease`; the URL is inlined into the
Hermes bundle.

- ABI splits keep the download near 40 MB: `ma-safaris-arm64.apk` (modern phones) and
  `ma-safaris-arm32.apk` (older 32-bit devices).
- Signing key: `apps/mobile/android/app/ma-safaris-release.keystore` (alias `ma-safaris`,
  password in `android/gradle.properties`, both git-ignored). **Back this file up** — Play Store
  updates and in-place APK upgrades require the same key.
- Publish: copy both APKs to `<release>/android/` and keep the stable names used by
  `apps/web/lib/app-release.ts`.

```bash
cd apps/mobile/android
ANDROID_HOME=~/Library/Android/sdk JAVA_HOME=$(/usr/libexec/java_home -v 17) \
  EXPO_PUBLIC_API_BASE_URL=https://api.meandadventuresafaris.com/v1 \
  ./gradlew assembleRelease
```

## Accounts

`packages/database/scripts/create-admin.ts` creates or repairs a staff account without ever
committing a password:

```bash
cd /opt/ma-safaris
ADMIN_EMAIL=admin@meandadventuresafaris.com \
ADMIN_PASSWORD='<strong password>' \
ADMIN_NAME='M&A Safaris Admin' \
DATABASE_URL='postgresql://ma_owner:<owner-pw>@127.0.0.1:5432/ma_safaris' \
  node --import tsx packages/database/scripts/create-admin.ts
```

## Known limitations scheduled for the next release

| Area | State | Action needed |
|---|---|---|
| Payments | `PAYMENT_PROVIDER=disabled` | Add Snippe live keys (`SNIPPE_API_KEY`, `SNIPPE_WEBHOOK_SECRET`, `SNIPPE_TZS_PER_USD`) and register the webhook `https://api.meandadventuresafaris.com/v1/webhooks/payments/snippe`. |
| Email | Loopback Postfix (`mail.meandadventuresafaris.com` in `/etc/hosts`) with direct-to-MX delivery and no SPF/DKIM | Move to a real SMTP provider (host, port 587, user, password), then remove the hosts entry. Deliverability is not guaranteed before that. |
| Private storage | `STORAGE_DRIVER=local` under `/var/lib/ma-safaris/private-storage` | Object storage with encryption at rest before customer document uploads are promoted. |
| `www` host | No DNS record | Add a `www` CNAME/A record, then extend the Caddyfile with a redirect site block. |
| Backups | Manual (`scripts/backup-production.mjs`) | Install a timer + offsite encrypted copy and restore-test once. |

## Service operations

```bash
systemctl status ma-api ma-worker
journalctl -u ma-api -f          # JSON access/error logs
journalctl -u ma-worker -f
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```
