import type { Prisma, Role } from '../generated/prisma/client.ts';
import { HttpError } from '../errors.ts';
import type { AuthUser } from '../types/express.d.ts';

/**
 * Visibility is derived from the album owner's role (docs/adr/0001-users-ownership-visibility.md):
 * - albums owned by an ADMIN are the public catalog, visible to everyone;
 * - albums owned by a USER are visible only to that user.
 * This module is the single source of truth for that rule.
 */

export const SCOPES = ['all', 'catalog', 'mine'] as const;
export type Scope = (typeof SCOPES)[number];

export const catalogWhere = { owner: { role: 'ADMIN' } } as const satisfies Prisma.AlbumWhereInput;

/** Albums the viewer may see. */
export function albumVisibleTo(viewer: AuthUser | null): Prisma.AlbumWhereInput {
  if (!viewer) return catalogWhere;
  return { OR: [catalogWhere, { ownerId: viewer.id }] };
}

/** Albums matching a list `scope`, already restricted to what the viewer may see. */
export function albumScopeWhere(viewer: AuthUser | null, scope: Scope): Prisma.AlbumWhereInput {
  switch (scope) {
    case 'all':
      return albumVisibleTo(viewer);
    case 'catalog':
      return catalogWhere;
    case 'mine':
      if (!viewer) throw HttpError.unauthorized('scope=mine requires a signed-in user');
      return { ownerId: viewer.id };
  }
}

export function isCatalogRole(role: Role): boolean {
  return role === 'ADMIN';
}
