# Verification and Acceptance Report

**Product:** Me and Adventure Safaris (M&A Safaris)  
**Date:** October 2026  
**Status:** All Acceptance Scenarios Verified  
**Runtime:** Node.js 24 LTS, PostgreSQL 17, Redis 8, Fastify / NestJS, Expo SDK 52, Next.js 16 (Static Export)

---

## 1. Automated Test Suite Results

| Test Category | Command | Target / Suite | Tests Passed | Status |
|---|---|---|---|---|
| **Unit Tests** | `pnpm test:unit` | `tests/unit/*.test.ts` | **26 / 26** | PASS |
| **Database Integration** | `pnpm test:integration` | `tests/integration/database.test.ts` | **21 / 21** | PASS |
| **End-to-End API Workflows** | `pnpm test:e2e:api` | `tests/e2e/api.test.ts` | **40 / 40** | PASS |
| **Mobile Component Tests** | `pnpm --filter @ma-safaris/mobile test` | `apps/mobile/tests/*.test.ts*` | **9 / 9** | PASS |
| **Web Responsive Playwright** | `pnpm --filter @ma/web test` | `apps/web/tests/*.spec.ts` | **14 / 14** | PASS |
| **Local Service Health** | `pnpm verify:local` | `scripts/verify-local.ts` | **4 / 4 checks** | PASS |
| **Production Preflight** | `pnpm preflight:production` | `scripts/production-preflight.ts` | **Fail-closed until payment/storage blockers close** | **BLOCKED (expected)** |
| **Typecheck** | `pnpm typecheck` | Monorepo root + all packages/apps | **7 / 7 projects** | PASS |

---

## 2. Blueprint Acceptance Scenarios Matrix (Section 21)

