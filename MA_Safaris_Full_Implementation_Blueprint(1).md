# M&A Safaris — Full Backend, Mobile App & Landing Page Implementation Blueprint

**Prepared:** 8 October 2026  
**Product:** Me and Adventure Safaris (M&A Safaris)  
**Purpose:** A complete implementation brief for a coding agent working locally.  
**Delivery order:** Backend and integration contracts first → mobile application for all four roles → public frontend landing page → integrated verification.  
**Specification language:** English for precise implementation; customer interfaces support English and Kiswahili.  
**Status:** Implementation specification, not a claim that the backend or native app already exists.

> **Maelekezo kwa mmiliki:** Mpe coding agent faili hii pamoja na HTML ya presentation, PDF ya project na logo. Agent aanze kujenga backend halisi local, aunganishe app kupitia APIs, kisha akamilishe UI/UX na landing page. Screens za presentation ni mwongozo wa design; authentication, malipo, bookings na permissions lazima zifanye kazi kupitia backend.

## Contents

1. [Read-first instructions and source priority](#1-read-first-instructions-and-source-priority)
2. [Product scope and business decisions](#2-product-scope-and-business-decisions)
3. [Technology, languages and architecture](#3-technology-languages-and-architecture)
4. [Repository and backend organization](#4-repository-and-backend-organization)
5. [Roles, permissions and data access](#5-roles-permissions-and-data-access)
6. [Data model and database invariants](#6-data-model-and-database-invariants)
7. [Business workflows and state machines](#7-business-workflows-and-state-machines)
8. [API conventions and endpoint inventory](#8-api-conventions-and-endpoint-inventory)
9. [Representative API contracts](#9-representative-api-contracts)
10. [Payments, documents and background processing](#10-payments-documents-and-background-processing)
11. [Mobile navigation and shared UX](#11-mobile-navigation-and-shared-ux)
12. [Customer: six core screens](#12-customer-six-core-screens)
13. [Operations: six core screens](#13-operations-six-core-screens)
14. [Driver / Guide: six core screens](#14-driver--guide-six-core-screens)
15. [Admin: six core screens](#15-admin-six-core-screens)
16. [Complete supporting screen inventory](#16-complete-supporting-screen-inventory)
17. [Brand system, interaction and accessibility](#17-brand-system-interaction-and-accessibility)
18. [Public web landing page](#18-public-web-landing-page)
19. [Local environment and startup contract](#19-local-environment-and-startup-contract)
20. [Backend-first implementation phases](#20-backend-first-implementation-phases)
21. [Verification and acceptance scenarios](#21-verification-and-acceptance-scenarios)
22. [Security, reliability and release requirements](#22-security-reliability-and-release-requirements)
23. [Deliverables, completion checklist and agent handoff](#23-deliverables-completion-checklist-and-agent-handoff)
24. [Official technical references](#24-official-technical-references)

## 1. Read-first instructions and source priority

### 1.1 Your task as the implementation agent

Build the actual M&A Safaris system in a local repository. Implement the backend before connecting the mobile screens. Continue through the mobile app and public landing page; delivering only a database, API scaffold, static screen collection or proposal does not complete this brief.

The final local demonstration must show a customer creating a booking, paying through the development payment adapter, Operations confirming and assigning it, the assigned guide running the trip, and Admin inspecting the same records and audit history. A separate custom-request journey must create a quotation, accept it and produce a payable booking. Data must survive process restarts.

Use the existing HTML presentation for layout, photography, colors, tone and interaction intent. Translate its actions into server-authorized business operations. Do not copy its global JavaScript demo state into the real app, implement authentication with a role dropdown, or make a payment button directly change a booking to paid.

### 1.2 Source priority

| Priority | Source | What it determines |
| --- | --- | --- |
| 1 | Current owner instructions | Web is frontend landing page only; mobile app covers Customer, Operations, Driver/Guide and Admin; backend is separate and API driven. |
| 2 | This blueprint | Implementation contracts, scope, safeguards, local defaults and acceptance conditions. |
| 3 | `MA_Safaris_Web_Mobile_Project_Overview(2).pdf` | Business responsibilities, modules and overall safari process. |
| 4 | `M_A_Safaris_Interactive_Presentation.html` and its source | Visual direction and the six core journey areas per role. |
| 5 | Prototype fixture values | Development examples only; no authority for real prices, availability, policy or accounting. |

The PDF originally placed Admin and Operations in web dashboards. The owner's latest direction places these roles in the mobile application. Implement their full responsibilities in mobile layouts. A management web portal may be a later project; it is not needed to finish this version.

### 1.3 Reference files and portability

Existing reference locations in the preparation workspace:

| Reference | Current path |
| --- | --- |
| Offline presentation | `/workspace/scratch/fe0bcc3629f5/output/M_A_Safaris_Interactive_Presentation.html` |
| Editable presentation source | `/workspace/sites/ma-safaris/dist/index.html`, `styles.css`, `app.js` |
| Brand logo and photographs | `/workspace/sites/ma-safaris/dist/assets/` |
| Business PDF | `/workspace/scratch/fe0bcc3629f5/upload/MA_Safaris_Web_Mobile_Project_Overview(2).pdf` |
| Orange/black logo reference | `/workspace/scratch/fe0bcc3629f5/upload/image(20261008-043441).png` |

These are reference locations, not runtime dependencies. In the implementation repository, copy supplied references into `docs/reference/` and approved visual assets into the relevant app asset folders. The system must build on another machine without those absolute paths. If only the offline HTML is supplied, extract its embedded assets while preserving their attribution and font licenses. If a reference is missing, use the exact tokens and screen requirements in this file, document the missing input and continue the authorized local work.

### 1.4 Meaning of complete

- Real PostgreSQL persistence, migrations and repeatable development seeds.
- Real authentication, session rotation and backend role/ownership enforcement.
- Working standard booking, custom quotation, payment reconciliation, preparation, guide progress and completion flows.
- All 24 core screens plus the supporting editors, details, authentication and settings screens necessary to make them useful.
- All four roles use the same backend records and generated API contracts.
- Frontend web landing page follows the supplied presentation and has truthful app-download behavior.
- Meaningful automated API/integration tests and demonstrated mobile workflows.
- Clear local setup, environment examples, seed instructions and honest integration/release limitations.

## 2. Product scope and business decisions

### 2.1 Product identity

M&A Safaris is a Tanzanian safari and travel business: **Me and Adventure Safaris**. Preserve the supplied orange/black brand and company story. Useful existing copy includes “Your Gateway to Authentic Tanzania,” “Discover Tanzania. Experience Africa. Create Memories,” and “We listen. We plan. We experience.” Do not fabricate awards, partner endorsements, customer reviews, conservation outcomes or booking statistics.

The supplied company profile lists `meandadventuretz@gmail.com` and `+255 682 886 259`. Seed these as editable company contact settings and verify them before a live launch. Never use the contact address to send unsolicited setup messages.

### 2.2 Business services

Support catalog and inquiry categories for wildlife safaris, private/group trips, honeymoon trips, family/luxury experiences, cultural/community visits, Kilimanjaro trekking, day trips, airport transfers, beach/Zanzibar travel, corporate/school/group travel, and car rental/chauffeur inquiries under **Safari AI Rentals**.

Seed destinations such as Arusha, Tarangire, Lake Manyara, Ngorongoro, Serengeti, Kilimanjaro, Zanzibar, Mikumi and Udzungwa. Their descriptions, images and publish status are managed by Admin. Do not infer a bookable departure merely because a destination exists.

For version one, transfers and rental/chauffeur services enter the custom service-request and quotation workflow. Fleet resources are real managed records. A separate self-service vehicle rental engine, rental contracts, damage deposits and vehicle-return inspection workflow are deferred unless explicitly added. This preserves the service offering without pretending that safari booking rules cover independent rental contracts.

### 2.3 Scope boundaries

| Area | Required in this implementation | Later extension |
| --- | --- | --- |
| Public website | Responsive landing page, public content/catalog, app presentation, contact actions, configured store links | Authenticated booking portal or staff dashboard |
| Customer app | Discovery, standard booking, payment, custom requests, quotes, trips, documents, support, reviews, profile | Loyalty, marketplace, partner packages |
| Operations app | CRM, inquiries, manual bookings, itinerary/quotation, confirmation, changes, assignment, monitoring | Hotel/partner portal |
| Guide app | Assigned trips, pickup/travelers, approved itinerary, progress, issue reporting, handover | Background GPS and mutation synchronization while offline |
| Admin app | Company-wide business management, catalog/CMS, customers, fleet/team, finance/refunds, reports, access/settings/audit | Separate management web application |
| Backend | All business APIs, policy enforcement, PostgreSQL, worker, documents, notifications, reporting | Independent microservices or accounting integration |
| Payments | Real development adapter and provider interface; durable reconciliation | Live provider enabled after provider selection and credentials |

### 2.4 Explicit development defaults

Store these settings in versioned configuration, not scattered UI constants. Mark development fixtures as examples in seed documentation and the local payment UI.

| Decision | Local default | Production condition |
| --- | --- | --- |
| Booking acceptance | Request → required payment → Operations confirmation | Owner can configure instant acceptance later; do not silently introduce it. |
| Currency | USD development catalog; architecture supports currency-specific minor units | Owner approves supported currencies and actual rates; no invented currency conversion. |
| Deposit | 30% of total, integer basis points `3000` | Owner approves policy; snapshot the applicable policy per booking. |
| Child pricing | 70% adult rate in sample seed; configurable eligibility/rate | Owner supplies real age bands and package rules. |
| Taxes and add-ons | Explicit line items; demo tax zero and no hidden fees | Owner approves applicability and amounts. |
| Balance deadline | Seven calendar days before departure; short-notice bookings require full payment | Configurable and displayed before acceptance; not an assertion of company policy. |
| Price-preview validity | 15 minutes | Configurable; catalog/version changes invalidate incompatible previews. |
| Quote validity | Seven days from send | Configurable and displayed in customer's timezone. |
| Cancellation/reschedule | Request for staff review; no automatic refund promise | Owner supplies actual policy; approval records a specific financial disposition. |
| Staff confirmation | Operations `booking.confirm`, Admin authorized override with recorded reason | Never granted to a customer or guide. |
| Authentication | Email/password; verified customer email required to submit/pay | Add phone OTP/social login only as an explicit later integration. |
| Locale | English default; Kiswahili selectable; locale-aware dates/money | Translation content can grow without replacing API keys. |
| Trip timezone | `Africa/Dar_es_Salaam` | Persist timezone per itinerary/trip; UTC for event timestamps. |
| Required documents | Traveler/contact details and itinerary; no passport collection by default | Collect sensitive identification only if an approved service requires it. |
| Notifications | In-app and local SMTP email; push provider interface | Enable actual email/push credentials and verified sender/device setup. |
| GPS | Open approved pickup/destination in installed maps on user action | No background location tracking in baseline. |
| Multi-role account | Allowed only through server grants | Role switching shows only granted roles; never adds a grant. |

### 2.5 Seed examples

Use the presentation's Serengeti 5-day package at USD 1,250 per adult, Zanzibar 4-day package at USD 890, and Kilimanjaro 7-day package at USD 1,950 as clearly named **demo rates**. Seed Alice Morgan and an additional traveler Daniel Morgan; Operations user Neema Kweka; guides Kelvin Mushi and Asha Nyerere; and demonstration vehicles TZ001, TZ002 and TZ003. Do not copy fixed example booking references into unique-ID generation.

Use a dynamically dated current/upcoming trip so local demonstration queues are useful on any date. The HTML's guide example and customer example were separate fixtures. Create a new connected seed in which Customer, Operations, Guide and Admin refer to the same booking/trip/assignment IDs. Include a second customer and unassigned guide for access-denial tests. All seed accounts are development-only and obtain passwords from a local seed environment setting.

## 3. Technology, languages and architecture

### 3.1 Selected stack

Use the following single coherent stack. Do not produce several competing implementations.

| Layer | Language / technology | Responsibility |
| --- | --- | --- |
| Shared application code | Strict TypeScript | Backend services, SDK, mobile, web and shared design/config types |
| Backend runtime | Node.js 24 LTS, compatible patch pinned | API and worker execution |
| API framework | NestJS with Fastify adapter | Modules, validation, auth guards, REST controllers, OpenAPI |
| Database | PostgreSQL 17, current supported minor pinned | Authoritative relational business data and constraints |
| Database client | Prisma ORM 7, `@prisma/adapter-pg`, `pg` | Typed queries, migrations, transactions; raw migration SQL for advanced constraints |
| Background work | BullMQ + supported compatible Redis version | Outbox dispatch, document generation, email/push, exports, reconciliation |
| API definition | OpenAPI 3 document generated from Nest DTOs | Validated contract and generated frontend TypeScript client |
| Mobile application | React Native with a stable Expo SDK, Expo Router | One native application with protected role navigation |
| Mobile server state | TanStack Query | Fetch, cache, pagination, invalidation, retries, app/network refetch |
| Mobile local UI state | Zustand | UI preferences and drafts; never the authoritative ledger/booking store |
| Forms | React Hook Form + Zod | Input handling and frontend validation; backend validates again |
| Mobile styling | React Native `StyleSheet`, typed tokens and reusable components | Faithful native brand/UI implementation; no HTML WebView port |
| Web frontend | Next.js App Router, static export, TypeScript, CSS | Public frontend-only landing page; no API routes, server actions or database credentials |
| Files/documents | Storage adapter: local private files in development, S3-compatible in production | Images, attachments, itinerary PDFs and receipts |
| Backend PDFs | PDFKit, compatible stable version pinned | Structured private PDFs generated from authorized snapshots |
| Email development | Mailpit SMTP | Inspect actual local emails without contacting external recipients |
| Local infrastructure | Docker Compose | PostgreSQL, Redis and Mailpit with health checks/persistent volumes |
| API tests | Nest test utilities, Jest, real PostgreSQL integration fixtures | Policy, transaction, authorization and workflow verification |
| Mobile verification | React Native Testing Library + Maestro flows where available | Critical native screen actions and connected role journeys |
| Web verification | Playwright | Responsive landing page, keyboard flows and honest download states |

HTML and CSS are used for the landing page. SQL is used for migrations and database constraints. JSON is used for API payloads and structured configuration. YAML is used for Compose and CI. Do not add PHP, Python, Java, Dart or a second backend language without a concrete requirement.

### 3.2 Version discipline

The stack above is a design decision, not permission to install mutually incompatible `latest` packages. At implementation start, consult the official references in section 24, choose compatible stable versions, record them in `docs/versions.md`, pin the package manager and dependencies, and commit the lockfile.

Node 24 is the LTS baseline selected for this brief. PostgreSQL 17 is a supported baseline. Prisma 7 needs its ESM/configuration and PostgreSQL driver-adapter setup; do not paste a Prisma 5/6 initialization recipe. Use an explicit generated-client output, explicit environment loading and configured driver connection/pool timeouts. Keep all Nest packages on a compatible major. Verify Fastify-specific plugins and file-upload handling rather than assuming Express middleware works.

Choose the current compatible stable Expo SDK at implementation time, then install React, React Native and Expo native packages through its compatibility workflow (`expo install`). Do not guess an Expo SDK number or independently upgrade its React Native version. Use development builds for native integration validation; Expo Go alone is not proof that production native modules work.

Use separate TypeScript compiler configurations: backend/database packages emit compatible ESM (for example `NodeNext` with explicit module configuration and decorator metadata where Nest requires it); Expo/Next packages use their bundler-compatible configurations. Do not apply one Node module-resolution config blindly to every frontend. Verify test transforms and generated-client imports against the actual pinned versions.

### 3.3 Architecture

```mermaid
flowchart TD
    Web[Public landing frontend] -->|Public reads only| API[REST API and authorization]
    App[Four-role mobile app] -->|Authenticated APIs| API
    API --> DB[PostgreSQL]
    DB --> Outbox[Durable outbox]
    Outbox --> Worker[Worker and Redis queue]
    API --> Storage[Private file storage]
    Worker --> Storage
    Worker --> Providers[Payment email push adapters]
    Providers -->|Verified payment callbacks| API
```

Implement a modular monolith with separate API and worker processes. PostgreSQL is the source of truth. Redis is a queue/cache dependency, not the only record of payment, booking, job or notification state. Frontends never connect directly to PostgreSQL, Redis, storage administration or payment secrets.

Payment success enters through the provider adapter's verified event path and transactional ledger service. The mobile app requests payment and reads the result. Background messages/documents start from an outbox row committed with the business transaction.

### 3.4 Communication model

- HTTPS REST `/v1` in production; HTTP on the development LAN only.
- Bearer access token for mobile APIs; no access token in URL query strings.
- Public web reads only the public catalog/company/download settings projection.
- Poll active trip and pending payment queries with sensible intervals, plus pull-to-refresh and push-triggered invalidation. WebSockets are not required for version one.
- Separate public and private response DTOs; shared generated types do not bypass backend authorization.
- All list endpoints paginate. Complex reports run asynchronously when necessary.

## 4. Repository and backend organization

### 4.1 Monorepo contract

Create a pnpm workspace with the following paths. A task runner such as Turborepo is optional; do not make it necessary for understanding the system.

```text
ma-safaris/
  apps/
    api/                  NestJS/Fastify HTTP process
    worker/               Background process using backend application modules
    mobile/               Expo native app
    web/                  Next.js static landing frontend
  packages/
    backend-core/         Business modules shared by API and worker
    database/             Prisma schema, client factory, migrations, seed
    api-client/           Generated OpenAPI TypeScript client
    contracts/            Shared non-secret enums and contract helpers
    design-tokens/        Brand tokens; platform-specific adapters
    config/               Lint, TypeScript and test configuration
  docs/
    reference/            Supplied PDF/HTML and attribution manifest
    architecture.md
    api.openapi.json
    permissions.md
    versions.md
    local-runbook.md
    verification.md
  infra/
    compose.yaml
  scripts/
    setup-local.*
    verify-local.*
    seed-local.*
  .env.example
  pnpm-workspace.yaml
  package.json
  pnpm-lock.yaml
  README.md
```

The `.env` files, generated receipts/uploads, database dumps, private keys and seed passwords must be ignored by git. Reference documents may contain business contacts; don't expose them automatically as public web assets.

### 4.2 Backend modules

| Module | Main responsibilities |
| --- | --- |
| Auth / Identity | Registration, email verification, login, refresh rotation, sessions, password reset, staff invitations |
| Authorization | Permission registry, role grants, active-context checks, row scopes, field projection |
| Company / Settings | Public company details, download links, policy versions, integration readiness |
| Catalog / CMS | Packages, destinations, services, pricing versions, galleries, landing content, publish/archive |
| Customers / CRM | Customer records, profiles, inquiries, internal notes, staff-created customer invitations |
| Pricing | Validated preview, booking/quote snapshots, adjustments, deposit and balance calculations |
| Bookings | Standard/manual booking, traveler details, confirmation, change requests, cancellation decisions |
| Custom Requests / Quotes | Tailor-made requirements, quote versions, draft editor, send/revise/accept |
| Itineraries | Versioned day/activity plans, published customer itinerary, guide-approved operational view |
| Trips / Assignments | One primary trip per booking initially, allocation conflicts, checklist, progress, handover |
| Fleet / Staff | Vehicle status, maintenance intervals, staff availability and trip suitability |
| Payments / Refunds | Intents, adapters, verified events, immutable financial postings, reconciliation, refunds |
| Documents / Media | Upload initiation/finalization, storage policies, secure download, PDFs |
| Support / Issues | Customer conversations, guide exceptions, assignment to staff, response visibility |
| Notifications | In-app events, preferences, device tokens, email/push delivery tracking |
| Reports | Authorized overview aggregation, financial/operations reports and export jobs |
| Audit | Append-only sensitive-action history with safe redaction |
| Outbox / Jobs | Durable events, idempotent processing, retries, failure visibility |
| Health / Observability | Liveness/readiness, structured logging, request IDs, counters |

### 4.3 Module implementation pattern

Controllers parse DTOs and authenticated context, invoke a business service, and serialize an authorized projection. Business services own transitions and transactions. Repositories query with explicit row scope. Policy functions are reusable between endpoints and workers. Adapters perform external calls. Workers invoke the same domain services rather than making unguarded table updates.

Use dependency injection and explicit module exports to avoid circular imports. Never import backend/database packages into the mobile or public web bundle. Validate environment configuration at startup. Every protected service operation receives an actor/system context; a worker's system identity is scoped to its job purpose and recorded in audit where relevant.

## 5. Roles, permissions and data access

### 5.1 Four roles

| Role | Primary purpose | Data scope |
| --- | --- | --- |
| `CUSTOMER` | Discover, request/book, pay, follow own safari | Own profile, owned bookings/requests/quotes/payments/documents/support |
| `OPERATIONS` | Arrange and run bookings | Business operational records; finance totals only where permitted |
| `DRIVER_GUIDE` | Execute allocated trips | Currently assigned trips and minimum relevant traveler/pickup/itinerary data |
| `ADMIN` | Manage the business and access | Company-wide business scope, controlled finance actions and audit visibility |

An additional traveler is a row under a booking, not another application role, and does not need an account. A guide may also drive the vehicle; the initial app uses one combined Driver/Guide role. Separate driver and guide assignments can be added later without widening current access by default.

### 5.2 Permission registry

Represent permissions as named actions, with seeded role defaults and auditable overrides. Examples:

`catalog.read`, `catalog.manage`, `content.publish`, `customer.read`, `customer.manage`, `inquiry.manage`, `booking.create_own`, `booking.create_for_customer`, `booking.read`, `booking.confirm`, `booking.change_review`, `booking.cancel_review`, `itinerary.manage`, `quote.manage`, `quote.accept_own`, `assignment.manage`, `trip.read`, `trip.update_assigned`, `issue.report_assigned`, `issue.manage`, `fleet.manage`, `staff.manage`, `payment.read_own`, `finance.read`, `refund.request`, `refund.approve`, `report.operations`, `report.finance`, `access.manage`, `settings.manage`, `audit.read`.

Add explicit restricted actions `booking.confirm_override`, `finance.offline_record`, `finance.offline_verify` and `finance.adjustment`. Default them to Admin only. Granting operational finance visibility does not implicitly grant any of these write actions.

Keep the complete registry in code and a generated documentation table. Do not accept arbitrary permission names from the app. Deny unknown actions. Admin role management must be restricted, require recent authentication for high-impact changes, and prevent disabling/revoking the last active Admin.

### 5.3 Default action matrix

| Action | Customer | Operations | Driver/Guide | Admin |
| --- | --- | --- | --- | --- |
| Read published catalog | Yes | Yes | Yes | Yes |
| Edit/publish catalog and public content | No | No | No | Yes |
| Create standard booking | Own | For a customer | No | For a customer |
| Read booking/traveler details | Own | Operational scope | Minimal assigned-trip projection | Business scope |
| Edit traveler/pickup details | Own before cutoff/review rules | Operational scope with audit | No | Authorized operational scope |
| Confirm/reschedule/cancel a booking | Request only | Per policy | No | Per policy; reasoned override |
| Draft/send quotes and itineraries | Read/accept own | Yes | Read approved assigned itinerary | Yes |
| Assign guide/vehicle | No | Yes | No | Yes |
| Advance trip progress | No | Correct/terminate with reason | Assigned trip only | Correct/terminate with reason |
| Raise issue | Own booking support | Operational scope | Assigned trip only | Business scope |
| Initiate a payment | Own payable booking | No customer payment impersonation | No | No customer payment impersonation |
| View payment totals | Own | Booking totals; no gateway secrets | No | Business finance scope |
| Register verified offline payment | No | Only explicit `finance.offline_record` grant | No | Yes; evidence and audit required |
| Request a refund review | Own support/change request | With grant, no settlement editing | No | Yes |
| Approve/execute refund | No | No by default | No | Yes, within remaining refundable amount |
| Finance reports | Own receipts only | Explicit `report.finance` grant | No | Yes |
| Fleet/staff/access/settings | No | Availability read only | Assigned vehicle info only | Manage as permitted |
| Read audit | Own public timeline only | Scoped operational timeline | Own assigned event history | Full redacted audit |
| Delete audit/completed financial events | No | No | No | No through application APIs |

### 5.4 Authentication and sessions

1. Customer self-registration always grants only `CUSTOMER`; ignore/reject a submitted role field.
2. Passwords are hashed with Argon2id and per-password salts. Configure memory/time cost based on measured server capacity. Never store/reveal plaintext, reversible password encryption or reset tokens.
3. Access tokens expire after approximately 15 minutes. Opaque random refresh tokens expire after a configurable duration, initially 30 days. Store only their hashes server-side.
4. Rotate refresh tokens transactionally on use. Reuse detection revokes the session family. The mobile client serializes concurrent refresh calls; requests wait for one refresh result.
5. Store refresh tokens in Expo SecureStore. Keep access tokens in memory where practical. Do not put either in AsyncStorage, persisted Zustand, logs, analytics or URL parameters.
6. Return `roles`, `permissions`, `active` status and profile from `/me`. Build navigation from server grants. A multi-role switch chooses an existing grant and does not alter permissions.
7. Use `X-Role-Context` on protected domain requests when an account has multiple roles. Validate that context against current server grants on each request; it may narrow access, never increase it. Permission and row-scope checks still apply. Reject an ungranted context with `403`.
8. Staff accounts are created through Admin invitation. Staff set their own password via a single-use, expiring token. Staff-created customers receive an invitation/claim flow; staff never pick a real customer's password.
9. Logout revokes the session; logout-all revokes all user sessions. Suspension/role changes invalidate sensitive cached authorization and revoke affected sessions immediately where appropriate.
10. Email verification and password-reset flows use hashed, expiring, single-use tokens and local Mailpit delivery in development. Replies must not reveal whether an arbitrary email exists.

### 5.5 Row and field enforcement

- Customer queries include `customerId = actor.customerId`, including nested travelers, quotes, payment attempts, documents and support messages. Prefer scoped lookup; missing/out-of-scope IDs return `404` for private records.
- Guide execution queries require the current assignment to the trip. Reassignment removes access on the next server query. Completed read-only history is available only to the final assigned guide for a configurable short history window (initially 30 days); releasing resource allocations at completion does not erase assignment history. Superseded assignments do not grant continuing private access. Return a specific guide DTO; never serialize the full Booking model and rely on hidden UI fields.
- Guide responses exclude prices, payment totals, customer billing/profile history, internal CRM notes and unrelated contact information. Include dietary/accessibility/emergency data only when relevant to executing that trip.
- Operations projection excludes credential secrets, password hashes, token hashes, payment credentials and unnecessary identity documents. Finance/report access is separately checked.
- Admin cannot read password hashes/tokens/card credentials. No frontend receives provider secret keys or storage administration credentials.
- Internal notes, supplier costs/margins and private incident deliberations never appear in customer DTOs. Every note/update has explicit visibility.
- A UUID, query filter, hidden menu, or screen route is not an authorization control. Test direct API access using another account's IDs.

## 6. Data model and database invariants

### 6.1 Shared conventions

Use UUID primary keys and human-readable references generated uniquely by the backend. References such as `MA-2026-001204` are display identifiers, not authorization secrets. All mutable aggregate roots have integer `version`, `createdAt` and `updatedAt`. Store event timestamps as PostgreSQL `timestamptz`; API uses ISO-8601 UTC strings. Business travel dates use ISO `YYYY-MM-DD` date fields plus the trip timezone.

Money is a signed/unsigned integer **minor-unit** value as appropriate, stored as `bigint` and serialized as decimal strings. Never calculate money with JavaScript floating-point multiplication or serialize database `bigint` directly into JSON. Currency is ISO 4217 and must be supported by server/provider configuration. Use a maintained authoritative currency-exponent mapping; do not assume every currency has two decimal places. No automatic FX conversion in baseline.

Distinguish IDs in DTOs: `userId` identifies authentication identity, `customerId` identifies CustomerProfile, and `guideId` identifies StaffProfile. A booking owns a CustomerProfile; its account relation supplies customer authorization. A trip assignment owns a StaffProfile; its user relation supplies guide authorization. Never compare a profile UUID directly to an auth user UUID or let an unclaimed profile be publicly claimed by matching an email alone.

Use normalized tables for relations and versioned business records. JSONB is appropriate for immutable snapshots, safe provider metadata, policy configuration and typed content blocks; it is not a substitute for core booking/payment relations. Add database checks, foreign keys, uniqueness and indexes, not only frontend validation.

### 6.2 Identity, settings and catalog entities

| Entity | Required fields and relations | Constraints / indexes |
| --- | --- | --- |
| `User` | `id`, normalized email, password hash, status, email verified timestamp, locale, last login, version | Unique normalized email; status `ACTIVE/INVITED/SUSPENDED`; never public hash serialization |
| `UserRoleGrant` | User, role, granted by, granted/revoked timestamps | At most one active grant per user/role |
| `PermissionOverride` | User or role scope, registered action, allow/deny, reason, actor | Explicit deny wins; audit all changes |
| `Session` | User, refresh hash, family ID, previous-token relation, expiry, revoked time, device label | Unique token hash; index user/expiry; rotation transaction |
| `AuthToken` | User/email, purpose verification/reset/invite, token hash, expiry, usedAt | Single use; no plaintext persisted |
| `CustomerProfile` | User optional until invitation claimed, name, phone, country, preferences, version | User relation unique when present; staff-created lead/customer may have no account |
| `StaffProfile` | User, display name, phone, languages, capability tags, active | Role/capability validation; suspension prevents new assignments |
| `StaffAvailability` | Staff, interval, type `AVAILABLE/LEAVE/BLOCKED`, note visibility | Valid start/end, conflict checked by assignment service |
| `CompanySettingsVersion` | Company contact, locale defaults, public download URLs, policy reference, version, changedBy | Public projection excludes secret config; immutable prior versions |
| `BookingPolicyVersion` | Deposit basis points, deadlines, child rules, cancellation text, short-notice rule, effectiveAt | Validate ranges; immutable once referenced by booking |
| `Destination` | Slug, names/descriptions by locale, region, gallery, status, version | Unique slug; published filter |
| `ServiceCategory` | Slug, localized label/copy, request mode, sort order, status | Unique slug; request mode is explicit |
| `Package` | Slug, title/copy, category, duration, inclusions/exclusions, good-to-know, cover, status, version | Publish requires complete content and valid active rate; archive rather than delete referenced package |
| `PackageDestination` | Package, destination, day/order | Composite uniqueness as applicable |
| `PackagePriceVersion` | Package, currency, adult/child rule, date interval, line-item rules, createdBy, activeAt | No contradictory active rules; accepted booking retains snapshot after new rates |
| `PackageDeparture` | Optional fixed departure, package, dates, capacity, status, version | If group capacity configured, reserve under transaction/row lock |
| `CatalogItineraryTemplate` | Package version, ordered days/activities, public text | Copied into booking itinerary snapshot, not live-linked mutable text |
| `MediaAsset` | Storage key, owner/purpose, MIME, bytes, dimensions, visibility, checksum, license/credit, status | Random storage keys; validated finalized uploads; indexed owner/purpose |
| `LandingContentVersion` | Typed hero/story/services/content blocks, locale, media relations, draft/published version | Publish validation; no arbitrary executable HTML/scripts |

### 6.3 Booking, custom and itinerary entities

| Entity | Required fields and relations | Constraints / indexes |
| --- | --- | --- |
| `Inquiry` | Source, service category, optional customer, contact, requirements, status, owner staff, timestamps | Staff scope; convert/link to custom request or booking, preserve origin |
| `InternalNote` | Target type/ID, author, body, visibility fixed internal, createdAt | Append history; customer DTO never includes it |
| `PricePreview` | Customer, package/rate version or quote, dates/counts/add-ons, price/policy snapshot, request hash, expiry | Bound to owner and exact selections; consumed/revalidated on create |
| `Booking` | Customer, reference, source `PACKAGE/CUSTOM/MANUAL`, package/quote optional, dates/timezone, status, currency, original price/policy snapshot, version | Unique reference; unique accepted quote relation; index customer/date/status |
| `BookingTraveler` | Booking, lead flag, full name, adult/child band, age/DOB only when needed, language/requirements | Counts match booking; one lead; additional travelers have no role/account |
| `BookingPickup` | Booking, label/address, approved coordinates optional, pickup time/timezone, contact requirements | Structured data; no invented geocoding |
| `DepartureReservation` | Optional fixed departure, booking, seat count, state held/confirmed/released, hold expiry | Unique booking/departure; capacity checked under departure row lock; expiry/release is explicit |
| `BookingLineItem` | Booking, label, type, quantity, unit amount, total, tax/rule snapshot | Integer math; sum reconciles to snapshot total |
| `FinancialAdjustment` | Booking, debit/credit amount, type, reason, approval, reference, immutable createdAt | Append-only; idempotent reference; changes payable total without altering old payments |
| `BookingChangeRequest` | Booking, type reschedule/cancel/details, proposed fields, customer/staff actor, status, decision reason, approved financial disposition | Original booking stays valid until approved transition; one conflicting open request at a time |
| `CustomRequest` | Customer, service, destinations, date flexibility, group counts, budget/currency, style, notes, status, assigned staff, version | Customer budget is non-binding; privacy scope |
| `QuoteVersion` | Request, version number, state, currency, line items, itinerary version, price/policy snapshot, expiry, sentAt, acceptedAt | Unique request/version; immutable after send; one current actionable version |
| `QuoteLineItem` | Quote version, category, description, quantity, unit/total amount, customer visibility | Customer-visible sell lines separate from internal supplier cost fields |
| `ItineraryVersion` | Booking/request, version number, state `DRAFT/PUBLISHED/SUPERSEDED`, approvedBy, publishAt, timezone | Existing published document/event retains its version; one current published version |
| `ItineraryDay` | Itinerary version, sequence/day/date, title, accommodation, notes, visibility | Unique itinerary/day sequence; chronological validation |
| `ItineraryActivity` | Day, order, times optional, location, customer text, guide notes, visibility | Ordered; private notes projected separately |
| `Review` | Customer, completed booking, stars, text, moderation status, created/updated | Unique customer/booking; only owning customer after completion |
| `Favorite` | Customer, package/destination | Unique owner/target; no cross-account cache |

### 6.4 Operations, finance and infrastructure entities

| Entity | Required fields and relations | Constraints / indexes |
| --- | --- | --- |
| `Trip` | Booking, reference, dates/window/timezone, status, itinerary version, version, completedAt | One primary trip per booking in v1; index date/status |
| `Vehicle` | Registration/reference, type, seats, luggage/capabilities, status, photo, version | Unique registration; status active/maintenance/retired; capacity checked |
| `ResourceAllocation` | Trip or maintenance source, resource type/ID, startsAt, endsAt, active/released state | Database non-overlap for active allocation of the same resource; see section 6.5 |
| `TripAssignment` | Trip, guide, vehicle, allocation references, assignedBy, active interval, replacedBy | History preserved; one current primary guide/vehicle set per trip |
| `TripChecklistItem` | Trip, key, state, note, checkedBy/At | Required item keys policy-defined; version concurrency |
| `TripEvent` | Trip, event type, sequence, previous/new status, actor, timestamp, activity optional, visibility, notes | Append-only; unique trip/sequence; idempotent action reference |
| `TripIssue` | Trip, reporter, category, severity, text, attachments, visibility, status, owner staff, resolvedAt | Assigned-guide create; sensitive detail separately projected |
| `TripHandover` | Trip, guide, completion notes, checklist, submittedAt | One accepted handover per primary trip; immutable submission with corrections as addenda |
| `PaymentIntent` | Booking, customer, purpose, amount/currency, provider, merchant reference, state, expiry, reservation, version | Unique merchant/provider key; server-computed amount; index state/expiry |
| `PaymentAttempt` | Intent, provider transaction reference, request state, next action metadata, timestamps | Unique provider/transaction reference when provided; safe metadata only |
| `ProviderEvent` | Provider/event ID, verified status, payload hash, allowed redacted metadata, processing state | Unique provider/event ID; retain enough to reconcile, not credentials/card data |
| `PaymentPosting` | Booking, intent, captured amount/currency, provider reference, settledAt | Immutable; unique capture reference; no duplicate credit |
| `OfflinePaymentRecord` | Booking, reference, method, evidence, amount/currency, submitted/verified actors | Verification required before posting; unique bank/reference where meaningful |
| `Refund` | Booking/payment posting, requested amount, reason, state, approval/execution references, timestamps | Amount limited by captured less refunded/reserved; provider reference unique |
| `RefundPosting` | Refund, settled amount/currency, provider reference, settledAt | Immutable; unique provider refund event |
| `Document` | Owner/booking, type, source version, storage key, status, checksum, createdAt | Private by default; receipt ties to settled posting, itinerary ties to published version |
| `SupportThread` / `SupportMessage` | Owner/customer, booking optional, participants, message visibility, attachments, status | Scope every read/write; never send internal notes as customer messages |
| `Notification` | User, type, resource ID, safe title/body, readAt, createdAt | Index user/createdAt; private ownership |
| `DeviceToken` | User/session/device, platform, provider token, active, lastSeen | Unique token association; revoke/reassign on logout/account switch |
| `DeliveryAttempt` | Notification/event, channel, state, provider message ref, retry count, safe error | Distinguish queued/accepted/delivered where provider supports it |
| `AuditEvent` | Actor/system, action, entity, request ID, safe before/after summary, reason, createdAt | Append-only application access; secrets and unnecessary PII redacted |
| `OutboxEvent` | Event ID/type, aggregate ID/version, typed payload, state, attempt, nextAttemptAt | Insert in business transaction; unique logical event key |
| `IdempotencyRecord` | Actor/scope/key, request hash, state, response reference/status, expiry | Unique scope/key; mismatch rejects rather than replaying unrelated response |
| `ExportJob` | Actor, report type, filters snapshot, status, document, expiry, safe error | Permission checked at create and download; private artifact |

### 6.5 Assignment consistency

Availability checks in JavaScript alone are insufficient: two staff members can assign the same vehicle at the same time. Use a transaction plus PostgreSQL exclusion constraints for active resource intervals. Maintain resource allocations for both trips and maintenance blocks.

Illustrative migration pattern; adapt identifiers to the actual Prisma mapping:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE resource_allocation
  ADD CONSTRAINT allocation_valid_window CHECK (ends_at > starts_at);

ALTER TABLE resource_allocation
  ADD CONSTRAINT allocation_no_overlap
  EXCLUDE USING gist (
    resource_type WITH =,
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (state = 'ACTIVE');
```

Use half-open intervals and configured preparation/return buffers. Validate vehicle seats, luggage requirements, guide capabilities, maintenance state and staff availability inside the service. Lock/update the trip version and replace old allocations atomically. Convert exclusion conflicts to `409 RESOURCE_UNAVAILABLE`, not a generic server error. Prisma may require a hand-written SQL migration for this constraint; integration-test that migration against PostgreSQL.

### 6.6 Other required invariants

- A quote can create at most one booking, even with concurrent acceptance requests.
- A payment provider event/capture/refund credits or debits the ledger at most once.
- A booking's selected package and policy changes never silently rewrite its original accepted snapshot.
- `adults >= 1`, `children >= 0`, validated maximum travelers, return date after start, appropriate service duration, valid timezones/currencies and nonnegative sell prices.
- Submitted traveler rows reconcile to the pricing counts and eligible child band; invalid combinations fail server validation.
- Refunds cannot exceed the remaining captured funds after settled refunds and pending refund reservations.
- A suspended guide or a retired/maintenance vehicle cannot receive a new active allocation.
- All protected command updates compare aggregate `version`; stale UI receives an actionable conflict response.
- Archive referenced catalog/staff/vehicle records. Avoid cascading hard deletes of business or finance history.
- Backups and approved retention operations are infrastructure concerns, separate from the app's lack of delete-audit/payment endpoints.

If fixed group departures are configured, creation locks the departure and checks capacity against active held/confirmed reservations. An unpaid request initially holds seats for 30 minutes; payment initiation/reconciliation coordinates that hold. Verified required payment retains the reservation for staff review, and confirmation marks it confirmed. Decline/cancellation releases seats. Expired unpaid holds require a new capacity check before payment. A late real capture after a hold was released is a visible capacity/reconciliation exception requiring reassignment or an authorized refund, never an automatic oversold confirmation. Private/custom trips use resource feasibility rather than fictional fixed seat inventory.

## 7. Business workflows and state machines

### 7.1 Standard booking sequence

1. Customer discovers a published package and reads the current public details.
2. Customer selects dates, traveler counts, pickup, extras and requirements.
3. Backend creates a bound, expiring price preview with currency, line items, required deposit, deadlines and policy.
4. Customer reviews the exact server total and policy, then creates a booking with the preview ID and traveler details.
5. Backend validates ownership, preview selections, expiry, rate/departure availability and creates `REQUESTED` booking plus initial itinerary snapshot.
6. Customer requests deposit/full payment. A verified capture updates financial totals and creates the receipt job; the UI displays confirmation only after reading server state.
7. Operations reviews requirements and capacity. Confirmation requires satisfied payment/policy conditions and an approved itinerary. A reasoned Admin policy override is possible only through a separate authorized command.
8. Confirmation creates the primary `SCHEDULED` trip. Operations assigns guide/vehicle, sets pickup and completes preparation checklist.
9. Customer sees published final itinerary, pickup, guide contact and notifications.
10. Assigned guide advances approved progress, raises issues if needed, and submits completion/handover.
11. Backend marks the trip and booking completed, publishes appropriate customer timeline information and permits a review. Any balance exception remains visible to finance; a guide does not handle it.

### 7.2 Custom service / safari sequence

1. Customer submits destinations/service, dates/flexibility, group, style, budget/currency and notes.
2. Operations assigns/reviews request, records internal questions and communicates through the customer support/request thread.
3. Operations creates a draft day-by-day itinerary and versioned quotation with server-calculated lines and policy.
4. Send validates complete content and freezes that quote version. Customer receives a notification and sees the proposal.
5. Customer may request revision or reject. A new draft version is created; old versions remain readable and clearly superseded.
6. Customer accepts the current unexpired quote, with an idempotency key and expected version. In one transaction, mark accepted and create exactly one `REQUESTED` booking with immutable quote/itinerary/price/policy snapshots.
7. Payment, Operations confirmation, allocation and trip execution then use the standard flow.

The customer's proposed budget does not become the final price. Accepting a quote does not automatically pay or bypass confirmation rules.

### 7.3 Booking states

| State | Allowed outgoing state | Authorized trigger / conditions |
| --- | --- | --- |
| `REQUESTED` | `CONFIRMED` | Operations/Admin; required payment, approved itinerary, feasibility and version check |
| `REQUESTED` | `DECLINED` | Operations/Admin with reason and explicit captured-funds disposition |
| `REQUESTED` | `CANCELLED` | Approved cancellation decision; financial disposition recorded |
| `CONFIRMED` | `IN_PROGRESS` | Assigned trip reaches safari-start phase |
| `CONFIRMED` | `CANCELLED` | Approved pre-start cancellation; release allocations and decide refund |
| `IN_PROGRESS` | `COMPLETED` | Trip completed and handover accepted |
| `IN_PROGRESS` | `CANCELLED` | Authorized operational termination with reason, customer communication and finance review |
| `COMPLETED` / `CANCELLED` / `DECLINED` | None through ordinary edit | Corrections are append-only notes/financial adjustments under explicit permissions |

An open reschedule/cancel request is a separate entity; it does not erase the underlying booking state. Customer requests alone do not release resources or issue refunds. Physical trip completion is not blocked by a financial condition the guide cannot see; outstanding balances remain finance exceptions.

The Admin confirmation override applies only to allowlisted business policy/payment exceptions, carries an explicit reason and recent-auth proof, and never bypasses identity/authorization, valid itinerary, data integrity or safe allocation constraints. It records an unpaid exception instead of inventing a payment. Model financial adjustments with nonnegative `amountMinor` and explicit `DEBIT/CREDIT` direction; adjustment reasons link an approved change/cancellation or documented correction.

### 7.4 Trip states and events

| Sequence | Trip state | User-facing meaning |
| --- | --- | --- |
| 0 | `SCHEDULED` | Confirmed trip, possibly still awaiting allocation |
| 1 | `EN_ROUTE_TO_PICKUP` | Guide driving to pickup |
| 2 | `PICKED_UP` | Travelers collected |
| 3 | `SAFARI_STARTED` | Safari/service started; booking becomes in progress |
| 4 | `ACTIVITY_REACHED` | Destination/activity reached |
| 5 | `RETURNING` | Return journey |
| 6 | `COMPLETED` | Handover accepted and journey completed |

The assigned guide advances only permitted next transitions, using the current version. Multi-day itineraries can have repeated activity/day events without resetting the main state or skipping completion conditions. Distinguish `ACTIVITY_CHECK_IN`, `DAY_NOTE`, delay and issue events from main state transitions. These are manual status updates, not proof of GPS presence.

Operations may correct a mistaken stage or terminate a trip only through a reasoned correction command that preserves the old event. No edit/delete endpoint for previous progress events. Completion checks required guide checklist/handover fields, not customer finance values.

Guide execution begins only when the trip is confirmed, the current guide/vehicle are allocated, pickup/timezone and approved itinerary exist, and the required preparation checklist is ready. Show a clear preparation-blocked state when these conditions are unmet. Optional time-window guards are configurable and testable; do not fabricate an actual pickup event merely because the clock passed. Physical events always require an explicit authorized action.

### 7.5 Quote and request states

Quote: `DRAFT → SENT → ACCEPTED`, or `SENT → REJECTED / EXPIRED / SUPERSEDED`. Drafts are editable. Sent versions are immutable. Only the latest actionable sent version may be accepted. Expiry is checked transactionally even if an expiry job has not run.

Custom request: `SUBMITTED → IN_REVIEW → QUOTED → ACCEPTED → CLOSED`, with `QUOTED → REVISION_REQUESTED → IN_REVIEW`. Request closure/rejection keeps history; accepted request links the generated booking. A staff send/accept race must have one coherent outcome, not two bookings or an accepted superseded price.

### 7.6 Reschedule and cancellation

Rescheduling after creation goes through a change request. Staff approval checks new price/capacity, policy, allocations, customer acceptance where price changes, and current booking version. Preserve old/new dates and monetary adjustments. Do not merely patch dates while leaving an overlapping vehicle assignment.

Approval must either atomically move allocations to valid new intervals or release them and clearly mark preparation required. Existing guide/customer receive updated itinerary notices. Started/completed trips require the explicit exceptional correction policy; ordinary date edits are blocked.

Cancellation approval records a policy/reason snapshot, releases future allocations, creates a credit adjustment for the refundable reduction of the contract, and creates an authorized refund request where net captured funds exceed the remaining contractual charge. Refund settlement is a later provider event, not a local button. Declining a paid request follows the same explicit refund-disposition requirement.

### 7.7 Pricing and financial formulas

Define values in one currency and integer minor units:

```text
originalTotal = sum(accepted sell line items)
contractTotal = originalTotal + approved debit adjustments - approved credit adjustments
capturedTotal = sum(immutable successful payment postings)
refundedTotal = sum(immutable successful refund postings)
netPaid = capturedTotal - refundedTotal
balanceDue = max(contractTotal - netPaid, 0)
refundDue = max(netPaid - contractTotal, 0)
depositTarget = ceil(originalTotal * depositBasisPoints / 10000)
depositDue = max(min(depositTarget, contractTotal) - netPaid, 0)
```

Use integer multiplication/division with an explicitly tested rounding rule. For the demo, two adults at USD 1,250 plus one eligible child at USD 875 total USD 3,375; a 30% deposit is USD 1,012.50. Show currency formatting from minor units, not the stored string directly.

For active bookings with adjusted dates/pricing, calculate the required amount from the approved policy and adjustments, and communicate it before collecting more funds. Cancellation can lower `contractTotal` to the retained cancellation charge without altering historical capture values. Label `refundDue` and pending refunds separately from a completed refund.

Financial display status is derived from these postings and the contract, rather than a user-editable `paid` field. Include unpaid, partially paid, paid, refund due/pending/refunded, and overpayment/reconciliation exception states where appropriate. Never suppress a real late capture merely because the booking has already been cancelled.

### 7.8 Connected event examples

| Business command | Same-transaction event | Downstream result |
| --- | --- | --- |
| Booking created | `booking.requested` | Operations action queue and customer acknowledgement |
| Verified capture posted | `payment.captured` | Financial totals, receipt job, Operations payment condition |
| Quote sent | `quote.sent` | Customer in-app/email notification |
| Quote accepted | `quote.accepted`, `booking.requested` | One linked booking and payment action |
| Trip assigned | `trip.assignment_changed` | Guide assigned list, customer approved pickup/guide update |
| Guide progress | `trip.progressed` | Operations monitor and customer-safe timeline |
| Issue reported | `trip.issue_reported` | Operations urgent queue and appropriate support response |
| Trip completed | `trip.completed`, `booking.completed` | Customer completed trip and review eligibility |
| Catalog published | `catalog.published` | Public cache invalidation/content visibility |
| Access changed | `access.changed` | Session/authorization invalidation and audit |

## 8. API conventions and endpoint inventory

### 8.1 Common contract

Base path: `/v1`. All paths below include that prefix when implemented. Use JSON except multipart/upload transfers and explicit binary document downloads. Generate and commit an OpenAPI document and typed SDK. Document DTO fields, enums, examples, permission requirements and error responses.

Successful object response:

```json
{
  "data": { "id": "uuid", "version": 3 },
  "meta": { "requestId": "req_01" }
}
```

Successful paginated response:

```json
{
  "data": [],
  "meta": {
    "requestId": "req_01",
    "nextCursor": null,
    "hasMore": false,
    "limit": 20
  }
}
```

Error response:

```json
{
  "error": {
    "code": "RESOURCE_UNAVAILABLE",
    "message": "The selected vehicle is no longer available for these dates.",
    "details": { "field": "vehicleId", "currentVersion": 4 },
    "requestId": "req_01"
  }
}
```

Use `400` malformed request, `401` missing/expired authentication, `403` forbidden action/context, `404` private resource missing or outside scope, `409` conflict, `422` semantic/field validation, `429` rate limit, and `503` dependency unavailable. Do not leak stack traces, SQL, token values or provider raw errors. Expose stable error codes so clients can translate them.

Representative codes: `VALIDATION_FAILED`, `EMAIL_VERIFICATION_REQUIRED`, `SESSION_REVOKED`, `ROLE_CONTEXT_DENIED`, `VERSION_CONFLICT`, `PRICE_PREVIEW_EXPIRED`, `PRICE_CHANGED`, `QUOTE_EXPIRED`, `QUOTE_SUPERSEDED`, `INVALID_TRANSITION`, `RESOURCE_UNAVAILABLE`, `PAYMENT_NOT_REQUIRED`, `PAYMENT_ALREADY_PENDING`, `PAYMENT_CONDITION_UNMET`, `PAYMENT_RECONCILIATION_REQUIRED`, `REFUND_LIMIT_EXCEEDED`, `IDEMPOTENCY_KEY_REUSED`, `DOCUMENT_NOT_READY`, `INTEGRATION_DISABLED`.

### 8.2 Idempotency, concurrency and validation

- Require `Idempotency-Key` for booking create, quote accept/send, payment intent create, offline-payment verification, refund actions, assignment, progress and handover. A UUID key generated once per intended action is suitable.
- Scope keys by actor/action/resource, store a canonical request hash, and return the same resource/result for a retry. A different payload using the same key returns `409 IDEMPOTENCY_KEY_REUSED`.
- Store authoritative deduplication in PostgreSQL. Default short-lived API idempotency records may expire after seven days; payment/quote uniqueness and ledger constraints never depend on that expiry.
- Update commands include `expectedVersion`. Compare and increment inside the transaction. A conflict returns the current version and instructs refetch; don't silently overwrite another staff member's changes.
- Use `201` for created resources, `200` for command results and `202` for accepted jobs. Destructive/archive operations return a result or `204` consistently. A replay preserves the original documented result.
- Validation rejects unknown sensitive fields (`role`, `paid`, `total`, provider secret, internal note) rather than binding request JSON directly to database objects.
- Lists use `cursor`, `limit` (default 20, maximum 50), documented filters and deterministic ordering with an ID tiebreaker. Search is bounded and indexed. All filters remain within role scope.
- Validate incoming timezone/date/currency, contact formats, length limits, traveler count, attachment limits and line items. Client validation improves UX but cannot replace server validation.

### 8.3 Authentication and account endpoints

| Method | Path | Access and behavior |
| --- | --- | --- |
| POST | `/auth/register` | Public rate-limited customer registration; name/email/password/locale; no role input |
| POST | `/auth/login` | Email/password; session/access/refresh response; optional configured MFA extension |
| POST | `/auth/refresh` | Opaque refresh token; rotate transactionally and return tokens |
| POST | `/auth/logout` | Revoke current session; safe repeated call |
| POST | `/auth/logout-all` | Authenticated user; revoke all sessions |
| POST | `/auth/email/verification/request` | Generic response; queue verification email |
| POST | `/auth/email/verification/complete` | Single-use token; mark verified |
| POST | `/auth/password/reset/request` | Generic response; queue reset link |
| POST | `/auth/password/reset/complete` | Token/new password; consume once, revoke sessions |
| POST | `/auth/password/change` | Current password/new password; refresh session policy |
| POST | `/auth/invitations/accept` | Staff/customer invitation token; set own password and claim validated identity |
| POST | `/auth/reauthenticate` | Password proof; short-lived action-scoped reauthentication token for sensitive commands |
| GET | `/me` | Current user/profile/grants/permissions/locale; no secrets |
| PATCH | `/me/profile` | Own name/phone/preferences, expected version; identity email change has separate verified flow |
| POST | `/me/email-change` | Request verified email change; reauthentication required |
| GET | `/me/sessions` | Safe session/device list |
| DELETE | `/me/sessions/:sessionId` | Revoke own session |
| GET | `/me/notification-preferences` | Own allowed channels and preferences |
| PATCH | `/me/notification-preferences` | Own preference changes; no disabling mandatory operational record creation |
| POST | `/me/devices` | Register push token/device metadata to authenticated session |
| DELETE | `/me/devices/:deviceId` | Own token deactivation |
| GET | `/me/notifications` | Cursor-paginated own notifications |
| POST | `/me/notifications/:id/read` | Own notification, idempotent |
| POST | `/me/notifications/read-all` | Own notifications through explicit time/cursor cutoff |

### 8.4 Public catalog and customer endpoints

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/public/company` | Public contact, approved content and supported locales |
| GET | `/public/app-release` | Real configured store URLs/release state; never fake downloadable builds |
| GET | `/public/landing` | Published typed landing content/media only |
| GET | `/public/services` | Published service categories and request modes |
| GET | `/public/destinations` | Published destinations, search/category filters |
| GET | `/public/destinations/:slug` | Published destination details and related packages |
| GET | `/public/packages` | Published packages; category/destination/duration/search filters; accurate “from” rate labeling |
| GET | `/public/packages/:slug` | Published gallery/itinerary/inclusions/rates/request conditions |
| GET | `/public/packages/:slug/departures` | Configured published departures; no invented inventory |
| GET | `/me/favorites` | Customer's favorite published/available targets; archived target handled gracefully |
| PUT | `/me/favorites/:targetType/:targetId` | Own favorite; idempotent upsert |
| DELETE | `/me/favorites/:targetType/:targetId` | Own favorite; idempotent removal |
| POST | `/pricing/previews` | Verified customer; server prices exact selections and returns expiring preview |
| POST | `/bookings` | Customer owns new booking; preview and traveler/pickup input; idempotent |
| GET | `/bookings` | Context-scoped list: customer own; Operations/Admin authorized business list |
| GET | `/bookings/:id` | Role-specific projection; guide uses `/trips` instead |
| PATCH | `/bookings/:id/travelers` | Owner within edit cutoff or authorized Operations/Admin; versioned, counts/pricing cannot be bypassed |
| PATCH | `/bookings/:id/pickup` | Allowed owner/staff edit; confirmed changes may require review; audit |
| POST | `/bookings/:id/change-requests` | Owner/staff proposal for reschedule/cancel/details; no direct refund |
| GET | `/bookings/:id/change-requests` | Scoped request/decision history |
| GET | `/bookings/:id/itinerary` | Current published customer itinerary, or authorized staff draft view on explicit staff endpoint |
| GET | `/bookings/:id/timeline` | Customer-safe timeline for owner; operational timeline only for staff context |
| GET | `/bookings/:id/documents` | Authorized private document list with generation states |
| GET | `/bookings/:id/payment-summary` | Own/staff totals according to finance permission; guide denied |
| POST | `/bookings/:id/payment-intents` | Customer owns payable booking; purpose/method, amount determined by server |
| GET | `/payment-intents/:id` | Owning customer or authorized finance; state/next action, no provider secrets |
| GET | `/me/payments` | Own attempts/settled captures/refunds, pagination |
| GET | `/me/receipts` | Own settled-payment receipts and ready/pending states |
| POST | `/bookings/:id/reviews` | Owning customer after completion; one review; stars/text |
| PATCH | `/reviews/:id` | Owner permitted edit; moderation policy; no changing review owner/booking |
| POST | `/custom-requests` | Verified customer requirements submission; idempotent |
| GET | `/custom-requests` | Own or staff-scoped request list |
| GET | `/custom-requests/:id` | Scope-protected requirements, safe quote history/thread links |
| PATCH | `/custom-requests/:id` | Own unsent/pre-review permitted fields or staff; version rules |
| POST | `/custom-requests/:id/revision-requests` | Owner responds to current quote; reason/proposed changes |
| GET | `/custom-requests/:id/quotes` | Owner sees sent historical versions; staff also drafts |
| GET | `/quotes/:id` | Scope and projection; customer cannot view unsent draft/internal costs |
| POST | `/quotes/:id/accept` | Owning customer; latest/unexpired sent version; idempotent one-booking transaction |
| POST | `/quotes/:id/reject` | Owning customer; reason optional; preserves history |

### 8.5 Operations and CRM endpoints

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/ops/overview` | Operations/Admin queue counts/actions, date/timezone filters |
| GET | `/ops/inquiries` | Operational inquiry list with status/owner/source filters |
| POST | `/ops/inquiries` | Create manual inquiry/contact/service requirements |
| GET | `/ops/inquiries/:id` | Full operational inquiry and internal notes |
| PATCH | `/ops/inquiries/:id` | Assign/status/details with version; audited |
| POST | `/ops/inquiries/:id/convert` | Link/create customer and custom request or booking preview; idempotent |
| GET | `/ops/customers` | Scoped search/pagination; minimum list projection |
| POST | `/ops/customers` | Create customer/contact record; invitation optional, no chosen password |
| GET | `/ops/customers/:id` | Customer operational history and owned bookings |
| PATCH | `/ops/customers/:id` | Authorized contact/preferences correction, version/reason |
| POST | `/ops/customers/:id/invite` | Queue customer claim invitation with rate limit |
| POST | `/ops/bookings/pricing-previews` | Authorized manual booking preview for selected customer |
| POST | `/ops/bookings` | Create manual customer booking with validated preview/source; same invariants |
| POST | `/ops/records/:type/:id/notes` | Internal note for allowlisted entity type; explicit internal-only projection |
| POST | `/custom-requests/:id/assign` | Staff owner assignment; not trip assignment |
| POST | `/custom-requests/:id/quotes` | Create draft quote/new revision with server totals |
| PATCH | `/quotes/:id` | Draft-only line/content changes; expected version |
| POST | `/quotes/:id/send` | Freeze/send validated quote and outbox notification; idempotent |
| POST | `/bookings/:id/itinerary-versions` | Staff creates draft from current version/template |
| PATCH | `/itinerary-versions/:id` | Staff draft days/activities; ordered validation and version |
| POST | `/itinerary-versions/:id/publish` | Staff approval; atomic current-version change, document/notification events |
| POST | `/bookings/:id/confirm` | Authorized confirmation; return unmet conditions if blocked |
| POST | `/bookings/:id/confirmation-overrides` | Admin with `booking.confirm_override`, recent auth, reason and allowlisted policy exception; same one-trip transaction |
| POST | `/bookings/:id/decline` | Reason and approved financial disposition; no silent loss of captured funds |
| POST | `/change-requests/:id/approve` | Review policy, money/allocations/version and approved outcome |
| POST | `/change-requests/:id/reject` | Staff reason; customer-safe decision notification |
| GET | `/resources/availability` | Staff date/trip/capacity/capability query; preliminary availability only |
| GET | `/trips` | Customer own safe trips, Operations/Admin business trips, guide assigned trips |
| GET | `/trips/:id` | Context-specific projection; strict guide assignment scope |
| POST | `/trips/:id/assignments` | Operations/Admin, valid resources and atomic allocations; idempotent |
| PATCH | `/trips/:id/preparation` | Pickup, checklist and operational requirements; versioned |
| POST | `/trips/:id/customer-updates` | Staff writes explicit customer-visible notice; internal notes separate |
| POST | `/trips/:id/progress-corrections` | Operations/Admin, reason/recent state; append corrective event |
| GET | `/trips/:id/issues` | Scoped issues; customer safe subset only where relevant |
| PATCH | `/trip-issues/:id` | Staff triage/resolve/visibility-safe reply with version |
| GET | `/ops/reports` | Operations reports; finance columns require independent finance grant |

### 8.6 Driver / Guide endpoints

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/guide/overview` | Counts/current action for assigned trips only |
| GET | `/trips?bucket=today` | Guide context returns currently assigned trips, no business-wide list |
| GET | `/trips/:id/travelers` | Minimal assigned-trip names/counts/requirements/contact projection |
| GET | `/trips/:id/itinerary` | Approved itinerary and relevant guide notes only |
| GET | `/trips/:id/events` | Assigned event history; no internal finance/CRM events |
| POST | `/trips/:id/progress` | Assigned active guide; permitted transition/activity event, version/idempotency |
| POST | `/trips/:id/issues` | Assigned guide; category/severity/text/validated attachments |
| POST | `/trips/:id/handover` | Assigned guide; checklist/notes and completion transaction |

Operations/Admin inspect these records using their own authorized context. Admin does not impersonate a guide to create progress; use the correction endpoint with audit identity.

### 8.7 Admin, finance and settings endpoints

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/admin/overview` | Authorized metrics with date/currency/filter definitions |
| GET / POST | `/admin/packages` | List all statuses / create draft |
| GET / PATCH | `/admin/packages/:id` | Complete editor details / draft versioned content changes |
| POST | `/admin/packages/:id/prices` | New immutable pricing version; no rewriting booked prices |
| POST | `/admin/packages/:id/publish` | Validate public content/rate/media and publish |
| POST | `/admin/packages/:id/archive` | Remove future public booking visibility; preserve referenced bookings |
| GET / POST | `/admin/destinations` | Management list / create |
| GET / PATCH | `/admin/destinations/:id` | Details / edit with version |
| POST | `/admin/destinations/:id/publish` | Publish validated content |
| POST | `/admin/destinations/:id/archive` | Archive with references preserved |
| GET / POST | `/admin/services` | Management list / create service category |
| PATCH | `/admin/services/:id` | Service text/request mode/status with validation |
| GET / PATCH | `/admin/landing` | Draft/current content / save typed draft |
| POST | `/admin/landing/publish` | Publish current validated draft |
| GET / POST | `/admin/vehicles` | Fleet list / create vehicle |
| GET / PATCH | `/admin/vehicles/:id` | Fleet details / edit capacity/capabilities/version |
| POST | `/admin/vehicles/:id/maintenance-blocks` | Create maintenance interval; resolve active trip conflict explicitly |
| POST | `/admin/vehicles/:id/maintenance-blocks/:blockId/release` | Release maintenance allocation; audited |
| POST | `/admin/vehicles/:id/retire` | Archive fleet availability; do not orphan assigned future trips |
| GET | `/admin/staff` | Safe staff list with roles/capabilities/active state |
| POST | `/admin/staff/invitations` | Staff invite with approved grants; recent authentication |
| GET / PATCH | `/admin/staff/:id` | Safe staff profile / capabilities/contact/version |
| POST | `/admin/staff/:id/availability` | Availability/leave/block interval |
| POST | `/admin/staff/:id/suspend` | Deny access/new assignments; future assignments require review |
| POST | `/admin/staff/:id/reactivate` | Restore allowed status with audit |
| GET | `/admin/payments` | Finance-filtered captures/attempts/exception list |
| GET | `/admin/payments/:id` | Read-only payment history and ledger links |
| POST | `/admin/offline-payments` | Record evidence/reference; does not credit until verified |
| POST | `/admin/offline-payments/:id/verify` | Authorized verification/idempotent posting, reason and audit |
| POST | `/admin/bookings/:id/financial-adjustments` | Admin `finance.adjustment`; append approved debit/credit with reason/source/version/reauth; never edit a capture |
| POST | `/admin/refunds` | Request refund against captured posting; reserve authorized amount |
| POST | `/admin/refunds/:id/approve` | Approve/execute via adapter; recent auth, idempotency, cap |
| POST | `/admin/refunds/:id/reject` | Reason and release refund reservation |
| GET | `/admin/refunds` | Filtered states/history; no “edit settled amount” endpoint |
| GET | `/admin/reports/summary` | Defined aggregates per currency/time range |
| POST | `/admin/reports/exports` | Authorized async CSV/PDF export job/filter snapshot |
| GET | `/admin/reports/exports/:id` | Scoped job state and secure document link when ready |
| GET | `/admin/reviews` | Moderation queue; cannot create fake customer reviews |
| PATCH | `/admin/reviews/:id/moderation` | Publish/hide/reason; preserve author text/history |
| GET | `/admin/access` | Role defaults, registered permissions and safe user grants |
| PATCH | `/admin/access/users/:id` | Role/permission changes, reason/version/recent auth; last-Admin protection |
| GET | `/admin/settings` | Safe company/policy/integration readiness; no decrypted secrets |
| PATCH | `/admin/settings/company` | Versioned contacts/locales/download URLs/public defaults |
| POST | `/admin/settings/booking-policies` | New policy version and effective date |
| PATCH | `/admin/settings/notifications` | Channel policy/template selection; safe settings only |
| GET | `/admin/integrations/status` | Configured/disabled/healthy state; never secret values |
| GET | `/admin/audit` | Cursor/filter redacted audit events; read only |
| GET | `/admin/jobs` | Authorized failed document/delivery/export/reconciliation jobs |
| POST | `/admin/jobs/:id/retry` | Allowlisted job retry with idempotent processing and audit |

Business Admin cannot freely edit payment provider keys through a general JSON settings form. Secrets come from server configuration/secret management. The app may show readiness and approved non-secret settings. This does not prevent local integration setup through environment files.

### 8.8 Shared support, files and system endpoints

| Method | Path | Access and behavior |
| --- | --- | --- |
| POST | `/support/threads` | Customer own or staff-authorized new thread linked to scoped booking/request |
| GET | `/support/threads` | Own/customer-participant or staff queue |
| GET | `/support/threads/:id` | Authorized thread/messages, paginated |
| POST | `/support/threads/:id/messages` | Participant/staff message, explicit visibility, attachments/idempotency |
| PATCH | `/support/threads/:id` | Staff assign/resolve or owner close under allowed policy |
| POST | `/media/uploads` | Authorized purpose-specific upload ticket; size/MIME limits |
| POST | `/media/uploads/:id/finalize` | Verify object/checksum/type/ownership and set usable status |
| GET | `/documents/:id/download` | Recheck role/owner/grant; short-lived URL or authorized stream |
| POST | `/webhooks/payments/:provider` | Provider-specific raw-body/signature verification; no mobile bearer requirement |
| GET | `/health/live` | Process liveness, minimal public response |
| GET | `/health/ready` | DB/required dependency readiness; safe response, internal details in logs |
| GET | `/docs` | Swagger in local development; protected/disabled according to production configuration |
| POST | `/dev/payment-intents/:id/simulate` | Development/test only, mock provider only, owner scope; generate signed adapter event, not direct paid update |

Add `POST /auth/email-change/complete` for the single-use pending-email verification token. Completing it checks unique normalized email, updates the identity atomically and refreshes/revokes sessions according to policy. Standard email verification must not accidentally apply an unverified arbitrary email change.

The development endpoint must not be registered in a production build/configuration. It is not part of the production generated mobile UX. Test all environment guards, not merely a hidden button.

## 9. Representative API contracts

All IDs below are illustrative. A complete OpenAPI schema must define every field, nullable value and enum. Examples are business contracts, not a substitute for runtime validation.

### 9.1 Price preview

`POST /v1/pricing/previews`:

```json
{
  "packageId": "package_uuid",
  "startDate": "2026-11-04",
  "adults": 2,
  "children": [{ "ageYears": 10 }],
  "addOnIds": [],
  "currency": "USD"
}
```

Response `201`:

```json
{
  "data": {
    "id": "preview_uuid",
    "expiresAt": "2026-10-08T08:15:00Z",
    "packagePriceVersionId": "price_version_uuid",
    "policyVersionId": "policy_uuid",
    "startDate": "2026-11-04",
    "endDate": "2026-11-08",
    "currency": "USD",
    "lines": [
      { "label": "Adults", "quantity": 2, "unitAmountMinor": "125000", "totalMinor": "250000" },
      { "label": "Eligible child", "quantity": 1, "unitAmountMinor": "87500", "totalMinor": "87500" }
    ],
    "totalMinor": "337500",
    "depositMinor": "101250",
    "balanceAfterDepositMinor": "236250",
    "requiredPaymentPurpose": "DEPOSIT",
    "balanceDeadlineDate": "2026-10-28",
    "policySummary": "Development policy: 30% deposit; changes require staff review."
  },
  "meta": { "requestId": "req_preview" }
}
```

The actual response expiry is calculated from current server time. The client submits IDs/counts/selections, not unit rates or a requested lower total. A price preview is not a resource allocation or confirmation guarantee.

### 9.2 Create booking

`POST /v1/bookings` with `Idempotency-Key: <stable UUID>`:

```json
{
  "pricePreviewId": "preview_uuid",
  "travelers": [
    { "fullName": "Alice Morgan", "band": "ADULT", "isLead": true },
    { "fullName": "Daniel Morgan", "band": "ADULT", "isLead": false },
    { "fullName": "Jamie Morgan", "band": "CHILD", "ageYears": 10, "isLead": false }
  ],
  "pickup": { "label": "Arusha hotel", "address": "Hotel address supplied by customer" },
  "requirements": { "dietary": "Vegetarian meal for one traveler", "accessibility": "", "language": "en" },
  "acceptedPolicyVersionId": "policy_uuid"
}
```

Response includes `id`, generated `reference`, `status: REQUESTED`, `version`, safe travelers/pickup, price/policy summary, `paymentSummary`, current itinerary/document state and permitted `availableActions`. `availableActions` helps render UX but the command endpoint still rechecks permissions/conditions. Do not return internal supplier costs or CRM notes.

### 9.3 Payment intent

`POST /v1/bookings/:id/payment-intents` with idempotency key:

```json
{ "purpose": "DEPOSIT", "method": "MOCK_CHECKOUT", "returnPath": "/customer/payments" }
```

Response:

```json
{
  "data": {
    "id": "intent_uuid",
    "bookingId": "booking_uuid",
    "purpose": "DEPOSIT",
    "amount": { "currency": "USD", "minor": "101250" },
    "status": "PENDING",
    "provider": "mock",
    "nextAction": { "type": "DEVELOPMENT_CHECKOUT", "intentId": "intent_uuid" },
    "expiresAt": "2026-10-08T08:30:00Z"
  },
  "meta": { "requestId": "req_payment" }
}
```

Production `nextAction` is a documented provider checkout URL, SDK token or instructions returned by the adapter. Allowlist redirect/return destinations; never accept arbitrary URLs that expose tokens or permit an open redirect. `GET /payment-intents/:id` returns final/pending state and authorized receipt links after verified settlement.

### 9.4 Quote acceptance

`POST /v1/quotes/:id/accept`:

```json
{ "expectedVersion": 2, "acceptedPolicyVersionId": "policy_uuid" }
```

Response `201` returns the accepted quote ID, generated booking ID/reference, current booking version and payment action. Retry with the same key returns the same booking. Accepting a stale/superseded quote produces `409 QUOTE_SUPERSEDED`; an expired quote produces `409 QUOTE_EXPIRED`. Customer must view a new proposal and explicitly accept its updated terms.

### 9.5 Resource assignment

`POST /v1/trips/:id/assignments`:

```json
{
  "expectedVersion": 4,
  "guideId": "guide_uuid",
  "vehicleId": "vehicle_uuid",
  "pickupAt": "2026-11-04T04:00:00Z",
  "pickupTimezone": "Africa/Dar_es_Salaam",
  "note": "Meet the group at the confirmed hotel reception."
}
```

Response returns the new trip version, assignment ID, safe guide/vehicle summary and readiness checklist. Availability was rechecked transactionally; a previously visible option may correctly return `409 RESOURCE_UNAVAILABLE`. The app keeps entered choices, refetches availability and explains the conflict.

### 9.6 Guide progress and issue

`POST /v1/trips/:id/progress`:

```json
{ "expectedVersion": 5, "eventType": "STATUS_ADVANCE", "targetStatus": "EN_ROUTE_TO_PICKUP", "note": "Departed for pickup." }
```

`POST /v1/trips/:id/issues`:

```json
{
  "category": "DELAY",
  "severity": "MEDIUM",
  "description": "Road conditions may delay pickup by approximately 20 minutes.",
  "attachmentIds": [],
  "shareSummaryWithCustomer": true
}
```

Backend creates an internal issue and, when appropriate/allowed, a separate safe customer update. A guide's suggestion to share is not permission to publish sensitive internal detail. A user-editable reported timestamp does not override the server-created event time.

### 9.7 Guide response projection

```json
{
  "data": {
    "id": "trip_uuid",
    "reference": "TR-2026-001204",
    "status": "SCHEDULED",
    "version": 5,
    "travelerCount": 3,
    "leadContact": { "name": "Alice Morgan", "phone": "+15550000000" },
    "pickup": { "label": "Confirmed Arusha hotel", "at": "2026-11-04T04:00:00Z", "timezone": "Africa/Dar_es_Salaam" },
    "vehicle": { "id": "vehicle_uuid", "reference": "TZ001", "seats": 6 },
    "requirements": { "dietary": "Vegetarian meal for one traveler", "language": "en" },
    "availableActions": ["READ_ITINERARY", "ADVANCE_PROGRESS", "REPORT_ISSUE"]
  },
  "meta": { "requestId": "req_guide" }
}
```

No booking price, deposit, outstanding amount, refund, email/password data, unrelated trip or internal customer history belongs in this response.

### 9.8 Dashboard and report definitions

Admin/Operations overview responses include `range`, `timezone`, `generatedAt`, explicit count definitions and money aggregates grouped by currency. Define `grossCaptured`, `refundsSettled`, `netCaptured`, `contractedSales` and `outstandingBalance` separately. Do not label quoted value as revenue or combine USD/TZS numerically.

Lists and charts use actual scoped database aggregation, not random numbers. If no data exists, return zeros/empty buckets with valid labels. CSV columns are defined per report; escape delimiters, newlines and cells that could trigger spreadsheet formulas. Download requires the user's current report permission, even if it was granted when the export was created.

## 10. Payments, documents and background processing

### 10.1 Payment adapter interface

Implement one interface with `createIntent`, `queryStatus`, `verifyWebhook`, `normalizeEvent`, `requestRefund` and provider capability declarations. Maintain mock and real-provider implementations behind configuration. Do not assume a specific Tanzanian gateway, mobile-money network, card provider or exchange rate is already selected.

The development mock must perform real persistence and traverse the same normalized verified-event/ledger service as a live provider. It simulates success, failure, pending, expiry, duplicate event, delayed event, timeout and refund. Show “Development payment — no real money” in its checkout UI. This permits a complete local demonstration without live credentials.

A production adapter is enabled only after provider selection, official API verification, credentials and end-to-end provider sandbox tests. Unconfigured methods are absent/disabled with a useful explanation. Do not display successful card/mobile-money payment for an unimplemented integration. Local completion and live payment readiness are separate statuses in the final agent report.

### 10.2 Intent and settlement algorithm

1. Authenticate owner; lock booking; check status, policy, currency and balance.
2. Compute purpose amount server-side. Reserve that amount against other active intents so a second request cannot collect the same remaining balance concurrently. Reuse an appropriate pending intent or return `PAYMENT_ALREADY_PENDING` with its ID.
3. Persist intent/merchant key/idempotency record and required outbox state; commit before external network calls.
4. Call provider with a stable provider idempotency/merchant reference. Store returned safe checkout state. A timeout is uncertain/pending, not proof of failure; reconcile by reference.
5. Webhook handler obtains raw request bytes, verifies the actual provider's signature/time policy and resolves a known intent/merchant reference. Mock signature format exists only for the mock provider. Do not invent signature headers for an unselected live provider.
6. Deduplicate provider event, lock relevant intent/booking, verify amount/currency/reference and apply valid transition. A capture produces one immutable posting and updates derived totals. Insert audit/outbox rows in the same transaction.
7. Acknowledge verified provider events promptly after durable acceptance; process asynchronously where provider delivery timing requires it. Duplicate events return a successful acknowledgement without another posting.
8. Worker generates receipt and sends notifications. Client polls/refetches after checkout return; redirect text is not evidence of payment.

### 10.3 Payment edge cases

| Case | Required behavior |
| --- | --- |
| Customer taps Pay twice | Same idempotency/intent; one capture and one receipt |
| App closes during checkout | Reopen Payments, refetch intent/booking; server continues reconciliation |
| Provider timeout | Pending/unknown state and status check; no immediate retry charge with a new reference |
| Duplicate webhook | One posting, stable response |
| Failure arrives after success | Keep settled capture; record conflicting event, never downgrade paid funds |
| Success arrives after expiry/cancellation | Record genuine capture; flag/refund per authorized disposition, never silently drop money |
| Incorrect amount/currency | Quarantine as reconciliation exception; no automatic booking credit |
| Parallel full/deposit intents | Lock and reservation prevent accidental overcollection; late captures handled explicitly |
| Provider refund accepted but not settled | Refund pending; do not mark refunded until verified final event/status |
| Webhook missing | Reconciliation worker queries pending attempts by provider reference |
| Intent reservation expires | Query/reconcile unresolved provider state before treating uncertain funds as safely unreserved |

Never keep a database transaction open during a provider network call. Use durable states and compensating/reconciliation work, not distributed transaction claims.

### 10.4 Offline payments and refunds

Offline payment entry requires method, amount/currency, reference, evidence and submitter. A permitted verifier approves/rejects it. Approved entry uses the same ledger posting service with a unique reference; rejects produce history without funds. Do not give Operations an unrestricted “mark paid” switch.

Refund approval verifies the booking disposition, posting scope, currency and remaining refundable amount under lock, reserves pending refund funds, then calls the adapter outside the transaction. Local adapter settlement follows the verified event path. Failed/rejected refund releases reservations as appropriate; uncertain state is reconciled. Finance UI shows requested, approved, pending, settled and failed independently.

### 10.5 Document generation and access

- Itinerary PDF includes brand, booking reference, traveler-facing dates/timezone, approved day plan, inclusions, pickup and company support contact. It excludes internal supplier costs and staff notes.
- Receipt PDF includes real posted payment reference, booking/customer reference, currency/amount, date and payment purpose. A pending intent cannot produce a paid receipt. Label demo receipts accordingly in local mode.
- Quotation PDF uses an immutable sent quote version, expiry and terms, and is visibly a quotation rather than a receipt.
- Document records begin `QUEUED`, become `READY` or `FAILED`, and expose generation status. Retry is idempotent by document type/source version; old versions remain distinguishable.
- Store customer documents privately. Authorize download at request time and use a short-lived signed URL (initially 60–300 seconds) or authenticated stream with correct content disposition.
- Guide download scope is the assigned operational itinerary only. A guide must not download customer receipts or unrelated documents by guessing their IDs.
- Development local-file storage must never expose the private directory as a public static folder. S3 production implementation uses private buckets/keys and scoped signed operations.

### 10.6 Uploads and media

Create purpose-scoped upload tickets for Admin public catalog media, guide issue photos and private support evidence. Validate maximum size (initially 10 MB images, 15 MB permitted PDFs), actual MIME/signature, image dimensions, ownership and target scope at finalize. Generate random keys; never trust user filenames as paths.

Only finalized media can be referenced in a business command. Public catalog media uses an approved public projection; issue/support/customer documents remain private. Keep license/credit metadata for supplied photography. Strip unnecessary location/EXIF data from user photos where practical. Add an explicit malware-scanning adapter before enabling untrusted document upload in production; report readiness honestly.

### 10.7 Outbox, worker and job behavior

Business transaction writes an outbox row. Dispatcher locks/claims pending rows, enqueues with a stable event/job ID, and records dispatch. Consumers are idempotent because dispatch/processing can happen more than once. Retain delivery/document state in PostgreSQL; Redis loss must not erase the business event.

Use bounded retries with exponential backoff and jitter, a terminal failed state, safe error messages and Admin retry visibility. Separate urgent operational notifications from bulk exports. Avoid unlimited retries or a failed email blocking booking confirmation. Worker crash after processing but before acknowledgement must not produce duplicate financial postings or identical repeated documents.

Required jobs: outbox dispatch, pending payment reconciliation, quote expiry, payment-intent expiry/reconciliation, receipt/quote/itinerary PDF generation, email delivery, push delivery, export generation and allowed retention/cleanup. Scheduled jobs record runs and lock against duplicate workers.

### 10.8 Notification channels

Always create appropriate in-app notifications. Local email uses Mailpit with working invitation/verification/reset/quote/booking/document templates. Production email has a configured provider/sender and an honest readiness flag.

Push uses registered device tokens associated with the authenticated user/session. Store token refresh/deactivation, handle invalid tokens and use provider receipts where supported. Payload contains a safe resource ID and generic summary; opening the deep link performs a new authorized API read. Do not put traveler passports, finance details, private notes or access tokens in push payloads.

A support message is created locally as a server record; delivery to a channel is a separate tracked result. The UX distinguishes saved, queued and failed delivery. It never claims an email/WhatsApp message was sent solely because a button was clicked. WhatsApp/SMS integrations are disabled until actually configured; ordinary phone/email contact links may still open the user's installed apps.

## 11. Mobile navigation and shared UX

### 11.1 Application shell

Build one branded native app. Startup restores a session safely, resolves `/me`, then routes to the user's permitted context. While restoration runs, show a short branded splash/loading state without displaying another user's cached screen. Visitors can browse public catalog; registration/login is required for private actions. A staff account uses the same login form as a customer; a public role selector is never authentication.

Use Expo Router route groups for layout organization and explicit role path segments for unambiguous deep links. Example organization:

```text
app/
  index.tsx                         Bootstrap/session routing
  (auth)/
    login.tsx
    register.tsx
    verify-email.tsx
    forgot-password.tsx
    reset-password.tsx
    accept-invitation.tsx
  (public)/
    discover/index.tsx
    discover/packages/[slug].tsx
  (protected)/
    customer/
      (tabs)/explore.tsx
      (tabs)/my-trips.tsx
      (tabs)/custom.tsx
      (tabs)/payments.tsx
      packages/[slug].tsx
      bookings/new.tsx
      bookings/[id]/index.tsx
      bookings/[id]/payment.tsx
      requests/[id]/index.tsx
      quotes/[id].tsx
    operations/
      (tabs)/today.tsx
      (tabs)/requests.tsx
      (tabs)/bookings.tsx
      (tabs)/trips.tsx
      inquiries/[id].tsx
      quotes/[id]/edit.tsx
      bookings/[id]/index.tsx
      trips/[id]/prepare.tsx
      trips/[id]/monitor.tsx
    guide/
      (tabs)/my-trips.tsx
      (tabs)/itinerary.tsx
      (tabs)/progress.tsx
      (tabs)/support.tsx
      trips/[id]/pickup.tsx
      trips/[id]/issue.tsx
      trips/[id]/handover.tsx
    admin/
      (tabs)/overview.tsx
      (tabs)/bookings.tsx
      (tabs)/finance.tsx
      (tabs)/settings.tsx
      packages/[id]/edit.tsx
      fleet/index.tsx
      staff/index.tsx
      access/index.tsx
      audit/index.tsx
    account/index.tsx
    notifications/index.tsx
    support/[id].tsx
    documents/[id].tsx
```

Expand routes as the supporting inventory requires. Group names in parentheses organize layouts; they are not URL segments. Explicit `customer`, `operations`, `guide` and `admin` segments avoid ambiguous paths. Protected layouts check session and grants, but every backend API independently enforces them.

### 11.2 Bottom navigation

| Role | Tabs | Secondary access |
| --- | --- | --- |
| Customer | Explore, My Trips, Custom, Payments | Header profile, notifications, saved experiences and support |
| Operations | Today, Requests, Bookings, Trips | Customer search, reports if granted, account/notifications |
| Driver/Guide | My Trips, Itinerary, Progress, Support | Current trip picker, profile/notifications |
| Admin | Overview, Bookings, Finance, Settings | Catalog, Fleet & Team, Reports, Access & Audit entry cards |

The six core screens are six functional journey areas, not six fixed screens that prohibit details/editors. Admin Catalog and Fleet are accessible from Overview/Settings shortcuts. Guide Itinerary/Progress uses a clearly selected assigned trip; with no selection, show a trip picker, not stale previous-customer data.

### 11.3 Shared components

Create `BrandHeader`, `Screen`, `ScreenTitle`, `PrimaryButton`, `SecondaryButton`, `IconButton`, `FormField`, `SelectField`, `DateField`, `TravelerCounter`, `MoneyText`, `StatusChip`, `PhotoCard`, `SectionCard`, `Timeline`, `ItineraryAccordion`, `EmptyState`, `InlineError`, `Skeleton`, `ConfirmationSheet`, `DocumentRow`, `PermissionGate` and `UnsavedChangesGuard`.

Components accept accessible labels and loading/disabled states. `PermissionGate` helps UX only; do not treat it as security. `MoneyText` uses the currency exponent and locale. Status chips include text/icon, not color alone. Do not put business mutations inside a generic visual component; use typed feature hooks.

### 11.4 Server state and local state

- Generated SDK has one configured API base URL, request ID handling, auth/context headers and typed errors.
- Query keys include user identity and role context for private resources. Example: `['booking', userId, roleContext, bookingId]`.
- Clear private query caches, drafts and device association on logout/account change. Never leak one staff/customer's data to another after switching accounts.
- Use TanStack Query network/focus integration, bounded retry for safe reads, and invalidation after successful commands. Do not automatically retry non-idempotent mutations with a fresh key.
- Save idempotency keys per pending action until resolved. After timeout, fetch the action/resource state before asking the user to submit again.
- Optimistic updates may be used for favorites/read flags. Payment, quote acceptance, assignment, confirmation, refund and trip completion wait for authoritative API outcomes.
- Draft form state can remain local with a user-specific key; show unsaved changes. Never persist secret/card details or unnecessary traveler information without a defined purpose.
- Offline baseline: cached permitted reads, visible “Last updated” and offline banner; server-dependent commands are unavailable with an explanation. Do not invent offline successful progress/payment. Full offline mutation synchronization is a later extension.

### 11.5 Common screen acceptance

Every screen has meaningful loading, empty, error, unauthenticated, forbidden and refresh behavior. A pending action disables duplicate submission and exposes a concise label. Preserve user input on validation/network failure. Field errors appear beside the relevant fields, while conflict errors offer refetch/review. Deep links validate permission and resource scope before rendering sensitive data.

Every primary action navigates or performs a real operation. Do not leave “Save,” “Publish,” “Assign,” “Download,” “Report” or “Send” connected only to a toast. Hidden/unconfigured integrations have truthful availability labels.

## 12. Customer: six core screens

### C01 — Explore

**Route:** `/customer/explore`; public equivalent `/discover`.  
**Goal:** Find a suitable Tanzania experience and understand its starting price/duration.

**Layout:** Warm paper background, logo/greeting, search field, compact category chips, cinematic featured card, destination cards, package cards and saved shortcut. Preserve editorial Playfair headings and photography; use readable Manrope/DM Sans for controls. Cards show title, destination, duration, accurately qualified “from” price/currency and a favorite control.

**Inputs/actions:** Debounced bounded search; category/destination/duration filters; clear filters; open package/destination; save/unsave. Guest saving prompts login with return navigation rather than discarding the current package. Filtered results retain the filter state when returning from details.

**API:** `GET /public/packages`, `/public/destinations`, `/public/services`; `GET /me/favorites`; `PUT/DELETE /me/favorites/:targetType/:targetId`.

**States:** Photo/card skeleton; no results with reset action; network retry; archived favorite labeled unavailable with a related-experience path. Public content is usable without login. Avoid false scarcity labels or randomly generated reviews.

**Acceptance:** Search/filter affects actual API results; saved state survives restart/login; selecting a card opens the selected package ID/slug, not one shared hardcoded safari.

### C02 — Safari Details

**Route:** `/customer/packages/:slug`.  
**Goal:** Review the actual itinerary, inclusion and conditions before planning.

**Layout:** Gallery with photo credit access, back/favorite controls within safe area, duration/destination chips, title, introduction, expandable day plan, inclusions/exclusions, good-to-know, terms/contact and a bottom booking action. Use rounded white sections with restrained orange accents. Sticky action stays above device navigation and never obscures scroll content.

**Inputs/actions:** Gallery swiping, day accordion, related destination, “Plan this safari,” support contact, favorite. A package marked request-only uses “Request this experience”; a genuinely unavailable package does not pretend to accept a booking.

**API:** `GET /public/packages/:slug`, optional departures; favorites endpoints. Display public “from” rates as estimates until the price preview resolves the selected dates/group.

**States:** Loading/404/archived unavailable; missing photo fallback; gallery remains accessible by screen reader. All sections are internally scrollable in a normal native screen.

**Acceptance:** Day details and gallery belong to this package; login interruption returns to planning; labels distinguish illustrative seed pricing from approved production rates through environment/content settings.

### C03 — Plan Trip

**Route:** `/customer/bookings/new?packageId=...`.  
**Goal:** Enter validated requirements and review a server-priced booking request.

**Layout:** Step indicator `Dates & group → Travelers & pickup → Review`, selected package summary, date/departure control, adult/child counters and eligibility, traveler rows, pickup field, requirements, available add-ons, server price lines and policy acceptance. The current total/deposit is visually clear without turning the whole screen into a long unstructured form.

**Inputs/actions:** At least one adult; bounded child counts with necessary age data; lead traveler defaults from profile; add/edit traveler rows; date and pickup; dietary/accessibility/language; preview/review; agree to displayed policy; submit booking. No guide/vehicle selection or client price edit.

**API:** `POST /pricing/previews`, then `POST /bookings`. Re-preview when a price-affecting selection changes. Submit exact preview/policy IDs and traveler data with one idempotency key.

**States:** Inline field errors, preview loading/stale/expired, rate changed with explicit review, email verification needed, capacity/request availability message and creation pending. Returning from a failed attempt retains entries. No payment collected before a durable booking exists.

**Acceptance:** Totals/deposit come from backend, child counts and traveler rows reconcile, duplicate taps create one booking, and the next screen contains the newly created booking reference/status.

### C04 — Payment / Balance

**Route:** `/customer/bookings/:id/payment`; Payments tab lists own history.  
**Goal:** Pay the appropriate amount and understand verified settlement.

**Layout:** Booking reference, status, currency/contract total, already captured/refunded, required deposit or full/balance due, enabled method cards, terms, “Pay [server amount],” pending/result section and receipt rows. Never display raw card input unless an actual compliant provider component supplies it; baseline opens provider checkout.

**Inputs/actions:** Choose allowed deposit/full/balance purpose and enabled method; initiate checkout; return/refetch; retry only a definitively failed attempt; view/download a ready receipt; contact support for uncertain state. Development mock has an explicitly labeled test checkout with success/failure/pending cases.

**API:** `GET /bookings/:id/payment-summary`, `POST /bookings/:id/payment-intents`, `GET /payment-intents/:id`, own payments/receipts and authorized document download.

**States:** Unpaid, payment initiation, checkout opened, pending verification, verified success, failed, expired, already paid, refund pending/settled and reconciliation required. A provider redirect saying “success” still shows verification pending until the server confirms capture.

**Acceptance:** Pay never directly edits financial totals; refreshing/reopening shows the same intent; duplicate event yields one receipt; balance reflects settled funds and approved adjustments; customer cannot pay/view another booking.

### C05 — My Safari / My Trips

**Route:** `/customer/my-trips` and `/customer/bookings/:id`.  
**Goal:** See the real booking stage and travel-ready information.

**Layout:** Upcoming/active/completed filters, trip card and detail header, booking/payment status, pickup time with timezone, assigned guide contact when approved, vehicle summary where appropriate, published itinerary accordion, customer-safe progress timeline, document section, support and change-request actions. A requested booking shows “Awaiting review,” not a fake assigned guide.

**Inputs/actions:** Select a trip; refresh; open itinerary/PDF; contact assigned guide/Operations; pay remaining balance; request reschedule/cancellation; open support thread; submit review only after completion. Do not let the customer advance progress or mark a booking confirmed.

**API:** Scoped `GET /bookings`, booking detail/itinerary/timeline/documents/payment summary, customer trips, `POST /bookings/:id/change-requests`, review and support endpoints.

**States:** No bookings with Explore action; awaiting payment/review/assignment; active/manual updates; cancelled/declined with decision/refund state; completed with review CTA. Pull-to-refresh and visible last-updated time make eventual updates clear.

**Acceptance:** Operations assignment/update and guide progress appear on this same booking; internal notes never appear; published itinerary changes show its version/date; cancelled trip accurately distinguishes refund pending from settled.

### C06 — Tailor-made

**Route:** `/customer/custom` and `/customer/requests/:id`.  
**Goal:** Request a custom safari/service and turn an accepted proposal into a booking.

**Layout:** Intro, destination/service selector, date/flexibility, group counts, travel style, budget/currency and notes; request submission summary; own request list/status; proposal view with day plan, inclusions, price lines, expiry, terms and version history.

**Inputs/actions:** Submit requirements, view staff questions, reply via thread, request revision with reason, reject proposal, accept current quote and continue to booking/payment. Keep budget separate from proposed sell price. Transfer/rental inquiries adapt fields to pickup/drop-off/service requirements without pretending to use a safari day plan unnecessarily.

**API:** Custom-request endpoints, quote list/detail/revision/accept/reject, support thread and generated booking detail/payment.

**States:** Draft/submitting, submitted/in review, awaiting proposal, proposal received, revision requested, expired/superseded, accepted with linked booking, closed. No fake instant quote for an unconfigured pricing engine.

**Acceptance:** Operations sees the same submitted requirements; send freezes a specific version; accepting twice creates one booking; stale proposal cannot be accepted silently; accepted price and itinerary match the selected version.

## 13. Operations: six core screens

### O01 — Today / Action Queue

**Route:** `/operations/today`.  
**Goal:** Identify work that needs action and today's travel commitments.

**Layout:** Date/timezone, small scoped metric cards, priority queue for new inquiry/pending quote/payment-ready booking/unassigned confirmed trip/open issue, arrivals/departures, active trip list and customer search shortcut. Use actual status counts and concise cards with named next action.

**Actions:** Filter date/owner/status, open inquiry/booking/trip/issue, create manual inquiry or customer, pull-to-refresh. Financial overview appears only when granted and remains clearly distinguished from operational counts.

**API:** `/ops/overview`, scoped inquiries/bookings/trips/issues and allowed report summaries.

**States/permissions:** Empty work queue is useful, not an error; network failure preserves last refresh time; permission changes remove forbidden shortcuts after `/me` refetch. Only operationally authorized records appear.

**Acceptance:** A real customer/custom submission adds work; verified payment updates confirmation readiness; reported guide issue enters the queue with a safe severity indicator.

### O02 — Inquiry & Customer

**Route:** `/operations/inquiries/:id`, request/customer detail subroutes.  
**Goal:** Understand requirements and maintain operational customer context.

**Layout:** Contact/source/assigned staff, request status, destinations/date/group/budget/style, related bookings, customer-visible thread, separate clearly labeled internal notes, activity history and “Prepare quotation”/convert action. Keep contact editing in a compact sheet/editor with version checks.

**Actions:** Assign request owner, add internal note, ask a customer question via support thread, create/link customer, send claim invitation, correct contact, convert manual inquiry into custom request or standard booking process. Additional travelers appear under a booking, not as staff/customer role grants.

**API:** `/ops/inquiries`, `/ops/customers`, inquiry convert/notes/invite, custom-request detail/assign and support endpoints.

**States/permissions:** Missing customer account still supports an operational lead; invitation status is visible; sent/queued delivery states are separate. Operations cannot see passwords/tokens or change role grants.

**Acceptance:** Internal note stays invisible to Customer; message appears only in authorized thread; converted inquiry retains linkage; invitation lets the correct customer claim their existing records without a duplicate identity.

### O03 — Itinerary & Quotation

**Route:** `/operations/quotes/:id/edit`, request proposal editor, itinerary editor.  
**Goal:** Create a complete, reviewable, versioned offer.

**Layout:** Customer/request summary, draft/version chip, ordered day cards with title/activity/accommodation, inclusion/exclusion sections, sell line-item editor, currency/tax/add-ons, expiry/policy, preview and fixed save/send actions. Supplier/internal costs, if captured, live in a separately protected section.

**Actions:** Add/reorder days/activities, edit allowed fields, save draft, preview customer projection/PDF, send validated proposal, create revision from sent version, publish final itinerary on a booking. Totals are recomputed by backend; don't permit an arbitrary client total that disagrees with lines.

**API:** Quote create/patch/send, itinerary-version create/patch/publish, documents and request history.

**States/permissions:** Unsaved changes guard, draft save pending, validation errors, conflict recovery, immutable sent view, superseded/accepted state. Sent offer cannot be changed by ordinary PATCH.

**Acceptance:** Sending creates an immutable exact customer proposal; new revision retains the prior one; customer accept converts the current proposal only; final itinerary document references the published version.

### O04 — Booking Desk

**Route:** `/operations/bookings` and `/operations/bookings/:id`.  
**Goal:** Review and confirm requests with clear business conditions.

**Layout:** Search/status/date filters, booking/customer/traveler detail, source package/accepted quote, read-only price/payment summary, unmet confirmation checklist, itinerary status, customer requirements, change-request panel and audit timeline.

**Actions:** Create manual booking through preview; edit eligible operational traveler/pickup details; confirm; decline with reason/disposition; approve/reject reschedule/cancel request; open preparation; add internal note. Confirmation explanation must say which condition remains unmet.

**API:** Scoped booking read, manual preview/create, traveler/pickup edit, confirmation/decline, change-request review, itinerary and notes endpoints.

**States/permissions:** Waiting for deposit/verification; ready to confirm; version conflict; cancelled/declined read-only history; finance totals shown without ability to edit captured values. Refund settlement and access administration remain prohibited by default.

**Acceptance:** An unpaid request cannot be confirmed without explicit permitted override; confirmation creates one trip; staff date changes revalidate resources and money; completed payment history remains immutable.

### O05 — Trip Preparation

**Route:** `/operations/trips/:id/prepare`.  
**Goal:** Produce a feasible allocation and complete travel readiness.

**Layout:** Trip date/window/traveler count, published itinerary, pickup/timezone, available vehicles with capacity/status, capable available guides, required checklist (itinerary, pickup, accommodation/requirements, customer final notice), notes and assignment summary/history.

**Actions:** Query availability; select guide/vehicle; assign atomically; set pickup; check preparation items; view requirements; reassign with reason; send explicit final customer update. A maintenance marker immediately prevents unsafe new availability choices.

**API:** `/resources/availability`, trip detail, assignments, preparation, customer updates and published itinerary.

**States/permissions:** No suitable resource, maintenance/leave conflicts, stale availability, missing checklist items, successful assignment, reassignment pending. Preserve selected fields after conflict and allow staff to choose alternatives.

**Acceptance:** Two competing assignment commands cannot overlap one resource; too-small vehicle fails; assigned guide gets this trip; previous guide loses private access; customer receives only approved travel details.

### O06 — Trip Monitor

**Route:** `/operations/trips/:id/monitor`.  
**Goal:** Follow execution and resolve exceptions.

**Layout:** Trip/guide/vehicle header, current manual phase, chronological events with author/time, day/activity context, open issue cards/severity, customer update composer, handover/completion section and last-updated status. Do not show a moving map without actual location telemetry.

**Actions:** Refresh/select active trip, open/triage/resolve issue, contact assigned guide, publish customer-safe update, make reasoned progress correction/termination, inspect handover. Normal progress remains the assigned guide's responsibility.

**API:** Trips/events/issues, issue PATCH, customer update and progress-correction endpoints, support.

**States/permissions:** Scheduled/unassigned, active, delayed/issue, completed/cancelled, offline stale data. Corrections show who changed what and why.

**Acceptance:** Guide event appears in this monitor; internal incident detail stays private; customer notice is separately visible; completion summary comes from the actual handover, not sample text.

## 14. Driver / Guide: six core screens

### D01 — My Assigned Trips

**Route:** `/guide/my-trips`.  
**Goal:** See only allocated work and the next required action.

**Layout:** Greeting/date, today/upcoming/completed filters, assigned trip cards with destination/date/traveler count/pickup/vehicle/status, selected-current-trip indicator. Avoid revenue, price/deposit or global booking counts.

**Actions:** Open assigned trip/pickup; select current itinerary/progress context; refresh; contact Operations. Completed view follows configured retention/access window rather than showing all historic customer data forever.

**API:** `/guide/overview`, scoped `/trips` with guide role context.

**States:** No assignments with Operations contact; loading; offline cached list clearly stale; reassigned trip removed after refresh. A copied link to an unassigned trip shows unavailable, not its details.

**Acceptance:** Assigned trip appears after Operations allocation; another guide/account cannot retrieve it; no finance fields exist in the response or screen.

### D02 — Pickup & Travelers

**Route:** `/guide/trips/:id/pickup`.  
**Goal:** Collect the correct group with necessary instructions.

**Layout:** Pickup place/time/timezone, approved map action, lead contact/call button, traveler names/count, dietary/accessibility/language requirements, assigned vehicle/seats, emergency/Operations contact and first progress action.

**Actions:** Open installed maps only from actual approved coordinates/address; call lead/Operations; view travelers; go to Progress. No editing customer account, billing or traveler counts.

**API:** Trip guide projection, `/trips/:id/travelers` and approved itinerary/pickup.

**States:** Pickup not finalized; contact unavailable; map app unavailable with copy-address alternative; assignment removed. Display only the relevant contact and requirements.

**Acceptance:** Pickup matches published preparation; guide sees the minimum needed names/requirements and cannot access receipt/profile history; map is user-triggered without background tracking.

### D03 — Route / Itinerary

**Route:** `/guide/itinerary` with current trip; `/guide/trips/:id/itinerary`.  
**Goal:** Follow the approved day plan and operational instructions.

**Layout:** Current trip/day selector, day timeline, ordered activity/location cards, timing/accommodation, relevant guide notes, published-version indicator and approved itinerary download. Use a readable light surface, compact photo header and clear activity state.

**Actions:** Expand day/activity, open known location in maps, read operational note, download permitted guide itinerary, move to related activity progress. Do not change pricing or silently edit the approved schedule.

**API:** `/trips/:id/itinerary`, scoped documents/download.

**States:** No selected trip → assigned trip picker; no published itinerary → preparation notice; new itinerary version → update banner; offline read-only with last updated.

**Acceptance:** Itinerary corresponds to the current assigned trip/version; customer and guide views share approved plan while private guide notes remain absent from customer DTOs; no invented live route polyline.

### D04 — Progress

**Route:** `/guide/progress` and selected trip progress detail.  
**Goal:** Submit accurate manual stage/activity updates.

**Layout:** Clear current state, seven-stage visual sequence, large next-action button, optional concise note, activity check-in action, event history, report-issue shortcut and connectivity state. The seven stages follow section 7.4.

**Actions:** Confirm next stage in a sheet, submit version/idempotency, record allowed activity event, report delay, navigate to handover for final completion. No unrestricted dropdown jumping to any state.

**API:** `/trips/:id/events`, `POST /trips/:id/progress`.

**States:** Submitting disables duplicate action; already advanced conflict prompts refetch; invalid transition has clear explanation; offline cannot claim success; final action leads to handover requirements.

**Acceptance:** Duplicate progress creates one event; unassigned guide is denied even with a correct ID; sequence cannot be skipped; Operations and Customer receive the correctly projected update.

### D05 — Issue Report

**Route:** `/guide/trips/:id/issue`; Support tab includes assigned issues and Operations contact.  
**Goal:** Notify Operations of an actual trip exception.

**Layout:** Categories delay, vehicle, customer no-show, medical/safety, weather/route, other; severity; text; optional photo attachment; contact options; share-summary suggestion and submit/status. Place urgent contact guidance visibly without inventing emergency numbers from memory.

**Actions:** Validate and submit issue, upload permitted evidence, call configured emergency/Operations contacts, inspect submitted issue status and staff response. Device calling/messaging is initiated by user action and is separate from app-record submission.

**API:** Purpose-scoped media upload/finalize; `POST /trips/:id/issues`; scoped issues/support thread.

**States:** Attachment upload pending/fail/retry, issue submitting/saved, staff acknowledged/resolved, offline unsent draft. A submit acknowledgement means recorded, not proof that external emergency help has arrived.

**Acceptance:** Operations sees a durable issue with reporter/trip/time; customer receives only approved safe summary; guide cannot attach another user's private media or report against an unassigned trip.

### D06 — Completion / Handover

**Route:** `/guide/trips/:id/handover`.  
**Goal:** Close the actual trip with required operational evidence.

**Layout:** Trip summary, return/current phase, required completion checklist, traveler drop-off confirmation, vehicle/incident notes, optional approved photos and “Submit handover & complete” confirmation. Keep money/refund fields absent.

**Actions:** Complete checklist, provide notes, acknowledge open issues if permitted, submit idempotent handover, see completion reference/history. Corrections are addenda or staff review, not editing away the original event.

**API:** Trip/events/issues and `POST /trips/:id/handover`.

**States:** Wrong phase or missing checklist blocks action; pending submission; completed read-only summary; offline draft; conflict/refetch. Financial arrears do not appear to the guide or prevent reporting a physical completion.

**Acceptance:** Handover completes trip/booking once, retains unresolved issue visibility, enables the owning customer's review, and is readable by Operations/Admin with actual author/time.

## 15. Admin: six core screens

### A01 — Business Overview

**Route:** `/admin/overview`.  
**Goal:** Understand real business volume, finance and exceptions.

**Layout:** Date range/timezone/currency filters, booking/request counts, contracted value vs captured/refunded/net totals, upcoming/active trips, simple chart, outstanding actions and shortcuts to Catalog/Fleet/Team/Reports/Access. Use a compact dark header with warm cards rather than a dense desktop dashboard squeezed into a phone.

**Actions:** Change filters, drill into aggregate list, open urgent exception, navigate to management areas, refresh. Chart has an accessible text/table equivalent.

**API:** `/admin/overview`, report summary and scoped operational queues.

**States:** Empty valid business data → zeros; loading skeleton; partial job/provider exception indicator; no random seeded chart after seeds are removed. Currency totals are never mixed.

**Acceptance:** Metrics reconcile with actual database postings and stated definitions; filters affect both graph/list; no customer/guide account can retrieve this endpoint.

### A02 — Bookings & Customers

**Route:** `/admin/bookings`, booking/customer detail.  
**Goal:** Inspect company-wide records and authorize business decisions.

**Layout:** Search/date/status/source filters, booking detail with customer/travelers/accepted price/policy, itinerary, payment/refund history, assignment, change requests, communication and safe audit. Customer detail shows associated bookings and contact/preferences, never passwords.

**Actions:** Use staff-create booking/customer workflows; review/confirm/change/decline under the same invariants; approve reasoned override only through dedicated policy; link to finance/preparation; add audited correction note. Archived/completed records preserve history.

**API:** Authorized booking/CRM/itinerary/change endpoints plus finance/audit projection as granted.

**States:** Conflict/unmet conditions; claimed vs unclaimed customer; cancelled/declined financial disposition; no permission/identity secret display.

**Acceptance:** Business view shares actual customer/Operations records; override cannot erase captured payment history; additional travelers never become accidental accounts; audit identifies Admin's actual action.

### A03 — Experiences & Content

**Route:** `/admin/packages` and catalog/content editor subroutes.  
**Goal:** Manage the complete public offering and branded landing content.

**Layout:** Packages/Destinations/Services/Landing subnavigation; status/search list; full editor for localized title/slug/copy, gallery/credit, duration/destinations, inclusion/exclusion, good-to-know, itinerary template, rate versions and publish checks. Landing editor uses typed hero/story/service/content blocks, not arbitrary scripts.

**Actions:** Create draft, edit/save, upload/finalize photo, add itinerary days, create price version, preview public projection, publish, archive. Manage fixed departures/capacity if enabled. Show current published vs draft revision distinctly.

**API:** All `/admin/packages`, destinations, services, landing, prices/publish/archive and media endpoints; public GET verifies result.

**States:** Incomplete publish checklist; upload pending; validation/conflict; archived referenced record; missing translation fallback; active bookings preserve old prices.

**Acceptance:** Publishing changes public catalog/landing data; unpublished drafts are invisible to guests; price update changes future previews and leaves existing booking snapshots intact; archive does not delete trip history.

### A04 — Fleet & Team

**Route:** `/admin/fleet` and `/admin/staff`.  
**Goal:** Maintain usable resources and staff identities.

**Layout:** Fleet/Team tabs; vehicle photo/reference/seats/capability/status, allocation/maintenance calendar/list; staff role/capability/language/status, availability, assigned upcoming trips and invitation state. On mobile use list/detail editors, not a horizontally overflowing spreadsheet.

**Actions:** Add/edit vehicle; create/release maintenance block; retire safely; invite staff; edit profile/capabilities; record leave/availability; suspend/reactivate with impact review; open allocation conflict; navigate to Access for actual role grants.

**API:** Fleet, maintenance, staff/invite/availability/suspension endpoints and resource availability.

**States:** Conflict with future trip; invitation pending/expired/retry; suspended staff with unresolved assignment review; maintenance resource removed from new availability. A toggle cannot silently strand an active group.

**Acceptance:** Maintenance interval conflicts are caught; suspended guide can't log in/update trips; role invitation is audited and accepted by that staff member; fleet state drives actual Operations allocation choices.

### A05 — Payments & Reports

**Route:** `/admin/finance` and finance/report details.  
**Goal:** Review genuine financial postings, refund decisions and reports.

**Layout:** Currency/range/state filters, captures/refunds/net/outstanding summaries, read-only payment list/history, reconciliation exceptions, offline-entry verification, refund request/approval sheet, receipt/download and export jobs. Present pending attempts separately from settled money.

**Actions:** Inspect records, record offline evidence if granted, verify with reason, request/approve/reject refund with reauthentication, create allowed report export, download ready private artifact, inspect reconciliation jobs. No amount/status edit on a settled capture.

**API:** Admin payments/offline/refunds/reports/export/documents/jobs and safe integration status.

**States:** Refund cap conflict; provider disabled/pending/failure; reauth needed; export queued/ready/failed; reconciliation required; permission revoked before download. Do not mark a refund complete when the provider merely accepts the request.

**Acceptance:** Duplicate approval settles once; excess refund rejected; CSV/PDF totals reconcile by currency; Operations without finance grant cannot read finance reports; receipt references an actual capture posting.

### A06 — Access & Settings

**Route:** `/admin/settings`, access/audit/settings details.  
**Goal:** Govern the business configuration and inspect sensitive actions.

**Layout:** Company contact/download URLs/locales, booking-policy version history, safe notification settings, integration readiness cards, role/permission registry, user grant editor, audit filters and failed-job/retry area. Secrets show only configured/disabled state.

**Actions:** Save versioned settings, add policy version, change granted role/permission with reason and reauthentication, inspect audit, retry allowlisted job, test local notification through an explicit internal development target. Never expose “delete audit” or plaintext integration-key fields.

**API:** Admin settings/company/policies/notifications, access, integrations status, audit and job endpoints.

**States:** Validation/conflict; last-Admin protection; grant revoked while editing; secret/provider missing; delivery job failure; historical policy read-only. Download URLs must be valid approved HTTPS store links.

**Acceptance:** Permission changes affect server access immediately; last Admin cannot be removed; public settings projection excludes secrets; policy update affects future bookings while old policy remains attached to existing ones.

## 16. Complete supporting screen inventory

The 24 core screens are not the total page count. Implement these supporting flows so each core screen can complete its responsibilities. Reuse list/detail/editor patterns without reducing functionality.

| Area | Required supporting views | Essential behavior |
| --- | --- | --- |
| Shared identity | Splash/session restore, login, customer registration, verification, forgot/reset password, invitation acceptance, email-change verification, sensitive-action reauthentication | Valid token lifecycle, return navigation, generic reset response, safe invalid/expired link recovery |
| Shared account | Profile editor, locale, notification preferences, permitted role context picker, device/session list, password change, logout/all sessions | Server-granted roles only; clear private caches on account change |
| Shared notifications | List, unread filter, notification detail/deep link | Ownership, read state, resource scope rechecked |
| Shared documents | Private viewer/download, generation pending/fail state, version history where relevant | Authenticated download, no public receipt URLs |
| Shared support | Thread list, thread detail/message composer, attachment preview, staff assign/resolve | Distinct internal notes/customer-visible messages; delivery status honest |
| Customer discovery | Destination detail, filtered package list, gallery, saved list | Published data only; usable empty/archive states |
| Customer booking | Traveler editor, pickup editor, review summary, checkout return, payment detail/history, receipt, change-request form/history | Server pricing/policy; own records; no direct confirmed/paid controls |
| Customer custom | Request detail/edit where allowed, sent quote detail/history, revision request, rejection, acceptance result | Latest quote/version and exact terms; one generated booking |
| Customer after-trip | Review form/edit and completed itinerary | Completion eligibility, actual author; no generated testimonial |
| Operations CRM | Customer list/detail/create/edit/invite, manual inquiry editor, inquiry conversion | Claim flow and origin history; no staff-created customer password |
| Operations proposals | Quote line editor, day/activity editor, reorder, customer preview, revision history, sent PDF | Draft vs immutable sent state; accurate totals |
| Operations booking | Manual booking wizard, confirmation checklist, decline/disposition, change decision, internal notes/history | Same policy/finance/resource rules as customer-created bookings |
| Operations resources | Availability selection, guide/vehicle detail summary, reassignment history, preparation checklist | Atomic allocations and conflict recovery |
| Operations monitoring | Active list, issue detail/triage, update composer, correction reason, handover detail | Visibility controls, append-only events |
| Guide context | Assigned trip picker, pickup/traveler list, itinerary days/activity, stage confirmation | Assigned scope, safe current-trip context |
| Guide exceptions | Issue form/photo, issue detail/response, handover checklist/result | Real persisted issue and completion, no finance access |
| Admin catalog | Package create/edit, itinerary template, price-version editor, departure/capacity editor if enabled, destination/service editors, landing block editor, publish checklist | Full CRUD/archive/publish, localized content and media attribution |
| Admin fleet/team | Vehicle create/edit/detail, maintenance schedule/release, staff invitation/profile/status/availability, impact review | Access/resource state synchronized with operations |
| Admin finance | Payment detail, offline evidence/verify, refund request/detail/approval, reconciliation issue, report filters/export/job result | Immutable postings, cap checks and reauthentication |
| Admin governance | User grant editor, permission registry/detail, company settings, policy create/history, channel settings, integrations readiness, redacted audit detail, failed-job retry | Last-Admin protection and safe secrets |

Necessary detail-read endpoints not separately expanded in the inventory: `GET /itinerary-versions/:id` for authorized staff draft/published editing, `GET /admin/services/:id` for service editor, and `GET /admin/vehicles/:id/allocations` for authorized fleet schedule. Document and implement these in OpenAPI. Catalog departure management uses Admin-only `GET/POST /admin/packages/:id/departures` and `PATCH /admin/departures/:id` when group capacity is enabled. Do not expose draft itinerary or allocation detail publicly.

## 17. Brand system, interaction and accessibility

### 17.1 Exact visual tokens

Use the orange/black logo reference, not the alternative green/gold profile palette.

| Token | Value | Use |
| --- | --- | --- |
| `brand.orange` | `#FF7B00` | Primary brand accent, highlight, dark-text action fills |
| `brand.orangeBright` | `#FF8B20` | Hover/pressed illustration accents; use with measured contrast |
| `color.ink` | `#171915` | Main readable text |
| `color.black` | `#0C0D0B` | Dark cinematic/app-showcase sections |
| `color.cream` | `#F6F3ED` | Warm page/screen base |
| `color.paper` | `#FFFDFA` | Card/form surface |
| `color.muted` | `#73776C` | Secondary text after contrast verification |
| `color.line` | `#E5E3DC` | Dividers/borders |
| `font.editorial` | Playfair Display / italic | Hero/editorial headings and selective brand moments |
| `font.body` | DM Sans | Body copy and clean marketing text |
| `font.ui` | Manrope | Native controls, labels, navigation and dashboard figures |

Semantic success/warning/error colors are separate tokens, with text/icons and sufficient contrast. Use a darker derived orange for small text on light surfaces if required by contrast testing. Do not make small white text on bright orange the default CTA style; use dark ink on orange. Bright orange is a brand color, not a substitute for readable body text.

### 17.2 Native sizing and layout

- Baseline spacing scale: 4, 8, 12, 16, 20, 24, 32, 40 pixels/dp.
- Typical page padding 20, compact cards 16, stacked section gap 20–24.
- Editorial headings 28–34; screen title 24–28; card title 18–20; body 16; field/nav label 14–16; noncritical metadata minimum 12 with accessible scaling.
- Default interactive target at least 48 dp, accommodating platform accessibility guidance; never shrink real native text/targets to the tiny labels used inside the HTML phone presentation.
- Card radius approximately 18–24, button radius 14–16 or pill where visually appropriate; soft low-contrast shadow/border, not heavy repeated glow.
- Safe-area aware top/bottom; keyboard avoidance; appropriate `ScrollView` vs virtualized list; sticky actions include bottom padding so final content remains visible.
- Use actual device status/navigation bars. The native app does not render the prototype's iPhone frame or fake notch.
- Support compact phones, standard phones, large phones and tablet layouts without horizontal overflow. Admin long lists use detail routes/filter sheets; avoid compressed table grids.

### 17.3 Motion

Web: restrained hero fade/slide, slow photo reveal, destination hover and app-screen transitions. Native: short screen/card transitions, accordion expansion, button feedback and confirmation animation. Typical UI movement 180–300 ms; longer editorial reveal only when it does not delay access to content.

Use Expo-compatible Reanimated/gesture packages for justified native motion and CSS for web motion. Respect reduced-motion settings, prevent scroll hijacking, avoid looping animations near forms and never require an animation to complete before navigation/payment feedback. A loading animation must not imply that a backend mutation succeeded.

### 17.4 Accessibility and content

Verify text contrast against the actual background; use at least 4.5:1 for ordinary text and appropriate large-text/UI targets. Provide screen-reader labels/hints, selected state, error announcement, logical focus order and semantic web controls. Images conveying destination meaning have alt text; decorative layers are hidden from assistive technology.

Support device font scaling; never set a global fixed font-size cap to protect layout. State labels include text. Calendar/date pickers support keyboard/screen-reader alternatives. Form focus moves to the first error appropriately. Modals/sheets have a visible close action and correct focus behavior. Web phone-demo content scrolls inside the screen without trapping keyboard users.

Use translation keys for visible app copy. APIs send stable enum/error codes with a fallback message; app translates labels. Display trip dates in the itinerary timezone and label times clearly. Avoid raw ISO strings in UI. Financial language distinguishes “quoted,” “requested,” “pending,” “captured,” “refunded” and “confirmed.”

### 17.5 Assets and licensing

Use the supplied brand asset without redesigning its identity. Preserve original aspect ratio and avoid stretching the small raster logo; use an SVG/high-resolution owner-provided replacement if available later. On black backgrounds, use only a supplied/approved suitable variant.

Existing source asset mapping:

| Asset | Reference filename | Usage |
| --- | --- | --- |
| Logo | `brand-logo.png` | Web/native brand header and onboarding |
| Serengeti giraffe | `hero.jpg` | Cinematic landing hero/featured experience |
| Serengeti elephants | `safari.jpg` / `elephants.jpg` | Wildlife card/story; these two filenames may contain the same source image |
| Zanzibar beach | `zanzibar.jpg` | Zanzibar destination/package |
| Kilimanjaro | `kilimanjaro.jpg` | Trekking destination/package |
| Safari vehicle | `vehicle.jpg` | Fleet/services/editorial card |
| Local fonts | `assets/fonts/*.woff2` | Web; obtain licensed compatible native font assets and keep notices |

Keep an attribution manifest. Existing sources: Justin Lane and Daniel Vargas on Unsplash; Taryn Elliott and Kureng Workx on Pexels; David Clode on Unsplash. Preserve the presentation's source links/credits and font license files. Do not download competitor photographs or copy competitor text/UI as original brand assets. Optimize responsive web images and mobile thumbnails; keep original source identity/credit.

## 18. Public web landing page

### 18.1 Frontend-only contract

The web app is a public branded landing page. It must not implement its own backend, privileged dashboard, customer session store, payment verification endpoint, database connection, provider secret or privileged staff action. All authoritative business features live in the separate API and mobile app.

Use Next.js static export (`output: 'export'`) and CSS/TypeScript components. The frontend may call `/v1/public/*` from the browser for published content and store links. Static fallbacks use approved build-time marketing content, not fabricated live booking counts. Public API/network failure shows a useful fallback/retry without breaking navigation.

Do not use API route handlers, server actions, SSR-dependent authentication or the default server image-optimization endpoint. Use exported/local optimized image files, `unoptimized` or a compatible custom loader. Build output must be deployable as static files. The chosen hosting platform is not a dependency of the mobile/backend repository.

### 18.2 Landing sections

| Order | Section | Required design/function |
| --- | --- | --- |
| 1 | Navigation | Brand, Experiences, Our Story, Services, The App, Contact; mobile drawer; clear app CTA |
| 2 | Cinematic hero | Tanzania giraffe/savanna photo, readable dark overlay, “Some journeys stay with you,” orange editorial emphasis, short copy and useful CTA |
| 3 | Brand ribbon | Restrained moving/scrolling destination/service ribbon; reduced-motion static alternative |
| 4 | Experiences | Asymmetric destination/package photography, category filters, accurate duration/from labels and scroll/detail modal |
| 5 | Company story | Local Tanzania identity, tasteful photo and supplied company values without invented claims |
| 6 | Services | Eight grouped service cards covering safaris, custom/luxury/family/cultural/Kilimanjaro/beach/transfers/rental needs |
| 7 | App presentation | Dark section, all four role tabs, six screens per role, interactive phone case, Focus/All 6 views, journey explanation |
| 8 | Download | Real App Store/Google Play URLs when configured; truthful “Coming soon” otherwise; QR only to a real valid target |
| 9 | Contact/footer | Supplied editable email/phone, contact links, credits, approved policy links and company identity |

### 18.3 Interactive app presentation on web

Preserve the user's requested iPhone case: clickable role tabs, six screens per role, focus/all-screen modes, previous/next, and scrollable inner screen content. Implement it as a **clearly labeled illustrative product demonstration** with isolated fictional state and no access to private production APIs. This frontend demo may show scenario interactions from the existing HTML, but it must not claim to submit real bookings, send messages or collect real money.

The actual native app uses backend APIs and real session authorization. A four-role chooser is appropriate in this public demonstration because it selects fictional preview screens; it is not used for login/access in the real app. Keep the explanatory label short and visible within the showcase.

| Landing interaction | Real behavior |
| --- | --- |
| Navigation/hero CTA | Scroll to relevant section or open useful public experience detail |
| Destination/category filter | Public catalog filtering or honest static approved presentation data |
| Experience details | Accessible public modal/detail with itinerary/copy/photography |
| Phone role/screen controls | Isolated illustrative preview; normal inner scroll and keyboard access |
| App Store / Google Play | Approved actual URL or explicit coming-soon state |
| Contact email/phone | `mailto:` / `tel:` opened by user action |
| Sample demo receipt/itinerary | Clearly labeled sample; never masquerades as an actual paid receipt |

### 18.4 Web acceptance

At 320, 390, 768, 1024 and 1440 pixel widths, no page overflow, clipped CTA or unreadable role tabs. Hero text stays readable on photography. Phone content scrolls and all 24 preview screens remain reachable. Keyboard navigation and reduced motion work. No JavaScript errors, broken image/font paths or invented store URLs. Static build works when hosted from its output directory.

## 19. Local environment and startup contract

### 19.1 Prerequisites

Document the verified Node 24 patch, pinned pnpm, Docker/Compose, Android SDK/emulator or physical device, and optional macOS/Xcode for iOS. iOS Simulator/local native iOS builds require an appropriate macOS/Xcode environment; an Android/LAN development setup on Linux is still valid. Do not promise a Linux command can run an iOS Simulator.

The implementation agent creates runnable scripts with the names below. They are a contract for the finished repository, not commands that already work before scaffolding. Avoid making the user manually guess migrations, port mappings or separate worker processes.

### 19.2 Local services

| Service | Port / access | Development behavior |
| --- | --- | --- |
| API | `4000`, bind `0.0.0.0` | `/v1`, local Swagger and health; no public secrets |
| Public web | `3000`, LAN bind where needed | Static frontend development/preview |
| Expo Metro | `8081` by default | Native development build bundler |
| PostgreSQL | `5432`, host loopback unless explicitly needed | Persistent named volume and health check |
| Redis | `6379`, host loopback | Compatible pinned image/version; not publicly exposed |
| Mailpit SMTP | `1025`, host loopback | Development email sink |
| Mailpit UI | `8025`, host loopback | Inspect invitation/reset/quote/booking emails |
| Worker | No public business HTTP port | Separate persistent process using same DB/config |
| Private file store | Backend-owned local directory | Authenticated streaming; no exposed static directory |

Docker Compose must provide PostgreSQL, Redis and Mailpit with pinned verified images, health checks, volumes and appropriate restart policies. For PostgreSQL 17, mount the documented data directory for that image rather than copying a different major's layout. The agent verifies exact image tags/digests and records them. S3-compatible storage can be added as a Compose profile; the local private-file adapter is sufficient for a complete baseline without introducing another external dependency.

### 19.3 Environment variables

Provide a commented root `.env.example` and app-specific examples. Validate required values at startup and produce a useful error. The following names are the expected interface; implementation may add documented non-secret settings.

```dotenv
# Backend and worker only. Real .env is ignored by git.
NODE_ENV=development
API_HOST=0.0.0.0
API_PORT=4000
DATABASE_URL=postgresql://ma_dev:CHANGE_LOCAL_PASSWORD@127.0.0.1:5432/ma_safaris
REDIS_URL=redis://127.0.0.1:6379
JWT_ACCESS_SECRET=GENERATE_RANDOM_LOCAL_SECRET
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30
PUBLIC_API_BASE_URL=http://127.0.0.1:4000/v1
APP_DEEP_LINK_SCHEME=masafaris
ALLOWED_WEB_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COMPANY_TIMEZONE=Africa/Dar_es_Salaam
STORAGE_DRIVER=local
LOCAL_PRIVATE_STORAGE_PATH=./var/private-storage
PAYMENT_PROVIDER=mock
ENABLE_DEV_PAYMENT_SIMULATION=true
MOCK_WEBHOOK_SECRET=GENERATE_DIFFERENT_RANDOM_LOCAL_SECRET
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=M&A Safaris Development <noreply@ma-safaris.local>
PUSH_PROVIDER=disabled
SEED_DEMO_PASSWORD=SET_A_LOCAL_DEVELOPMENT_PASSWORD

# Only when configured; backend only.
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=

# Frontend values are public; never insert backend secrets here.
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000/v1
EXPO_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/v1
```

Use backend URL/settings appropriate to whether API/worker run on the host or inside Compose; container hostnames such as `postgres`/`redis` differ from host `127.0.0.1`. `PUBLIC_API_BASE_URL` must be reachable for generated links; support a separate explicit mobile/deep-link return base if needed. No provider secret may have an `EXPO_PUBLIC_` or `NEXT_PUBLIC_` prefix.

Production startup fails if development simulation is enabled, default placeholder secrets are used, required live provider settings are missing while advertised as enabled, or unsafe public CORS/storage configuration is detected. Development secrets are generated per checkout and never committed. Avoid publishing the seed password in screenshots/docs except the user's local ignored demo-account file.

### 19.4 Device networking

- Physical phone uses the computer's reachable LAN IPv4 address, such as `http://192.168.x.x:4000/v1`; `localhost` on the phone is the phone itself.
- Android emulator commonly uses `http://10.0.2.2:4000/v1` to reach the host. Document alternatives for the emulator actually used.
- iOS Simulator may use the host loopback address when running on the same Mac. Physical iPhone uses LAN/tunnel.
- Bind the API to `0.0.0.0`, verify firewall/LAN connectivity, and configure development-only HTTP allowances as needed. Production uses HTTPS.
- An Expo/Metro tunnel does not automatically expose the separate API. A payment provider sandbox callback needs its own reachable, controlled HTTPS endpoint when live sandbox testing is undertaken.
- Auth/deep links use configured app scheme/universal links; callback handling always refetches authorized state.

### 19.5 Finished repository command sequence

The agent must implement and verify these scripts or document exact equivalents in `README.md`:

```bash
# From the implementation repository root.
pnpm install
pnpm setup:local
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm contracts:generate
```

Run persistent processes in separate terminals, or provide a documented supervisor command:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:web
pnpm dev:mobile
```

Verification/build scripts:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e:api
pnpm build:api
pnpm build:worker
pnpm build:web
pnpm verify:local
```

`setup:local` creates ignored environment files/secrets only when absent and prints next steps. It must not overwrite a user's existing credentials or reset an existing database. `db:migrate` applies migrations; `db:seed` is idempotent for clearly identified demo data, refuses production and does not duplicate fixtures on each run. Provide an explicitly named development reset command separately, with an unmistakable destructive warning; don't make reset part of ordinary startup.

`contracts:generate` exports OpenAPI and regenerates the SDK deterministically without needing to boot the worker. Tests use a dedicated test database; they must not clear a user's development records. `verify:local` checks dependency health, smoke API flows and document jobs and reports actual results.

### 19.6 Required development identities

Create `customer.demo@ma-safaris.local`, `operations.demo@ma-safaris.local`, `guide.demo@ma-safaris.local` and `admin.demo@ma-safaris.local`, plus isolation-test identities. Use `SEED_DEMO_PASSWORD` or generated per-account passwords saved to an ignored local file. Seed verified emails so the main connected demo is efficient, while separately test actual verification/invitation flows through Mailpit.

Seed one request requiring payment, one connected confirmed/assigned trip, one custom request/quote revision, one maintenance vehicle and one guide on leave. Include completed/refund/reconciliation examples only as clearly identified fixtures. Normal empty-state behavior must work after fixtures are removed.

### 19.7 Persistence and recovery demonstration

Show that a booking, payment posting, assignment, trip event and generated receipt remain available after API/worker restarts. Demonstrate outbox recovery when the worker was stopped during a command. Document where local data/files reside and provide backup/restore commands for the development database and storage. Never claim persistence if the system only retains memory/Zustand state.

## 20. Backend-first implementation phases

Work in this sequence. Track progress in `docs/implementation-progress.md` and mark a phase complete only when its exit gate passes. Routine implementation decisions do not need repeated owner permission; document assumptions and keep moving. Missing live credentials block only that live integration, not the completed local adapter and app flow.

### Phase 0 — Read, map and scaffold

Read this whole blueprint and supplied references. Inspect the HTML role flows and asset credits. Create a traceability table linking C01–C06, O01–O06, D01–D06 and A01–A06 to app routes, API operations and tests. Confirm current versions from primary docs; scaffold the workspace and pin them. Prepare local environment examples and Compose.

**Exit gate:** The repo installs cleanly, services become healthy, version decisions are recorded and the implementation plan accounts for all roles. No unrelated framework alternatives or mock-only rewrite has replaced this specification.

### Phase 1 — Database, identity and authorization

Implement schema/migrations/constraints, database client, environment validation, seeds, password hashing, registration/login/refresh/verification/reset/invitations, `/me`, role context, permission registry and row-projection policies. Create safe error/request-ID handling and local Swagger generation.

**Exit gate:** Each seeded identity logs in; refresh rotation/reuse protection works; own vs other-customer and assigned vs unassigned-guide tests pass; Admin cannot accidentally revoke the last Admin; no secret fields appear in DTOs.

### Phase 2 — Catalog, CMS, CRM and pricing

Implement public catalog and Admin management/publish/archive, price/policy versions, media tickets/finalization, local storage, CRM/inquiries/customer invitations and server pricing previews. Validate content, currency/counts, child rules, dates and preview expiry. Keep original photography/fonts/brand attribution.

**Exit gate:** Admin can create/edit/publish a package; guests only see published content; a preview calculates verified integer totals; expired/stale previews fail; CRM lead can be linked/claimed safely.

### Phase 3 — Bookings, custom requests and quotations

Implement booking/traveler/pickup state, manual staff booking, quote/itinerary draft versions/send/revision/accept, conditions, change requests and immutable snapshots. Add optimistic concurrency and idempotency. Create customer-safe and staff projections.

**Exit gate:** Standard booking and custom acceptance produce persistent records; concurrent quote acceptance creates one booking; sent quotes are immutable; clients cannot submit their own lower total; stale version fails predictably.

### Phase 4 — Payments, refunds, documents and worker

Implement payment/refund adapter, functional mock scenarios, signature/event normalization, intent reservations, immutable postings, offline-payment verification, transactional outbox/dispatcher/jobs, Mailpit emails and private PDFs. Implement pending status reconciliation, export framework and failed-job visibility.

**Exit gate:** Success/failure/pending/duplicate/late/mismatched payment cases behave correctly; no duplicate credit/refund; receipt requires a capture; private documents enforce scope; worker restart recovers committed events; unconfigured production methods are truthful.

### Phase 5 — Operations, allocations and guide execution

Implement confirmation conditions, primary trip creation, resource availability/constraints, preparation, assignment/reassignment, progress/events/issues/handover, customer timeline and notifications. Handle maintenance/leave conflicts, cancellation/reschedule financial/resource implications and staff corrections.

**Exit gate:** The complete backend customer→Operations→guide→Admin journey succeeds through API calls against PostgreSQL. Assignment race test passes; guide can read/update only assigned trips; customer never sees internal notes/finance-only data.

### Phase 6 — Admin management, reporting and full API completion

Complete fleet/team/access/settings/CMS/finance/report/export/review moderation/audit/job endpoints and documented DTOs. Define aggregates by currency and financial meaning. Generate the SDK and verify endpoint coverage. Finish API integration tests before using mobile styling as evidence of backend completion.

**Exit gate:** Every required backend feature has a real operation and tests where business risk warrants them. OpenAPI and generated SDK match implementation. All backend-first workflow/security/concurrency gates are green.

### Phase 7 — Mobile foundation and Customer

Create Expo development build, fonts/tokens/components, session/SecureStore/SDK integration, public/role navigation, localization, notification deep links and common states. Implement all six Customer areas and supporting authentication, booking/checkout/custom/document/support/review flows with actual APIs.

**Exit gate:** Customer can discover, create/pay a standard booking, submit/respond/accept a custom quote, read own trip/documents and recover from network/session/payment pending states on a real emulator/device.

### Phase 8 — Operations and Driver/Guide mobile

Implement Operations Today/CRM/quotation/editor/booking/preparation/monitor and Guide assigned/pickup/itinerary/progress/issues/handover. Use shared components but role-specific response types. Handle conflicts and connectivity accurately.

**Exit gate:** On mobile, Operations confirms/assigns the customer's booking; the correct guide sees it and completes it; Operations monitor and customer timeline reflect those updates; unassigned user/API access is denied.

### Phase 9 — Admin mobile and public web

Implement all Admin areas and full management editors. Port/refine the supplied landing page to the frontend-only web app, retaining brand/photography/animated presentation, all four preview roles and truthful download links. Add accessible lists/charts and mobile-friendly management forms.

**Exit gate:** Admin can manage catalog/fleet/staff/finance/access/settings from the native app; static web builds and all presentation interactions work without private API access; no required action is a placeholder toast.

### Phase 10 — Integration, quality and handoff

Run critical end-to-end flows and required tests, verify accessibility/responsive/device behavior, restart persistence, generated document quality, notification delivery and safe production configuration. Fix issues; prepare runbook, demo-account instructions, verification report and release/integration status.

**Exit gate:** All acceptance scenarios in section 21 have recorded outcomes. The user can run locally from documented commands and complete all four role journeys. Any real external release/provider limitation is explicit and does not hide unfinished local features.

## 21. Verification and acceptance scenarios

### 21.1 Test strategy

Use unit tests for money/rounding, policy, state-transition and projection logic. Use integration/API tests with PostgreSQL for transactions, foreign/exclusion constraints, permissions, idempotency and real business flows. Mock external adapters at their boundary, not the database/ledger whose behavior is under test.

Use meaningful native component tests for forms/session/conflict states and a small set of connected Maestro/manual device journeys. Use Playwright for landing interactions/accessibility/responsiveness. Avoid a large suite that only repeats component implementation or snapshots every margin. A mocked successful API in a mobile test cannot prove payment/assignment integrity; API integration tests provide that evidence.

### 21.2 Required scenarios

| ID | Scenario | Expected result |
| --- | --- | --- |
| AUTH-01 | Register customer with `role: ADMIN` or permission input | Rejected/ignored safely; only Customer grant, no privileged access |
| AUTH-02 | Login wrong password/reset unknown email | Generic safe response and bounded rate limit; no identity enumeration |
| AUTH-03 | Refresh then reuse old refresh token | Rotation succeeds once; reuse revokes session family |
| AUTH-04 | Multiple requests encounter access expiry | Mobile uses one refresh operation; no accidental family revocation through parallel refresh |
| AUTH-05 | Suspend staff/revoke role | Subsequent protected operation denied; private cache/navigation refreshes |
| AUTH-06 | Remove/suspend last active Admin | Server rejects; audit retains attempted/allowed policy outcome safely |
| SCOPE-01 | Customer A reads/changes Customer B booking, quote, intent or document ID | `404`/denied; no private fields leaked |
| SCOPE-02 | Unassigned guide reads traveler/itinerary/progress endpoint | Denied even with a valid UUID |
| SCOPE-03 | Assigned guide receives full finance/internal-note fields | Test fails if present; guide projection excludes them |
| SCOPE-04 | Operations without finance grant requests financial report | Denied; adding explicit permission grants only intended scope |
| SCOPE-05 | Reassign trip from Guide A to Guide B | A loses current access; B gains assigned projection; history remains |
| SCOPE-06 | Customer deep-links to staff screen or changes role context header | UI redirects and backend denies ungranted context |
| PRICE-01 | Two adults + one eligible demo child | USD 3375 total, USD 1012.50 deposit; exact integer strings |
| PRICE-02 | Expired preview, changed selection or stale rate/policy | No stale booking at unreviewed price; useful conflict/re-preview |
| PRICE-03 | Client sends modified total/negative quantity/invalid currency | Server rejects and never uses client total |
| PRICE-04 | Publish new package price after booking | Existing booking snapshot/payment requirement retains accepted basis |
| BOOK-01 | Submit same booking twice with same key | One booking/reference; stable result |
| BOOK-02 | Same key with a different payload | `409 IDEMPOTENCY_KEY_REUSED` |
| BOOK-03 | Confirm before required deposit or itinerary ready | Blocked with exact unmet conditions |
| BOOK-04 | Valid payment and Operations confirmation | One confirmed booking and one primary scheduled trip |
| QUOTE-01 | Create/save/send/revise custom proposal | Sent version immutable; customer sees safe version history |
| QUOTE-02 | Concurrent accept or retry | Exactly one booking linked to accepted quote |
| QUOTE-03 | Accept expired/superseded draft/quote | Rejected; no booking/payment side effect |
| PAY-01 | Mock verified deposit/full/balance success | One posting, correct totals, one ready receipt after worker |
| PAY-02 | Client tries to mark paid or spoof webhook/signature | Denied/no ledger credit |
| PAY-03 | Same successful provider event delivered twice | One credit and receipt; successful duplicate acknowledgement |
| PAY-04 | Failed event after successful capture | No downgrade/loss of settled credit |
| PAY-05 | Wrong amount/currency/reference | Quarantined exception; no automatic credit |
| PAY-06 | Provider timeout then reconciliation success | Pending until known; no second unintended charge |
| PAY-07 | Simultaneous intents for remaining balance | Lock/reservation prevents duplicate intended collection |
| PAY-08 | Genuine late success after cancellation/expiry | Capture recorded; refund/reconciliation visible, not dropped |
| PAY-09 | Request excessive refund or concurrent duplicate approvals | Cap enforced; one authorized settled refund |
| PAY-10 | Offline evidence saved but unverified | No credit until authorized verifier posts once |
| PAY-11 | Production configuration with development simulation | Startup/route guard rejects; no production simulation action |
| RES-01 | Two concurrent trips allocate same guide/vehicle interval | One succeeds; other returns `RESOURCE_UNAVAILABLE` |
| RES-02 | Maintenance/leave/retired/insufficient-capacity resource | Assignment rejected; availability projection appropriate |
| RES-03 | Reschedule into resource conflict | No partially updated booking/allocation; clear review result |
| RES-04 | Cancel approved future trip | Allocations released, disposition/credit/refund workflow preserved |
| RES-05 | Concurrent customers reserve the final fixed-departure seats | Capacity row lock admits only a valid reservation; no overselling |
| RES-06 | Late payment after unpaid departure hold expires | Real capture recorded; capacity exception reviewed/refunded rather than silently confirmed |
| TRIP-01 | Assigned guide follows all seven stages | Correct monotonic state/events; customer/Operations updates projected safely |
| TRIP-02 | Guide double tap/skip phase/stale version | One event; invalid/stale transition rejected with refetch |
| TRIP-03 | Guide issue with permitted photo | Durable scoped issue, Operations queue, safe customer summary only |
| TRIP-04 | Handover submit/retry | One completion, one handover, review becomes eligible |
| DOC-01 | Download another customer's receipt/quote | Denied; expired signed URL unusable |
| DOC-02 | Payment pending or document job failed | No paid receipt; pending/failure state and controlled retry |
| JOB-01 | Stop worker, commit booking/payment, restart worker | Outbox recovered; appropriate notifications/documents generated |
| JOB-02 | Worker retries a processed event | No duplicate ledger/document/side effect |
| REPORT-01 | Mixed-currency sales and refunds | Separate currency aggregates; CSV reconciles to posted records |
| REPORT-02 | CSV customer text starts with formula characters | Export escapes dangerous formula interpretation |
| REPORT-03 | User permission revoked after export created | Download denied despite ready artifact |
| UI-01 | Login/logout across two accounts on same device | No previous user's private data/drafts/device association leaked |
| UI-02 | Poor connectivity during mutation | Visible pending/unknown state, retained inputs and safe status check |
| UI-03 | Large text/screen reader/keyboard/reduced motion | Main actions, errors and scroll content remain usable |
| WEB-01 | Five target widths and all 24 preview screens | No overflow, inner scroll works, navigation accessible |
| WEB-02 | Store URLs absent vs configured | Honest coming-soon vs actual store navigation |
| LOCAL-01 | Restart API/worker/infrastructure without reset | Business data/files persist and commands remain reproducible |

### 21.3 End-to-end demonstration scripts

**Standard safari:** Customer login → Explore → package details → plan/review → create request → mock deposit → verified receipt → Operations review/publish itinerary → confirm → select available vehicle/guide → complete preparation → Customer sees final details → Guide pickup/progress/issue example → Operations monitor/respond → Guide handover → Customer completed trip/review → Admin finance/audit verifies the same record.

**Tailor-made safari/service:** Customer requirements → Operations request/customer → draft day plan/lines → send quote → Customer revision request → Operations new version → Customer accepts → one booking → payment → confirmation/allocation → native trip views. Show the old version cannot be accepted.

**Management:** Admin new draft package → media/price/day plan → publish → Customer public Explore sees it → change future rate without rewriting an existing booking → maintenance block prevents allocation → staff invitation accepted → permission change alters API access → refund approval/event → real private export/audit.

**Resilience:** Stop worker before a successful payment; show server capture persists while receipt is queued; restart worker, retrieve receipt; retry webhook and verify no duplicate. Restart API and native app, then verify same records. Demonstrate wrong-user document/guide access denial through direct API calls.

### 21.4 Verification report

Record actual commands/results, test counts where meaningful, device/emulator/browser versions, tested viewport sizes, generated document inspection, known failed/unavailable checks and integration status. Do not write “tested” for a code path that was only reviewed. If iOS execution is unavailable, state Android/native validation performed and iOS build/device validation outstanding; do not silently call both platforms verified.

## 22. Security, reliability and release requirements

### 22.1 Practical security controls

Use parameterized database queries, DTO allowlists, role+row+field authorization, HTTPS production, hashed credentials/tokens, rate limits for authentication/public writes, upload validation, short-lived private downloads and redacted structured logs. Configure CORS only for intended public browser origins; mobile bearer auth is not secured by CORS.

For sensitive staff actions, require a fresh action-scoped reauthentication proof tied to user/session/action with short expiry. Log permission/settings/refund/offline-payment verification/financial adjustment/assignment correction with actor, entity, reason and request ID. Do not log password/reset/refresh/provider secrets, raw card details, unnecessary traveler information or full webhook bodies indiscriminately.

Protect development tools and readiness details appropriately. Swagger is available locally; production exposure is an explicit configuration choice with protection. Application APIs have no general hard-delete for completed finance/audit history. Infrastructure database privileges are separated from normal application access where feasible.

### 22.2 Reliability and reconciliation

Database uniqueness/exclusion/transaction constraints are the final concurrency defense. Handle serialization/deadlock/exclusion failures with bounded safe retry or a documented conflict. Use DB/Redis/provider timeouts and bounded connection pools. Return a clear dependency error rather than hanging indefinitely.

Readiness fails when mandatory dependencies are unavailable; optional email/push failure creates a delivery problem, not a false booking rollback. Outbox and idempotency make retry/recovery coherent. Monitor pending payment ages, failed jobs, duplicate/mismatched events, resource conflicts and document failures. Do not conceal finance exceptions behind an optimistic green status.

### 22.3 Migrations, backup and operational documentation

Commit migrations and test a clean install plus upgrade from the previous schema. Production migration uses a deploy/apply command, not development reset. Add SQL extensions/constraints explicitly. Use expand/contract migration strategy for breaking fields and record any manual data migration.

Document database+private-file backup and restore, worker recovery, payment reconciliation procedure, failed-job retry, staff access recovery and retention settings. Test a development restore once. Production backup schedule/retention and data-retention decisions are owner/operator settings, not invented legal claims in this brief.

### 22.4 Performance goals

Set realistic measured local targets and record results rather than promise global performance. Initial engineering targets: typical paginated catalog/booking reads under roughly 500 ms on the documented development setup, responsive form interaction, bounded list queries, optimized hero/thumbnail images and no blocking document/export generation in an API request. These are local acceptance targets, not a production SLA.

Use indexes based on actual filters, avoid N+1 queries, cap pagination, virtualize native long lists, lazy-load noncritical landing photos and retain accessible layout while fonts load. Document performance bottlenecks instead of adding caches before correctness. Public catalog may use HTTP caching/ETags; private responses never use shared public caching.

### 22.5 Production readiness checklist

Local functionality must be complete even while these external release inputs are pending:

- Owner-approved package prices, deposit/cancellation/reschedule rules, child bands, currency/tax configuration and public terms/privacy copy.
- Selected payment provider with official adapter, sandbox verification, live keys/webhook/domain and reconciliation ownership.
- Production email sender/provider, push device credentials/setup, optional SMS/WhatsApp provider if actually needed.
- HTTPS API/domain, private production storage, database/Redis hosting, backups, monitored worker and environment secrets.
- App signing, bundle identifiers, icons/splash, store accounts, release review and valid App Store/Google Play links.
- Native permission justifications only for features used; no background location permission in this baseline.
- Document-upload scanning readiness before untrusted production PDFs are accepted.
- Platform builds/device QA, approved assets/licenses and no demo data/development payment endpoints in production.

Record each as configured, verified, disabled or awaiting owner/provider input. Do not use this checklist to leave local booking, quote, mock payment, assignments, guide screens or Admin management unfinished.

## 23. Deliverables, completion checklist and agent handoff

### 23.1 Required deliverables

1. Working monorepo: API, worker, database/migrations/seeds, generated SDK, Expo app and static landing frontend.
2. `.env.example` files, local setup/health/run/build scripts and Compose configuration.
3. OpenAPI JSON/Swagger and documented permission/state/error contracts.
4. All 24 role areas and the supporting functional screen inventory, using supplied orange/black design and photography.
5. Working standard/custom flows, development payment/refund adapter, private PDFs, local email, in-app notifications, allocation and guide execution.
6. Integration/authorization/concurrency/payment tests, mobile/web checks and actual verification report.
7. `README.md`, local runbook, architecture/versions, demo-account instructions, provider/release status and final completion mapping.

### 23.2 Completion checklist

- [ ] All source references reviewed or missing references documented with a reasonable fallback.
- [ ] Technology versions pinned and compatible; lockfile committed.
- [ ] Local infrastructure, migrations and seeds work from a clean checkout.
- [ ] No ordinary startup command destroys existing data.
- [ ] Authentication/invitation/reset/session rotation and email verification work.
- [ ] All roles/permissions/row scopes/field projections are enforced server-side.
- [ ] Standard booking uses server preview and immutable accepted price/policy.
- [ ] Custom quote send/revision/accept works and creates one booking.
- [ ] Mock payment/refund scenarios use verified-event reconciliation and immutable postings.
- [ ] Confirmation requires valid policy/payment/itinerary conditions.
- [ ] Resources cannot overlap, be too small or ignore maintenance/leave.
- [ ] Guide updates/issues/handover operate only on current assignments.
- [ ] Customer timeline/documents never disclose internal data.
- [ ] Admin catalog/fleet/team/finance/access/settings are fully functional.
- [ ] Receipts/itineraries/quotes and report exports are real private artifacts.
- [ ] Worker/outbox recovery and failed-job states are demonstrated.
- [ ] Mobile screens use actual APIs, safe storage and isolated user/context query caches.
- [ ] Native UI follows brand, readable sizing, safe areas and accessibility.
- [ ] Web is frontend-only, animated/responsive, and includes all role previews.
- [ ] Store buttons use valid links or honest coming-soon state.
- [ ] No required button is a placeholder; disabled external integrations are explicit.
- [ ] Required tests and connected demonstrations have recorded outcomes.
- [ ] App/API/worker restart retains business data and files.
- [ ] Final report distinguishes locally completed features from live integration/release inputs.

### 23.3 First actions for the coding agent

After reading the complete document, inspect existing files and repository instructions, map references and create the workspace without overwriting unrelated user work. Verify versions, implement local infra/database/auth first, and prove backend workflows before connecting the native app. Maintain the traceability/progress table and continue through every phase.

When you reach an uncertain business setting, use the clearly labeled configurable local default in section 2; do not block the whole system or present that default as an approved company policy. When provider credentials are unavailable, finish and test the development adapter and report what enables the live adapter. Ask only for inputs that materially block their specific dependent work.

### 23.4 Final response expected from the implementation agent

Lead with what now runs locally and how to start it. Provide exact repository/path, startup commands, development account location, tested connected journeys and material unresolved integrations. Include a concise role/screen/API completion table and reference the verification report. Do not call the project complete if the app remains static, the backend is only scaffolded, the worker does not run, financial buttons simulate client state, or Admin/Operations responsibilities are missing.

### 23.5 Ready-to-paste agent instruction

```text
Implement the full M&A Safaris system described in this blueprint locally.
Read the complete blueprint and supplied PDF/HTML/logo references first.
The public web is a frontend-only landing page and interactive illustrative
presentation. The real mobile app has Customer, Operations, Driver/Guide and
Admin contexts, all consuming a separate authorized backend API.

Use the selected TypeScript / NestJS-Fastify / PostgreSQL-Prisma / worker /
Expo React Native / Next.js static-frontend architecture. Verify compatible
stable dependency versions and pin them. Build the backend, contracts and
complete API workflows first, then the entire native app and landing page.

Preserve the supplied orange/black brand and the six journey areas per role,
adding all supporting editors/details/authentication screens needed for full
functionality. Enforce permissions, row scopes, money integrity, idempotency,
quote versioning and allocation conflicts on the server. Do not port demo
global state as production auth/bookings/payments.

Complete the working local payment adapter, private PDFs, Mailpit email,
outbox worker, reporting, all role management actions and connected tests.
Keep live-provider/store dependencies explicit while finishing local work.
Follow phases 0–10 and do not stop after a plan, API scaffold or static UI.
Deliver runnable code, scripts, documentation and actual verification results.
```

## 24. Official technical references

References were consulted for the selected architecture. Recheck current compatible versions when implementing; this document intentionally does not guess every package patch. The business rules and UI decisions above are project-specific recommendations, not copied framework requirements.

| Topic | Primary reference | Implementation use |
| --- | --- | --- |
| Node LTS | [Node.js releases](https://nodejs.org/en/about/previous-releases) | Verify Node 24 patch and supported runtime |
| Fastify in Nest | [NestJS performance / Fastify](https://docs.nestjs.com/techniques/performance) | Adapter, compatible plugins and LAN bind |
| API schema | [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction) | Generate documented REST contracts |
| Prisma 7 | [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) | ESM, driver adapter, config/env loading and generated client |
| Transactions | [Prisma transactions](https://www.prisma.io/docs/orm/fundamentals/transactions) | Atomic state/ledger/version changes |
| PostgreSQL support | [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/) | Supported PostgreSQL 17 baseline and patch selection |
| Resource intervals | [PostgreSQL range types](https://www.postgresql.org/docs/current/rangetypes.html) | Range/exclusion constraint pattern; verify against deployed major |
| Queues | [BullMQ queues](https://docs.bullmq.io/guide/queues/) | Queue processing behind durable outbox |
| Native build | [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) | Validate actual native modules/builds |
| Mobile routing | [Expo Router introduction](https://docs.expo.dev/router/introduction/) | Protected role navigation and deep links |
| Token storage | [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) | Protected local credential storage |
| Push setup | [Expo push notification setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) | Device registration and configured provider delivery |
| Mobile fetching | [TanStack Query for React Native](https://tanstack.com/query/latest/docs/framework/react/react-native) | Server-state caching, app focus and online state |
| Forms | [React Hook Form source](https://github.com/react-hook-form/react-hook-form) and [Zod](https://zod.dev/) | Native form integration and strict typed validation |
| Local UI state | [Zustand source and docs](https://github.com/pmndrs/zustand) | Small UI store; server data remains in Query/backend |
| PDF generation | [PDFKit](https://pdfkit.org/) | Backend-owned document generation and font/image support |
| Password hashing | [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | Argon2id selection and measured cost configuration |
| Static web | [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) | Frontend-only export and supported image/content approach |

---

**Final implementation objective:** One coherent, persistent M&A Safaris business system, with an API-authorized four-role native app and a polished frontend landing presentation. A customer request must flow through pricing, payment, Operations, guide execution and Admin oversight using the same records, with the supplied brand and clear, reliable UI at every step.




