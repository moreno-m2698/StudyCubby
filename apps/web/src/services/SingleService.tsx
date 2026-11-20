import { Track } from "../types";
import { api, TrackDto } from "./api";
import { toTrack } from "./TrackService";

// Singles are albums of type SINGLE with one track; returned as playable tracks.
export async function getSingle(): Promise<Track[]> {
  try {
    const albums = await api.get<{ items: { id: number }[] }>("/albums", { params: { type: "SINGLE" } });
    const ids = new Set(albums.data.items.map((a) => a.id));
    const tracks = await api.get<{ items: TrackDto[] }>("/tracks");
    return tracks.data.items.filter((t) => ids.has(t.albumId)).map((dto) => toTrack(dto));
  } catch (error) {
    console.error("There was an issue accessing singles", error);
    return [];
  }
}
