/** Stable key for matching iTunes / student listings to the validated song library. */
export function makeSongKey(songTitle: string, artist: string): string {
  return `${songTitle.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
}