| Scenario ID | Test Name & Description | Automated Test Location | Result |
|---|---|---|---|
| **AUTH-01** | Self-registration rejects role injection and always grants only `CUSTOMER` | `tests/e2e/api.test.ts:81` | **PASS** |
| **AUTH-02** | Invalid password returns generic 401 without user enumeration | `tests/e2e/api.test.ts:100` | **PASS** |
| **AUTH-03** | Refresh token rotation succeeds once and reuse revokes session family | `tests/e2e/api.test.ts:114` | **PASS** |
| **AUTH-04** | Serialized mobile token refresh avoids race conditions | `apps/mobile/tests/session.test.ts` | **PASS** |
| **AUTH-05** | Suspended staff account immediately loses API access | `tests/integration/database.test.ts` | **PASS** |
| **AUTH-06** | Server rejects removing or suspending the last active administrator | `tests/e2e/api.test.ts:151` | **PASS** |
| **SCOPE-01** | Customer A cannot access or modify Customer B's bookings or quotes | `tests/e2e/api.test.ts:518` | **PASS** |
| **SCOPE-02** | Unassigned guide denied access to trip itinerary/traveler endpoints | `tests/e2e/api.test.ts:443` | **PASS** |
| **SCOPE-03** | Guide projection excludes booking price, payment totals, and internal CRM notes | `tests/e2e/api.test.ts:430` | **PASS** |
| **SCOPE-04** | Operations without explicit finance grant denied financial reports | `tests/unit/permissions.test.ts` | **PASS** |
| **SCOPE-05** | Reassigned trip immediately removes access from old guide | `tests/integration/database.test.ts` | **PASS** |
| **SCOPE-06** | Role-context header validated against server grants; ungranted context returns 403 | `tests/unit/permissions.test.ts` | **PASS** |
| **PRICE-01** | 2 adults + 1 child ($1,250 adult, $875 child) = $3,375 total, $1,012.50 deposit | `tests/e2e/api.test.ts:178` | **PASS** |
| **PRICE-02** | Expired preview or modified parameters triggers invalidation and review | `tests/unit/money.test.ts` | **PASS** |
| **PRICE-03** | Client cannot inject custom price or tamper with totals | `tests/e2e/api.test.ts:204` | **PASS** |
| **PRICE-04** | Published rate updates preserve existing booking and quote snapshots | `tests/integration/database.test.ts` | **PASS** |
| **BOOK-01** | Idempotent booking creation returns identical record on replay | `tests/e2e/api.test.ts:244` | **PASS** |
| **BOOK-02** | Reused idempotency key with differing payload returns 409 IDEMPOTENCY_KEY_REUSED | `tests/e2e/api.test.ts:286` | **PASS** |
| **BOOK-03** | Operations confirmation blocked if required deposit or approved itinerary unmet | `tests/e2e/api.test.ts:299` | **PASS** |
| **BOOK-04** | Verified deposit enables Operations confirmation, creating primary scheduled trip | `tests/e2e/api.test.ts:349` | **PASS** |
| **QUOTE-01** | Custom request workflow produces draft, frozen sent quote, and revision history | `tests/e2e/api.test.ts:534` | **PASS** |
| **QUOTE-02** | Customer accepts quote v2 creating exactly one linked booking idempotently | `tests/e2e/api.test.ts:645` | **PASS** |
| **QUOTE-03** | Customer cannot accept superseded or expired quote v1 | `tests/e2e/api.test.ts:683` | **PASS** |
| **PAY-01** | Verified mock deposit settlement records immutable ledger posting | `tests/e2e/api.test.ts:311` | **PASS** |
| **PAY-02** | Client cannot directly toggle booking to paid without verified provider event | `tests/integration/database.test.ts` | **PASS** |
| **PAY-03** | Duplicate webhook events handled idempotently with single ledger posting | `tests/integration/database.test.ts` | **PASS** |
| **PAY-04** | Failed webhook delivery after capture does not downgrade settled funds | `tests/integration/database.test.ts` | **PASS** |
| **PAY-05** | Mismatched amount/currency quarantined as reconciliation exception | `tests/integration/database.test.ts` | **PASS** |
| **PAY-06** | Pending intent timeout reconciled by merchant reference | `tests/integration/database.test.ts` | **PASS** |
| **PAY-07** | Intent reservations prevent concurrent overcollection of remaining balance | `tests/integration/database.test.ts` | **PASS** |
| **PAY-08** | Late capture after cancellation recorded and flagged for financial disposition | `tests/integration/database.test.ts` | **PASS** |
| **PAY-09** | Excess refund or duplicate refund approval rejected under remaining balance cap | `tests/integration/database.test.ts` | **PASS** |
| **PAY-10** | Offline payment evidence saved in unverified state; requires explicit verifier action | `tests/integration/database.test.ts` | **PASS** |
| **PAY-11** | Simulation endpoint disabled when NODE_ENV=production | `tests/unit/config-production.test.ts` | **PASS** |
| **RES-01** | Exclusion constraint prevents overlapping active allocations of the same resource | `tests/integration/database.test.ts` | **PASS** |
| **RES-02** | Vehicle in maintenance or guide on leave cannot receive active allocation | `tests/integration/database.test.ts` | **PASS** |
| **RES-03** | Reschedule request revalidates resource availability before applying | `tests/integration/database.test.ts` | **PASS** |
| **RES-04** | Cancellation of confirmed trip releases allocated resources | `tests/integration/database.test.ts` | **PASS** |
| **RES-05** | Departure capacity checked under row lock, preventing overselling | `tests/integration/database.test.ts` | **PASS** |
| **TRIP-01** | Guide advances through 7 stages monotonically (`EN_ROUTE_TO_PICKUP` to `COMPLETED`) | `tests/e2e/api.test.ts:451` | **PASS** |
| **TRIP-02** | Stale trip version or skipped stage returns invalid transition error | `tests/e2e/api.test.ts:451` | **PASS** |
| **TRIP-03** | Guide issues persist with severity; customer summary projected safely | `tests/integration/database.test.ts` | **PASS** |
| **TRIP-04** | Guide handover checklist submission marks trip and booking completed | `tests/e2e/api.test.ts:480` | **PASS** |
| **DOC-01** | Private customer documents enforce download authorization and short-lived expiry | `tests/integration/database.test.ts` | **PASS** |
| **DOC-02** | Paid receipt cannot be downloaded for unpaid or pending bookings | `tests/integration/database.test.ts` | **PASS** |
| **JOB-01** | Stopped worker recovers committed outbox events on restart | `tests/integration/database.test.ts` | **PASS** |
| **JOB-02** | Worker retry is idempotent and avoids duplicate postings or documents | `tests/integration/database.test.ts` | **PASS** |
| **REPORT-01**| Multi-currency sales and captures aggregated separately without numerical mixing | `tests/unit/money.test.ts` | **PASS** |
| **REPORT-02**| CSV export escapes formula characters (`=`, `+`, `-`, `@`) preventing spreadsheet injection | `tests/unit/money.test.ts` | **PASS** |
| **UI-01** | Account switching on mobile clears query caches and private draft state | `apps/mobile/tests/session.test.ts` | **PASS** |
| **WEB-01** | Responsive landing page and all 24 interactive demo screens at 320px–1440px | `apps/web/tests/landing.spec.ts` | **PASS** |
| **WEB-02** | Store buttons show honest "Coming soon" state when unconfigured | `apps/web/tests/landing.spec.ts` | **PASS** |
| **LOCAL-01**| Database records and file storage survive API and worker restarts | `scripts/verify-local.ts` | **PASS** |

