# StudyCubby

A lo-fi music player for studying: browse albums and singles, play them in a persistent player, and upload your own music.

This monorepo consolidates the earlier `StudyCubby` (frontend), `StudyCubbyExpress` (backend), and `StudyCubbyBackendV2` repositories.

## Layout

```
apps/
  web/   React 18 + TypeScript + Vite + React Query (deployed to Netlify)
  api/   Express 5 + TypeScript + Prisma 7 + Postgres (Docker), multer for uploads
docs/
  api.md   API contract
  adr/     Architecture decision records
```

Docs: [API contract](docs/api.md), [ADR 0001: users, ownership and visibility](docs/adr/0001-users-ownership-visibility.md), [ADR 0002: dev database and media storage](docs/adr/0002-dev-database-and-media-storage.md).

## Getting started

Requires Node 20+ and Docker Desktop (running).

```bash
npm install                                   # all workspaces; also generates the Prisma client
cp apps/api/.env.example apps/api/.env        # local defaults that match docker-compose
npm run db:up                                 # start Postgres (container: studycubby-postgres)
npm run db:migrate                            # create the tables
# add seed media; see "Seed media" below
npm run db:seed                               # populated catalog (or: npm run db:seed:empty)
npm run dev:api                               # API on http://localhost:3000
npm run dev:web                               # web app
```

`apps/api/.env` takes priority over variables already set in your shell, so a stray global `DATABASE_URL` can't point the API at the wrong database.

The web app reads `VITE_API_URL` (default `http://localhost:3000`) and, optionally, `VITE_DEV_USER`. To change them, copy `apps/web/.env.example` to `apps/web/.env`.

### Local database

`apps/api/docker-compose.yml` runs one Postgres 17 container, **`studycubby-postgres`**, on host port **5433**. The port avoids clashing with any local Postgres on 5432. The container holds two databases:

| Database | Used by |
|---|---|
| `studycubby_dev` | `npm run dev:api`, seeding, Prisma Studio |
| `studycubby_test` | `npm run test:api` only. Migrated automatically before each run; your dev data is never touched |

Data lives in the Docker volume `studycubby_pgdata`, so it survives restarting or recreating the container.

**Starting from scratch:** delete the `studycubby-postgres` container **and** the `studycubby_pgdata` volume. Either do it in Docker Desktop (delete the container first, or the volume delete is refused), or run `docker compose -f apps/api/docker-compose.yml down -v`. Then run:

```bash
npm run db:up && npm run db:migrate && npm run db:seed
```

Both databases are created when the container starts on a fresh volume.

### Seed media

The music used for seeding is **not in git**, because it isn't ours to distribute. Two gitignored pieces stay on your machine:

- **The media:** `apps/api/fixtures/media/` holds the audio and cover images.
- **The manifest:** `apps/api/fixtures/manifest.json` says which files to load and how. Create it from the committed template:

```bash
cp apps/api/fixtures/manifest.example.json apps/api/fixtures/manifest.json
```

Give each album its own folder, containing its tracks **and** its cover image:

```
apps/api/fixtures/media/
└── <album-name>/
    ├── cover.png
    ├── <track-01>.mp3
    ├── <track-02>.mp3
    └── ...
```

Then replace the `<placeholders>` in `fixtures/manifest.json` with your own folders and files. Each folder needs a matching entry:

```jsonc
{
  "albums": [
    {
      "title": "<album-name>",
      "artist": "<artist>",
      "type": "ALBUM",                 // ALBUM | SINGLE | EP
      "dir": "<album-name>",           // folder name under fixtures/media/, matched exactly
      "cover": "cover.png",
      "tracks": [
        { "file": "<track-01>.mp3", "title": "<track title>" },
        { "file": "<track-02>.mp3", "title": "<track title>" }
      ]
    },
    {
      "title": "<single-name>",
      "artist": "<artist>",
      "type": "SINGLE",                // exactly one track
      "dir": "<album-name>",           // singles can reuse files from an album folder
      "cover": "cover.png",
      "tracks": [{ "file": "<track-02>.mp3", "title": "<single-name>" }]
    }
  ]
}
```

