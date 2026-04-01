/** Matches suffix written by `buildLessonPaymentDueMessage` in `lib/notification-messages.ts`. */
const MARKER = "\n\nKORERO_LINK:";

export function parseNotificationDeepLink(message: string): { text: string; href?: string } {
  const idx = message.lastIndexOf(MARKER);
  if (idx === -1) return { text: message };
  const path = message.slice(idx + MARKER.length).trim();
  if (!path.startsWith("/")) return { text: message };
  return { text: message.slice(0, idx).trim(), href: path };
}
