/**
 * Reads Supabase URL + key from env. Supports both dashboard names:
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (newer)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy; same role for the browser client)
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabasePublishableOrAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function assertSupabaseEnv(): { url: string; key: string } {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableOrAnonKey();
  if (!url || !key) {
    throw new Error(
      "Supabase URL and API key are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local in the same folder as package.json, save the file, then restart `npm run dev`.",
    );
  }
  return { url, key };
}
