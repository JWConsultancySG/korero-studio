import type { SongGroup } from "@/types";

/** Stable key for matching iTunes / student listings to the validated song library. */
export function makeSongKey(songTitle: string, artist: string): string {
  return `${songTitle.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
}

/** Canonical key for a group row (prefers explicit `songKey` when present). */
export function groupSongKey(g: SongGroup): string {
  return g.songKey ?? makeSongKey(g.songTitle, g.artist);
}
