# StudyCubby

A lo-fi music player for studying: browse albums and singles, play them in a persistent player, and upload your own music.

This monorepo consolidates the earlier `StudyCubby` (frontend), `StudyCubbyExpress` (backend), and `StudyCubbyBackendV2` repositories.

## Layout

```
apps/
  web/   React 18 + TypeScript + Vite + React Query (deployed to Netlify)
  api/   Express + Prisma + PostgreSQL, multer for uploads
```

## Getting started

```bash
npm install                       # installs all workspaces
npm run prisma:generate -w @studycubby/api
```

**Web** — the API endpoints default to the local API (`http://localhost:3000/album`, `/single`, `/track`; see `apps/web/vite.config.ts`). To point elsewhere, copy `apps/web/.env.example` to `apps/web/.env` or set `VITE_ALBUM_ENDPOINT`, `VITE_SINGLE_ENDPOINT` and `VITE_TRACK_ENDPOINT` in the environment.

**API** — copy `apps/api/.env.reference` to `apps/api/.env` and set `DATABASE_URL` to a Postgres instance. Old migrations were not carried over; create a fresh one with:

```bash
cd apps/api && npx prisma migrate dev --name init
```

Uploaded audio is written to `apps/api/library/` (gitignored).

| Command | What it does |
|---|---|
| `npm run dev:web` | Vite dev server |
| `npm run dev:api` | API with nodemon on :3000 |
| `npm run build` | Type-check and build the web app |

## Known issues (carried over from the old repos)

API (`apps/api/express/routes/`):
- `POST /track/upload` can send a 500 and then continue to send a 200 ("headers already sent"), and crashes if the album isn't found.
- `findUnique` results are never null-checked, so an unknown id crashes the request.
- `GET /single/image/:id` logs `single.title` without selecting it.
- All images are served as `image/png` regardless of upload type.
- Port 3000 is hard-coded.

Web (`apps/web/src/services/`):
- Every track's audio and every cover is fetched as a blob, sequentially, before the list renders, so load time grows with library size.
- CSS imports were removed on the old `frontendV2` branch; the styles in `src/CSS/` are present but not wired up.

Dependencies are from 2023 (Vite 4, React Query v4, Prisma 5). `vite-plugin-environment` is pinned to `1.1.3` because newer versions require Vite 8.