- **Ownership.** Everything is owned by `admin`, so it all appears in the public catalog.
- **Shared files.** Files shared between albums are stored once, because storage is keyed by file content.
- **Formats.**
  - Audio: mp3, wav, flac, m4a, ogg.
  - Covers: png, jpeg, webp.
  - The type is checked from the file contents, not the extension.
- **Validating first.** To check the manifest and files without changing anything, run `npm run db:seed:check`.

If anything is missing, the seed stops **before** wiping the database and tells you what to fix. It covers four cases: no manifest (it shows the `cp` command above), no media folder at all, an album folder that isn't there (listing what is there instead), or specific missing tracks or cover. To point the seed at media stored elsewhere, set `SEED_MEDIA_DIR` in `apps/api/.env`.

### Commands

| Command | What it does |
|---|---|
| `npm run dev:web` | Vite dev server |
| `npm run dev:api` | API with `tsx watch` on :3000 |
| `npm run build` / `npm run build:api` | Build the web app / the API |
| `npm run lint` | Lint the web app |
| `npm run typecheck:api` | Type-check the API |
| `npm run test:api` | API unit + integration tests (needs `npm run db:up`; uses generated test media, not your seed media) |
| `npm run db:up` / `npm run db:down` | Start / stop the Postgres container |
| `npm run db:migrate` | Apply Prisma migrations to the dev database |
| `npm run db:seed` | Reset the dev database and storage, then load the full catalog from the manifest |
| `npm run db:seed:empty` | Reset the dev database and storage, leaving only the `admin` user |
| `npm run db:seed:check` | Validate the manifest and seed media without changing anything |
| `npm run db:reset` | Drop and re-create the dev database schema, then run the full seed |

Uploaded and seeded media are written to `apps/api/storage/` (gitignored), and seeding clears that folder.

## Testing scenarios

**Populated vs empty catalog.** `npm run db:seed` loads the admin plus everything in the manifest. `npm run db:seed:empty` leaves only the admin, so the app has no music, which is the "nothing uploaded yet" state.

**Acting as a user.** Until real auth exists, the `X-Dev-User` header picks the user; `DEV_DEFAULT_USER` in `apps/api/.env` sets a fallback. Admin uploads join the public catalog. Regular users' uploads are visible only to them. See [ADR 0001](docs/adr/0001-users-ownership-visibility.md).

```bash
curl localhost:3000/albums                                      # anonymous: catalog only
curl "localhost:3000/albums?scope=mine"                         # 401 when anonymous
curl -H "X-Dev-User: admin" "localhost:3000/albums?scope=mine"  # the admin's own uploads
curl -H "X-Dev-User: admin" -F title=T -F artist=A -F type=SINGLE \
     -F tracks=@song.mp3 -F cover=@cover.png localhost:3000/albums   # upload (admin uploads join the catalog)
```

For the web app, set `VITE_DEV_USER=admin` in `apps/web/.env` to act as that user.

## Known issues

- **Private uploads don't play in the browser.** Under the dev auth, users' private uploads won't play there, because `<audio>`/`<img>` can't send the `X-Dev-User` header. Catalog content is unaffected; cookie or session auth will fix this.
- **Concurrent appends can clash.** Two simultaneous `POST /albums/:id/tracks` to the same album can collide on track numbers and return a 500.
- **Old covers aren't cleaned up.** Replacing a cover leaves the previous image in storage.
- **The upload page asks for the album ID by hand** when adding tracks.
- **Web lint fails.** `npm run lint` reports existing errors in the upload components.

The API is on current versions (Express 5, Prisma 7). The web app still uses 2023 dependencies (Vite 4, React Query v4); `vite-plugin-environment` is pinned to `1.1.3` because newer versions require Vite 8.
