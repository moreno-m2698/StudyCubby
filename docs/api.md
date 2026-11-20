# StudyCubby API

Base URL in dev: `http://localhost:3000`. All JSON. Wire types live in `apps/api/src/services/dto.ts`.

## Identity (dev only)

Until real auth exists, the current user is chosen per request by the dev-auth middleware
(`apps/api/src/auth/devAuth.ts`, mounted only when `NODE_ENV !== 'production'`):

| Request | Acts as |
|---|---|
| `X-Dev-User: <username>` | that user; **401** if the username does not exist |
| `X-Dev-User: anonymous` | anonymous |
| no header | `DEV_DEFAULT_USER` if set, otherwise anonymous |

Seeded users: `admin` (role `ADMIN`). Real auth will replace only this middleware; routes read `req.user`.

## Visibility

Derived from the album owner's role (see `docs/adr/0001-users-ownership-visibility.md`):

- Albums owned by an **ADMIN** form the **catalog** and are visible to everyone, including anonymous viewers.
- Albums owned by a **USER** are visible **only to that user**. There is no sharing. Admins do not see them either.
- Tracks inherit visibility from their album.
- Something that exists but is not visible to the viewer returns **404**, never 403.

List endpoints accept `scope`:

| `scope` | Returns | Anonymous |
|---|---|---|
| `all` (default) | catalog + the viewer's own albums | catalog only |
| `catalog` | admin-owned albums only | allowed |
| `mine` | only the viewer's own albums | **401** |

## Types

```ts
type AlbumType = 'ALBUM' | 'SINGLE' | 'EP';

interface AlbumSummary {
  id: number; title: string; artist: string; type: AlbumType;
  isCatalog: boolean;      // owned by an admin
  isMine: boolean;         // owned by the viewer
  coverUrl: string | null; // relative, e.g. "/albums/1/cover?v=3"
  trackCount: number;
  createdAt: string;       // ISO 8601
}

interface TrackDto {
  id: number; title: string; artist: string;
  trackNumber: number;     // 1-based within the album
  durationMs: number | null;
  albumId: number; albumTitle: string; albumType: AlbumType;
  coverUrl: string | null; // the album's cover
  audioUrl: string;        // relative, e.g. "/tracks/7/audio"
}

interface AlbumDetail extends AlbumSummary { tracks: TrackDto[] } // ordered by trackNumber

interface ListResponse<T> { items: T[] }

interface ErrorBody { error: { code: string; message: string } }
```

## Endpoints

### Reads

| Method & path | Response |
|---|---|
| `GET /health` | `{ ok: true }` |
| `GET /me` | `{ user: { id, username, role } \| null }` |
| `GET /albums?type=&scope=` | `ListResponse<AlbumSummary>`, newest first. `type` optional: `ALBUM`, `SINGLE`, `EP` |
| `GET /albums/:id` | `AlbumDetail` |
| `GET /albums/:id/cover` | image bytes. Real `Content-Type` from `MediaFile.mimeType`; `ETag`; `Cache-Control: public, max-age=86400` for catalog albums, `private, max-age=0, must-revalidate` otherwise. 404 if the album has no cover |
| `GET /tracks?albumId=&scope=` | `ListResponse<TrackDto>`: all visible tracks, singles included; ordered by album newest first, then trackNumber |
| `GET /tracks/:id` | `TrackDto` |
| `GET /tracks/:id/audio` | audio bytes with **Range** support (`206 Partial Content`, `Accept-Ranges: bytes`), real `Content-Type`, same caching rule as covers |

### Writes (require a user; any role)

The uploader becomes the owner: admin uploads join the catalog, user uploads are private to that user.

| Method & path | Body (multipart/form-data) | Response |
|---|---|---|
| `POST /albums` | `title` (required), `artist` (required), `type` (default `ALBUM`), `cover` (optional image file), `tracks` (0..n audio files), `titles` (one per track, same order; falls back to the file name without extension) | `201 AlbumDetail` |
| `POST /albums/:id/tracks` | `tracks` (1..n), `titles` | `201 ListResponse<TrackDto>`; numbered after the album's current last track. Owner only |
| `PUT /albums/:id/cover` | `cover` (image file) | `200 AlbumSummary`. Owner only |

Rules:
- A `SINGLE` must have exactly one track in total (on create, and appending to a single is rejected): **400**.
- A write to an album you can see but don't own (i.e. catalog content as a non-admin user): **403**. One you can't see: **404**.
- Track `artist` defaults to the album's artist.
- Files are type-checked by sniffing the bytes. Audio: mp3, wav, flac, m4a/mp4, ogg. Images: png, jpeg, webp. Otherwise **415**.
- Size limits: audio 50 MB per file, image 10 MB: **413**.

## Status codes

| Code | `error.code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | validation failure, malformed id (`/albums/abc`), unknown `scope`/`type` |
| 401 | `UNAUTHORIZED` | write without a user, `scope=mine` while anonymous, unknown `X-Dev-User` |
| 403 | `FORBIDDEN` | write to visible-but-not-owned album |
| 404 | `NOT_FOUND` | missing or not visible |
| 413 | `PAYLOAD_TOO_LARGE` | file over limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | file type not allowed |
| 500 | `INTERNAL` | anything else (logged server-side, message not leaked) |
