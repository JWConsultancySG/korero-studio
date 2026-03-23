/** Normalize to digits; assume Singapore +65 if 8 digits. */
export function toWhatsAppE164Digits(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length >= 10) return d;
  if (d.length === 8) return `65${d}`;
  if (d.length === 9 && d.startsWith("9")) return `65${d}`;
  return d;
}
