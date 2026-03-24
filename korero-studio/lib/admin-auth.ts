import type { AppRole } from '@/types';

/**
 * Admin access is determined only by `profiles.app_role = 'admin'`.
 * Set roles in Admin → Users (or SQL: UPDATE profiles SET app_role = 'admin' WHERE ...).
 */
export function isAdminFromAppRole(appRole: AppRole | undefined | null): boolean {
  return appRole === 'admin';
}

export function isInstructorOrAdminFromAppRole(appRole: AppRole | undefined | null): boolean {
  return appRole === 'instructor' || appRole === 'admin';
}
