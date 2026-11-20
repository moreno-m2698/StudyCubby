# ADR 0002: Dev database and media storage

- Status: Accepted
- Date: 2026-11-20

## Context

The old API had no reproducible dev data, covers stored as `Bytes` columns in Postgres, and audio stored under fragile relative paths. We need a repeatable dev environment that can run with a populated or an empty catalog, plus an integration test setup, and media handling that can move to object storage later.

## Decision

**Postgres in Docker for dev and test.** One container, two databases, `studycubby_dev` and `studycubby_test`, on host port 5433 (`apps/api/docker-compose.yml`, `npm run db:up`).

**Prisma 7.** It is the current stable version, pinned `^7`. Prisma 8 is still a release candidate.

**`.env` overrides the shell.** `apps/api/.env` takes precedence over shell environment variables (see `apps/api/src/env.ts`). This was motivated by a machine-wide `DATABASE_URL` pointing at an unrelated cloud database, which silently took precedence over the project's settings. In production there is no `.env` file, so real environment variables apply.

**Media storage.** Bytes live outside the database behind a `StorageDriver` interface: local disk in dev (`apps/api/storage/`, gitignored), with S3 possible later. Files are content-addressed by sha256 (`audio/<sha>.mp3`), which gives deduplication and idempotent reseeding. The database keeps only metadata (`MediaFile`). This replaces covers stored as `Bytes` columns and audio under relative paths.

**Seed profiles** (`npm run db:seed`, `npm run db:seed:empty`):
- `full`: the admin user plus the albums and singles listed in `fixtures/manifest.json`, built from the developer's own media in `apps/api/fixtures/media/`. Both the manifest and the media are gitignored, because the music isn't ours to distribute; `fixtures/manifest.example.json` is the committed template.
- `empty`: the admin user only.

Tests use tiny generated WAV/PNG files instead of the gitignored media, so they run anywhere.

## Consequences

- Developers need Docker. In return, dev, test and production share one database engine and one migration history.
- Seeding is idempotent and cheap thanks to content addressing; identical files are stored once.
- Swapping local disk for S3 means adding one `StorageDriver` implementation.
- The full seed requires the local media folder; without it the seed reports a clear error.

## Alternatives considered

- **SQLite in dev.** Prisma migrations are tied to one provider and locked in `migration_lock.toml`, so SQLite would need a second schema file, `db push`, and two generated clients. SQLite support is also experimental in Prisma 8.
- **`prisma dev` / PGlite.** It handles one connection at a time, and the `prisma dev` command means something different in the Prisma 8 CLI.
- **Keeping media in the database or on relative paths.** Rejected: bloats the database, blocks object storage, and breaks depending on the working directory.
