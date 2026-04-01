/** Suffix so Profile UI can render a link (`lib/notification-deep-link.ts`). */
export function buildLessonPaymentDueMessage(songTitle: string, artist: string, classId: string): string {
  const safeTitle = songTitle.trim() || "Your class";
  const safeArtist = artist.trim() || "—";
  const body = `Lesson schedule for "${safeTitle}" — ${safeArtist} is confirmed.\nOpen the class page to review times and confirm payment.`;
  return `${body}\n\nKORERO_LINK:/browse/${classId}`;
}
