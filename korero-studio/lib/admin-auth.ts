import type { User } from "@supabase/supabase-js";

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Email of the single shared admin account — set in `.env.local` as `NEXT_PUBLIC_ADMIN_EMAIL`.
 * Must match the Supabase Auth user you create for admin (Authentication → Users).
 */
export function getConfiguredAdminEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
  return v && v.length > 0 ? normalizeAdminEmail(v) : null;
}

/**
 * Whether this Supabase user is allowed to use `/admin` and admin-only flows.
 * - Matches `NEXT_PUBLIC_ADMIN_EMAIL`, or
 * - `app_metadata.korero_admin === true`, or
 * - `app_metadata.role === "admin"` (set in Supabase Dashboard → User → App Metadata).
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  if (meta?.korero_admin === true) return true;
  if (meta?.role === "admin") return true;
  const configured = getConfiguredAdminEmail();
  if (configured && normalizeAdminEmail(user.email) === configured) return true;
  return false;
}
