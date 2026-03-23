import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Library,
  Music,
  Users,
  Calendar,
  User,
} from "lucide-react";

export const MAIN_NAV_ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/groups", icon: Music, label: "Groups" },
  { href: "/schedule", icon: CalendarDays, label: "Schedule" },
  { href: "/my-classes", icon: BookOpen, label: "Classes" },
  { href: "/profile", icon: User, label: "Profile" },
];

/** Admin sidebar / bottom nav — matches Admin dashboard sections. */
export type AdminTabId = "overview" | "classes" | "library" | "validate" | "rooms" | "matcher";

export const ADMIN_TAB_IDS: AdminTabId[] = [
  "overview",
  "classes",
  "library",
  "validate",
  "rooms",
  "matcher",
];

export const ADMIN_NAV_ITEMS: {
  href: string;
  tab: AdminTabId;
  icon: LucideIcon;
  label: string;
}[] = [
  { href: "/admin?tab=overview", tab: "overview", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin?tab=classes", tab: "classes", icon: Music, label: "Classes" },
  { href: "/admin?tab=library", tab: "library", icon: Library, label: "Song library" },
  { href: "/admin?tab=validate", tab: "validate", icon: ClipboardCheck, label: "Validation" },
  { href: "/admin?tab=rooms", tab: "rooms", icon: Calendar, label: "Rooms" },
  { href: "/admin?tab=matcher", tab: "matcher", icon: Users, label: "Matcher" },
];

/** Parse ?tab= from /admin URL; invalid values fall back to overview. */
export function parseAdminTab(searchParams: URLSearchParams | null | undefined): AdminTabId {
  const raw = searchParams?.get("tab") ?? "";
  if (ADMIN_TAB_IDS.includes(raw as AdminTabId)) return raw as AdminTabId;
  return "overview";
}

export function isAdminNavActive(
  pathname: string,
  searchParams: URLSearchParams | null | undefined,
  tab: AdminTabId,
): boolean {
  if (pathname !== "/admin") return false;
  return parseAdminTab(searchParams ?? null) === tab;
}

type NavGateOpts = { authSessionReady: boolean; isAdmin: boolean };

/** Whether shell should show any primary nav (sidebar + bottom) + main horizontal padding. */
export function shouldShowAppNav(pathname: string, opts: NavGateOpts): boolean {
  if (isMainNavHidden(pathname)) return false;
  if (pathname.startsWith("/admin")) {
    if (!opts.authSessionReady) return false;
    if (!opts.isAdmin) return false;
  }
  return true;
}

/** Routes where bottom + side nav are hidden (flows, auth). */
export function isMainNavHidden(pathname: string): boolean {
  return (
    pathname === "/groups/new" ||
    pathname.startsWith("/booking") ||
    pathname === "/register" ||
    pathname === "/login" ||
    pathname === "/feedback" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth")
  );
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
