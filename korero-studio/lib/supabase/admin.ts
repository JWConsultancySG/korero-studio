import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseEnv } from "./env";

/**
 * Service-role client for server-only tasks (e.g. Stripe webhooks). Bypasses RLS.
 * Never import this from client components.
 */
export function createAdminClient(): SupabaseClient {
  const { url } = assertSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for Stripe webhooks. Add it to .env.local (server-only).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
