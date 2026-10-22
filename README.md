# M&A Safaris (Me and Adventure Safaris)

**Your Gateway to Authentic Tanzania**  
*Discover Tanzania. Experience Africa. Create Memories.*

---

## Overview

M&A Safaris is a full-featured safari and travel platform built for local execution and end-to-end integration. The repository comprises:
1. **REST API (`apps/api`):** NestJS with Fastify HTTP adapter, OpenAPI contracts (193 operations), and strict RBAC.
2. **Background Worker (`apps/worker`):** BullMQ + Redis durable queue with a transactional outbox dispatcher, PDF rendering, and Mailpit email delivery.
3. **Mobile Application (`apps/mobile`):** Expo React Native app supporting all four business roles (**Customer**, **Operations**, **Driver/Guide**, **Admin**) across 24 core screens and supporting views.
4. **Public Landing Web (`apps/web`):** Next.js static export landing page featuring brand photography, safari catalog, and an interactive 24-screen iPhone case presentation.
5. **Database & Invariants (`packages/database`, `packages/backend`):** PostgreSQL 17 with `btree_gist` exclusion constraints for non-overlapping resource allocations, append-only financial ledgers, and minor-unit currency math.

---

## Quick Start

### 1. Prerequisites
- Node.js 24 LTS (`>=24.21.0 <25`)
- `pnpm@12.11.2`
- Docker and Docker Compose (v2)

### 2. Setup and Seeding
```bash
# Install dependencies
pnpm install

# Initialize local environment variables and secrets
pnpm setup:local

# Start PostgreSQL 17 (port 5433), Redis (port 6380), Mailpit (ports 1025 / 8025)
pnpm infra:up

# Run database migrations and seed demo data
pnpm db:migrate
pnpm db:seed

# Generate contracts and TypeScript SDK
pnpm contracts:generate
```

### 3. Running Services
Start each service in a separate terminal:
```bash
# Terminal 1: REST API (http://127.0.0.1:4000/v1)
pnpm dev:api

# Terminal 2: BullMQ Worker (processes outbox jobs, generates PDFs, sends emails)
pnpm dev:worker

# Terminal 3: Public Landing Page (http://localhost:3000)
pnpm dev:web

# Terminal 4: Native Mobile App (Expo Metro bundler on port 8081)
pnpm dev:mobile
```

---

## Seeded Development Accounts

All accounts use the local development password defined in `.env` as `SEED_DEMO_PASSWORD`:

| Role | Email Address | Description |
|---|---|---|
| **Customer** | `customer.demo@ma-safaris.local` | Verified customer (Alice Morgan) |
| **Customer 2** | `customer2.demo@ma-safaris.local` | Second customer (Daniel Morgan) for isolation tests |
| **Operations** | `operations.demo@ma-safaris.local` | Operations Lead (Neema Kweka) |
| **Driver / Guide** | `guide.demo@ma-safaris.local` | Assigned Safari Guide (Kelvin Mushi) |
| **Driver / Guide 2**| `guide2.demo@ma-safaris.local` | Unassigned Safari Guide (Asha Nyerere) |
| **Administrator** | `admin.demo@ma-safaris.local` | Business Administrator |

---

## Verification & Testing

Run all automated checks and scenarios:

```bash
# Verify local infrastructure and API route readiness
pnpm verify:local

# Run TypeScript typechecks across all 7 packages
pnpm typecheck

# Run unit tests (money arithmetic, CSV escaping, permissions)
pnpm test:unit

# Run PostgreSQL 17 integration tests (exclusion constraints, immutability)
pnpm test:integration

# Run full end-to-end API safari lifecycle tests
pnpm test:e2e:api

# Run mobile component tests
pnpm --filter @ma-safaris/mobile test

# Run responsive Playwright web tests
pnpm --filter @ma/web test
```

---

## Documentation Links

- [System Architecture](file:///Users/eunice/case/me-safari/docs/architecture.md)
- [Local Runbook & Commands](file:///Users/eunice/case/me-safari/docs/local-runbook.md)
- [Production Readiness & Release Runbook](file:///Users/eunice/case/me-safari/docs/production-readiness.md)
- [Verification & Acceptance Report](file:///Users/eunice/case/me-safari/docs/verification.md)
- [Permissions Registry & Access Control](file:///Users/eunice/case/me-safari/docs/permissions.md)
- [Implementation Progress Tracking](file:///Users/eunice/case/me-safari/docs/implementation-progress.md)
- [Pinned Dependency Versions](file:///Users/eunice/case/me-safari/docs/versions.md)
- [OpenAPI Specification](file:///Users/eunice/case/me-safari/docs/api.openapi.json)
