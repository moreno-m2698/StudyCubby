# ADR 0001: Users, ownership and visibility

- Status: Accepted
- Date: 2026-11-20

## Context

StudyCubby had no notion of users. Anyone could upload and everything was public. We want an ownership model that is ready for real accounts, while keeping dev and testing simple. The product shape is:

- A built-in catalog of music, shown to everyone including anonymous visitors, so the app is not empty on first visit.
- Users who can upload their own music for personal use.

## Decision

**Roles.** Two roles: `ADMIN` and `USER`.

**The catalog.** Albums uploaded by an admin form the public catalog. It is visible to everyone, including anonymous visitors, and is placeholder content until a visitor makes an account.

**User uploads.** Visible only to the uploader. There is no sharing between users, and admins do not see them either. A logged-in user sees the catalog plus their own uploads, and can filter with `scope=mine` (own only) or `scope=catalog` (admin content only). The default is `scope=all`.

**No visibility enum.** Visibility is fully determined by the owner's role: with no sharing and no publish step, nothing else can vary. A stored `PUBLIC`/`PRIVATE` flag could only drift out of sync with the owner (for example a user album marked public). The single source of truth is `apps/api/src/services/visibility.ts`.

**Album-level ownership.** Ownership is stored on `Album` only; tracks inherit it, because every track belongs to an album. Singles are albums with `type = SINGLE`, which removes the old duplicated `Track`/`Single` models.

**404 instead of 403.** Content the viewer cannot see returns 404, so its existence is not leaked and guessing IDs reveals nothing. 403 is used only for writes to albums that are visible but not owned by the caller (catalog albums, for non-admins).

**Dev auth.** Until real auth exists, the `X-Dev-User: <username>` header selects the acting user, with `DEV_DEFAULT_USER` as a fallback. It is active only outside production. Routes only read `req.user`, so real auth will replace just that one middleware.

## Consequences

- The admin cannot have private drafts: anything an admin uploads is immediately public. If needed, add a `publishedAt` column later.
- Changing a user's role changes the visibility of all their uploads. Acceptable with a single admin account.
- Visibility queries join on the owner's role. At this scale the cost is negligible, and `User.role` and `Album.ownerId` are indexed.
- **Known limitation:** `<audio src>` cannot send custom headers, so users' private uploads will not play in the browser under header-based dev auth. Catalog content is unaffected. Cookie or session auth resolves this.

## Alternatives considered

- **A `PUBLIC`/`PRIVATE` visibility enum.** Rejected: redundant with owner role and able to drift out of sync (see above).
- **Deriving visibility per track.** Rejected: every track belongs to an album, so per-track ownership only adds ways for a track and its album to disagree.
- **Testing with seed profiles only, without a User model.** Rejected: it would not exercise ownership or isolation, and the model would have to be retrofitted later.
