import axios from "axios";

export const API_URL: string = process.env.VITE_API_URL ?? "http://localhost:3000";

const devUser = process.env.VITE_DEV_USER;

// Shared axios instance. In dev, VITE_DEV_USER selects the acting user via X-Dev-User.
export const api = axios.create({
    baseURL: API_URL,
    headers: devUser ? { "X-Dev-User": devUser } : {},
});

// The API returns media URLs as relative paths; prefix them with the API base URL.
export function mediaUrl(relativePath: string): string {
    return `${API_URL}${relativePath}`;
}

// Wire types (see docs/api.md).
export interface AlbumSummaryDto {
    id: number;
    title: string;
    artist: string;
    type: "ALBUM" | "SINGLE" | "EP";
    coverUrl: string | null;
    trackCount: number;
}

export interface TrackDto {
    id: number;
    title: string;
    artist: string;
    trackNumber: number;
    albumId: number;
    coverUrl: string | null;
    audioUrl: string;
}
