# Public landing frontend

`apps/web` is a Next.js App Router static export. `pnpm dev:web` runs the public frontend at `http://localhost:3000`. `pnpm build:web` emits the complete static site into `apps/web/out/`; `pnpm --filter @ma/web preview` serves that output with no Next server. The API and worker remain separate processes. Configure `apps/web/.env.local` from `.env.example` with a browser-reachable `NEXT_PUBLIC_API_BASE_URL` ending in `/v1`, then rebuild after changing that public value.

## Visitor experience

The supplied orange/black identity, local DM Sans/Manrope/Playfair fonts, giraffe hero, elephant story photo and asymmetric destination imagery are retained. Navigation, mobile menu, category/search filters, public details, itinerary accordions, contact actions, photo/font credit dialog and download states are functional. Responsive WebP derivatives reduce photo transfer sizes; originals and their provenance remain preserved.

Browser reads use only `/v1/public/packages`, package detail, `/company`, `/services`, `/destinations`, `/app-release` and `/landing`. These reads never send auth credentials. An unavailable catalog shows the supplied sample journeys with a retry and explicit demonstration-rate labels. An empty successful published catalog stays empty and offers contact; it is not replaced by invented live inventory. Current “from” prices include currency and adult basis; final pricing remains in the mobile/backend booking process. Draft catalog records are the API's responsibility and never requested by this web app.

Store links open only configured HTTPS `apps.apple.com` or `play.google.com` URLs. Missing, malformed or unapproved targets display “Coming soon” and an explanatory product-preview dialog. No QR code points to a placeholder. Approved HTTPS policy links appear only when configured. Missing owner policy copy is a release input, not invented website legal text.

## Customer travel file (portal)

Static routes `/portal/`, `/portal/quotes/`, `/portal/bookings/`, `/portal/login/` and `/portal/verify/` form the traveller-facing travel file. They authenticate directly against the API with short-lived bearer tokens stored under `ma.safaris.portal.*` (separate from the staff console), and send `X-Role-Context: CUSTOMER`. A guarded page redirects guests to sign-in and returns them to the requested route. Tokens refresh lazily on a `401`; signing out clears both local tokens and the server session.

The proposal page shows the frozen quote version, line items, day-by-day itinerary and policy snapshot. Acceptance calls `POST /v1/quotes/:id/accept` with `expectedVersion` and `acceptedPolicyVersionId`, then links straight to the trip. The trip page shows the payment summary, travellers, pickup, itinerary, payment history and generated documents. Deposit/balance checkout creates `POST /v1/bookings/:id/payment-intents` with a validated `/portal/bookings` return path. The client omits `method` so the server selects the configured provider. Development builds exercise `MOCK_CHECKOUT` through the dev simulation endpoint; production uses Snippe mobile money (`MOBILE_MONEY`) and shows the USSD prompt instructions. In both cases the API verifies the provider webhook (or status query) and posts the capture before a receipt appears. Production rejects the mock adapter at boot.

Notification and email bodies for proposals and bookings include an absolute link built from `PUBLIC_WEB_URL` (default `http://localhost:3000`, HTTPS required in production). Quotes, bookings and documents remain authorization-checked by the API; a URL alone grants no access.

## Isolated illustrative app tour

`public/demo/index.html`, `preview.js` and `preview.css` retain all 24 screens and their illustrative interactions from the owner's standalone HTML. All four role tabs, six journey steps per role, previous/next, Focus/All 6 modes, sample downloads, demo reset and inner phone scrolling are available.

The tour is in a sandboxed iframe with `allow-scripts allow-downloads`, without same-origin access. Its Content Security Policy sets `connect-src 'none'`, and it has no API client. All records, totals, messages and actions there are fictional. It cannot authenticate, reach private APIs, write business data or collect money. Its visible explanatory banner states that no real booking, payment or message is sent. The parent accepts only bounded height messages from that exact frame window. Self-contained licensed font bytes inside demo CSS preserve font loading with the iframe's opaque origin.

The actual native application has API-authorized authentication and mutations. The role chooser here selects fictional presentation views and grants no real access.

## Verification

Run `pnpm --filter @ma/web typecheck`, `pnpm build:web`, then keep `pnpm --filter @ma/web preview` running and execute `pnpm --filter @ma/web test`. Playwright serves the build on `http://127.0.0.1:3210` by default; override with `WEB_TEST_BASE_URL`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only when selecting an existing compatible local Chromium build.

Playwright scenarios cover 320, 360, 390, 768, 1024 and 1440 pixels, every role/step, all-screen grids, inner scrolling, page overflow, JavaScript errors, keyboard role selection, accessible modal dismissal, catalog fallback/filtering, empty published catalog, public API content replacement and valid/invalid store links. Portal scenarios intercept the customer API to verify sign-in hand-off, proposal acceptance and the development deposit checkout end to end in the browser. Public-data tests stub only the published read endpoints; they establish frontend behavior, not backend booking correctness. Separate integration tests cover actual business authorization and persistence.

Actual verification results and browser/version/build evidence are recorded in `docs/web-verification.md`. Android/iOS native validation is outside this frontend report.

## Version decision

Pinned Next.js 16.4.0 and React/React DOM 19.3.0 satisfy the registry-declared Next React `^19.0.0` peer range and Node `>=20.9.0`; the repository uses Node 24. TypeScript 5.9.3 is a compatible stable line shared with backend tooling. Next is configured with `output: 'export'` and `images.unoptimized`. There are no API routes, server actions, database imports, private secrets or SSR-dependent auth.

Primary sources reviewed on 11 October 2026: [Next static exports](https://nextjs.org/docs/app/guides/static-exports), [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Next package metadata](https://registry.npmjs.org/next/latest), [React package metadata](https://registry.npmjs.org/react/latest), [Playwright package metadata](https://registry.npmjs.org/@playwright/test/latest). Exact pins are in the app manifest and workspace lockfile. See `docs/references.md` for owner source review, credits and missing preparation-workspace references.
