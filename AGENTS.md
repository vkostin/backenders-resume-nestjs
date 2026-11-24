# Agent notes

## Commands

- `npm run build` — typecheck + compile (`nest build`)
- `npm test` — Jest integration tests; requires Docker (Testcontainers PostgreSQL 17)
- `docker compose up --build` — full stack: Postgres 17, Silo, API; entrypoint migrates, seeds, starts
- Seed CLI standalone: `SEED_MEDIA=none node dist/seed/cli.js` (after `npm run build`)
- Generate a migration: `npx prisma migrate dev --name <name>` against a scratch Postgres

## Architecture invariants

- Prisma is private to `src/persistence/`. Nothing outside it may import
  `@prisma/client` or build queries. Sole exception: the standalone seed CLI
  (`src/seed/`), which owns its own `PrismaClient`.
- GraphQL resolvers never touch Prisma or S3 directly. Nested fields go
  through per-request DataLoaders (`src/portfolio/loaders.ts`) calling
  `PortfolioQueries`; mutations go through `PortfolioMutations` (rows only) /
  `MediaMutations` (anything that also touches `MediaStorage`).
- The seed (`src/seed/`) is a standalone CLI, not part of the Nest app.
  It only writes when the DB has no Profile, unless `SEED_RESET=1`.
- `S3_PUBLIC_BASE_URL` + stored key = public media URL. Reads never call
  the S3 API.
- Object keys are server-generated (`uploads/<uuid>.<ext>`); never trust
  client file names. Uploads: object first, then row; deletes: row first,
  then object (best-effort).
- Mutations require the `X-Admin-Token` header == `ADMIN_TOKEN`.
- Apollo CSRF stays on: multipart uploads need
  `Apollo-Require-Preflight: true`.

## Conventions

- GraphQL types/ADRs/code comments in English; seeded user-facing content
  and README in Russian; skill names in English.
- Ordered lists use explicit sort-order columns; new items append by
  default, `idx` arg reorders.
- Errors surface as GraphQLError with `extensions.code`:
  `NOT_FOUND`, `BAD_USER_INPUT`, `UNAUTHENTICATED`, `CONFLICT` (unique
  name taken). Domain code throws `PortfolioError` / `InvalidYearMonthError`;
  `src/portfolio/errors.ts` maps them.
- Integration tests assert bounded SQL query counts — keep loaders batched.
- `doc/resume-resone.md` contains personal data; do not commit it or expose
  phone/birth-date fields in the API.
- Local git only; no remote, no push.
