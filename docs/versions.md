# Pinned runtime and dependency decisions

Selection date: **11 October 2026**. Exact versions are in package manifests and `pnpm-lock.yaml`; avoid `latest` installation commands. Frontend compatibility checks and actual build/device results belong in the verification report.

| Component | Pin | Reason / source |
| --- | --- | --- |
| Node.js | 24.21.0 | Blueprint LTS baseline. Project tooling uses this local runtime; the host's default Node 25.8.1 is not used for acceptance. [Official releases](https://nodejs.org/en/about/previous-releases) |
| pnpm | 12.11.2 | Exact root `packageManager`, lockfile format 9.0 |
| TypeScript | 5.9.3 | Compatible strict TypeScript compiler selected across workspaces; backend uses NodeNext ESM, frontends use bundler resolution |
| NestJS core/common/Fastify | 12.1.2 | Same exact framework version; Fastify adapter [official guide](https://docs.nestjs.com/techniques/performance) |
| Fastify | 5.12.5 | Adapter-compatible major; plugins are Fastify plugins |
| PostgreSQL | 17.11-alpine | Supported PostgreSQL 17 baseline, current supported minor reported by [official version policy](https://www.postgresql.org/support/versioning/); running server reports 17.11 |
| Prisma CLI/client/adapter-pg | 7.10.0 | Highest stable Prisma 7 release from official npm package metadata at selection; explicit generated output and `PrismaPg`, [Prisma 7 guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) |
| pg | 8.23.1 | Official npm package metadata; bounded adapter pool and connection/statement/query timeouts |
| Redis | 8.10.2-alpine | [Official stable release](https://github.com/redis/redis/releases/tag/8.10.2), no-eviction policy plus AOF persistence for BullMQ |
| BullMQ | 6.3.12 | Queue transport behind authoritative database outbox, [official queues guide](https://docs.bullmq.io/guide/queues) |
| Mailpit | v1.31.5 | [Official release](https://github.com/axllent/mailpit/releases/tag/v1.31.5); real SMTP delivery stays on the local machine |
| Argon2 | 0.45.1 | Argon2id with 19,456 KiB, two iterations, one lane, per-hash random salts; [OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |
| PDFKit | 0.20.2 | Backend generation of real private PDFs; [official documentation](https://pdfkit.org/) |
| Expo | 57.0.27 | Mobile-selected stable SDK; native dependency pins checked using its own compatibility workflow |
| React Native | 0.86.3 | Expo-selected compatible native version |
| React (mobile) | 19.2.3 | Expo-compatible selection |
| Next.js | 16.4.0 | Static export only, [official export guide](https://nextjs.org/docs/app/guides/static-exports) |
| React / React DOM (public web) | 19.3.0 | Next.js workspace selection; isolated from native React version |

The explicit Prisma 7 selection remains intentional when the CLI advertises Prisma 8 release candidates. Do not upgrade the database client independently from its adapter and generated schema.

Docker images are exact release tags. Production deployments should additionally record pulled image digests and regularly review security updates. Development Compose keeps database, Redis and SMTP ports on loopback: 5433, 6380, 1025, and Mailpit UI 8025. The differing PostgreSQL/Redis host ports preserve unrelated services already running on 5432/6379.

The workspace path contains a colon. Unix `PATH` entries cannot contain that character, and Docker Desktop rejects colon-containing bind-mount source paths. The local runtime wrapper uses a temporary symlink for Node's executable directory; Compose uses named volumes and the explicit `scripts/init-infra.mjs` command instead of a source bind mount.
