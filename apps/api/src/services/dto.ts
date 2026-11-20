import type { AlbumType, Prisma } from '../generated/prisma/client.ts';
import type { AuthUser } from '../types/express.d.ts';
import { isCatalogRole } from './visibility.ts';

/** Wire shapes. Keep in sync with docs/api.md. Media URLs are relative to the API base URL. */

export interface AlbumSummary {
  id: number;
  title: string;
  artist: string;
  type: AlbumType;
  /** Owned by an admin, so visible to everyone. */
  isCatalog: boolean;
  /** Owned by the current viewer. */
  isMine: boolean;
  coverUrl: string | null;
  trackCount: number;
  createdAt: string;
}

export interface TrackDto {
  id: number;
  title: string;
  artist: string;
  trackNumber: number;
  durationMs: number | null;
  albumId: number;
  albumTitle: string;
  albumType: AlbumType;
  coverUrl: string | null;
  audioUrl: string;
}

export interface AlbumDetail extends AlbumSummary {
  tracks: TrackDto[];
}

export interface ListResponse<T> {
  items: T[];
}

export const albumSummaryInclude = {
  owner: { select: { id: true, role: true } },
  _count: { select: { tracks: true } },
} as const satisfies Prisma.AlbumInclude;

export type AlbumForSummary = Prisma.AlbumGetPayload<{ include: typeof albumSummaryInclude }>;

export const trackInclude = {
  album: { select: { id: true, title: true, type: true, coverId: true } },
} as const satisfies Prisma.TrackInclude;

export type TrackForDto = Prisma.TrackGetPayload<{ include: typeof trackInclude }>;

/** `?v=` busts browser caches when a cover is replaced. */
export function coverUrl(album: { id: number; coverId: number | null }): string | null {
  return album.coverId == null ? null : `/albums/${album.id}/cover?v=${album.coverId}`;
}

export function audioUrl(trackId: number): string {
  return `/tracks/${trackId}/audio`;
}

export function toAlbumSummary(album: AlbumForSummary, viewer: AuthUser | null): AlbumSummary {
  return {
    id: album.id,
    title: album.title,
    artist: album.artist,
    type: album.type,
    isCatalog: isCatalogRole(album.owner.role),
    isMine: viewer != null && album.owner.id === viewer.id,
    coverUrl: coverUrl(album),
    trackCount: album._count.tracks,
    createdAt: album.createdAt.toISOString(),
  };
}

export function toTrackDto(track: TrackForDto): TrackDto {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    trackNumber: track.trackNumber,
    durationMs: track.durationMs,
    albumId: track.album.id,
    albumTitle: track.album.title,
    albumType: track.album.type,
    coverUrl: coverUrl(track.album),
    audioUrl: audioUrl(track.id),
  };
}