---

## 3. End-to-End Connected Journey Verification

### Journey 1: Standard Safari Lifecycle
1. **Customer Discovery:** Customer fetches `/v1/public/packages`, selects `serengeti-five-days`.
2. **Pricing Preview:** Customer requests preview for 2 adults + 1 child (`$3,375.00` total, `$1,012.50` deposit).
3. **Booking Submission:** Customer submits preview with travelers Alice, Daniel, and Jamie Morgan. State: `REQUESTED`.
4. **Deposit Payment:** Customer creates payment intent and completes via mock adapter. State: `PARTIALLY_PAID` (`$1,012.50` captured).
5. **Operations Confirmation:** Operations approves itinerary version, verifies deposit, and confirms booking. State: `CONFIRMED`, trip created.
6. **Resource Assignment:** Operations assigns Guide Kelvin Mushi and Vehicle TZ001 (6 seats), completes 5-item prep checklist.
7. **Guide Progress:** Kelvin Mushi advances trip through all stages (`EN_ROUTE_TO_PICKUP` → `PICKED_UP` → `SAFARI_STARTED` → `ACTIVITY_REACHED` → `RETURNING`).
8. **Trip Handover:** Guide completes drop-off checklist and submits handover. Trip and Booking transition to `COMPLETED`.
9. **Review Submission:** Customer submits 5-star review. Admin inspects audit and financial ledger.

### Journey 2: Custom Tailor-Made Safari Lifecycle
1. **Custom Request:** Customer submits tailor-made safari requirements for Tarangire & Ngorongoro Crater ($4,000 budget).
2. **Quote Version 1:** Operations creates Quote v1 ($3,600 total) with custom day-by-day plan and sends to customer.
3. **Revision Request:** Customer asks for hot air balloon addition. Quote v1 is marked superseded.
4. **Quote Version 2:** Operations creates Quote v2 ($4,700 total) with balloon safari and sends.
5. **Quote Acceptance:** Customer accepts Quote v2. Single linked booking created in `REQUESTED` state.
6. **Superseded Quote Guard:** Re-attempting to accept Quote v1 returns 409 conflict.

---

## 4. Production vs Local Boundaries

- **Mock Payment Adapter:** Runs durable state transitions and ledger postings locally. Live payment gateways (e.g., Vodacom M-Pesa, DPO, Stripe) are gated behind explicit configuration flags and API credentials.
- **Mailpit SMTP:** Captures all outbound system emails (verification, invitations, receipts, quotes) at `http://127.0.0.1:8025` without sending external network traffic.
- **Private Storage:** Operates on local filesystem path `./var/private-storage` in development; S3 adapter ready for production configuration.
