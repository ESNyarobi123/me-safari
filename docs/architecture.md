# Architecture and Design Specification

**Product:** Me and Adventure Safaris (M&A Safaris)  
**Technology:** TypeScript Monorepo, Node.js 24 LTS, PostgreSQL 17, NestJS / Fastify, BullMQ / Redis, Expo React Native, Next.js (Static Export)

---

## 1. System Topology

```
┌────────────────────────────────────────────────────────┐
│                   Public Web Frontend                  │
│            (Next.js Static Export / CSS)               │
└──────────────────────────┬─────────────────────────────┘
                           │ Public GET /v1/public/* only
                           ▼
┌────────────────────────────────────────────────────────┐       ┌────────────────────────┐
│                     Four-Role Mobile App               │       │     Mailpit SMTP       │
│                (Expo React Native / SDK 52)            │       │ (Port 1025 / UI 8025)  │
└──────────────────────────┬─────────────────────────────┘       └───────────▲────────────┘
                           │ Authenticated REST /v1                          │
                           ▼                                                 │ Email delivery
┌────────────────────────────────────────────────────────┐       ┌───────────┴────────────┐
│                    API Service Engine                  │       │    Background Worker   │
│                 (NestJS with Fastify HTTP)             │       │    (BullMQ + Outbox)   │
└────────────┬─────────────────────────────┬─────────────┘       └───────────▲────────────┘
             │                             │                                 │
             │ ACID transactions           │ Enqueue jobs via Outbox         │ Pulls events
             ▼                             ▼                                 │
┌─────────────────────────┐   ┌──────────────────────────┐                   │
│      PostgreSQL 17      │   │          Redis 7         │───────────────────┘
│  (Authoritative State,  │   │     (Queue Backing &     │
│   Exclusion Constraints,│   │      Session Cache)      │
│   Ledgers & Outbox)     │   └──────────────────────────┘
└─────────────────────────┘
```

---

## 2. Monorepo Organization

```text
ma-safaris/
  apps/
    api/              NestJS / Fastify HTTP REST server (port 4000)
    worker/           BullMQ background processor (outbox dispatcher, PDF rendering, email)
    mobile/           Expo React Native application covering all 4 roles
    web/              Next.js frontend-only static landing page (port 3000)
  packages/
    backend/          Core domain business services, workflows, and policies
    database/         Prisma ORM schema, PostgreSQL 17 migrations, and seed scripts
    sdk/              Generated OpenAPI TypeScript client SDK
  docs/
    api.openapi.json  OpenAPI 3.0 specification covering 193 operations
    architecture.md   System design, database invariants, and network boundaries
    permissions.md    RBAC registry, row-scoping rules, and projection policies
    local-runbook.md  Local setup, commands, port bindings, and seeded credentials
    production-readiness.md  Release gates, deployment, backups, monitoring and launch blockers
    verification.md   Acceptance test matrix and scenario results
  scripts/            Local setup, infrastructure, verification, and backup scripts
```

---

## 3. Database Invariants and Data Integrity

1. **Integer Minor-Unit Financials:**
   All money values are stored as unsigned or signed 64-bit integers (`bigint`) representing currency minor units (e.g., $1,250.00 is stored as `125000` minor units). Financial summaries, balance due, and deposit targets are calculated using deterministic integer arithmetic with explicit rounding rules. Floating point math is strictly forbidden.
2. **Resource Allocation Exclusion Constraints:**
   To prevent double-booking of safari vehicles and guides across concurrent staff assignments, PostgreSQL 17's `btree_gist` extension is employed with exclusion constraints:
   ```sql
   ALTER TABLE "ResourceAllocation"
     ADD CONSTRAINT allocation_no_overlap
     EXCLUDE USING gist (
       "resourceType" WITH =,
       "resourceId" WITH =,
       tstzrange("startsAt", "endsAt", '[)') WITH &&
     ) WHERE ("state" = 'ACTIVE');
   ```
3. **Append-Only Financial Ledgers:**
   Payment captures (`PaymentPosting`), refunds (`RefundPosting`), and adjustments (`FinancialAdjustment`) are strictly append-only. Settled amounts cannot be edited or deleted through application APIs.
4. **Transactional Outbox Pattern:**
   Every state mutation requiring downstream work (e.g., receipt generation, email delivery, notification dispatch) commits an outbox event in the same ACID database transaction. The BullMQ worker polls and dispatches these events idempotently.

---

## 4. Role Isolation and Projections

- **Customer:** Scoped to `customerId = actor.customerId`. Can create bookings, submit payments, view published itineraries, and request quotes. Internal notes and vehicle registration details are withheld.
- **Driver / Guide:** Strictly scoped to assigned active trips. Receives only operational pickup time, traveler names, dietary requirements, and approved itineraries. Booking costs, payment summaries, and customer billing histories are stripped from responses.
- **Operations:** Manages bookings, inquiries, quotations, and resource assignments. Cannot view customer passwords or gateway credentials.
- **Admin:** Company-wide management across catalog, fleet, staff, and financial ledgers. Protected by last-Admin revocation prevention and action-scoped reauthentication for sensitive operations.
