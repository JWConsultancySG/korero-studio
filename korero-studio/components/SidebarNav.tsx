"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  shouldShowAppNav,
  isNavItemActive,
  MAIN_NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  isAdminNavActive,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Shield } from "lucide-react";

export default function SidebarNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { isAdmin, authSessionReady } = useApp();

  if (!shouldShowAppNav(pathname, { authSessionReady, isAdmin })) return null;

  if (isAdmin) {
    return (
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[4.5rem] lg:w-64 flex-col border-r border-border/60 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75"
        aria-label="Admin navigation"
      >
        <div className="h-16 lg:h-[4.25rem] flex items-center justify-center lg:justify-start lg:px-5 border-b border-border/50 shrink-0">
          <Link
            href="/admin?tab=overview"
            className="flex items-center gap-3 rounded-xl p-1.5 -m-1.5 btn-press min-w-0"
          >
            <div className="w-10 h-10 rounded-xl gradient-purple-deep flex items-center justify-center glow-purple shrink-0">
              <Shield className="w-5 h-5 text-primary-foreground" aria-hidden />
            </div>
            <div className="hidden lg:flex flex-col min-w-0">
              <span className="font-black text-foreground tracking-tight text-lg leading-tight truncate">
                Korero
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Admin</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-2 lg:p-3 overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isAdminNavActive(pathname, searchParams, item.tab);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors btn-press",
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", active && "text-primary")} />
                <span className="hidden lg:inline text-sm font-bold truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[4.5rem] lg:w-64 flex-col border-r border-border/60 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75"
      aria-label="Main navigation"
    >
      <div className="h-16 lg:h-[4.25rem] flex items-center justify-center lg:justify-start lg:px-5 border-b border-border/50 shrink-0">
        <Link href="/" className="flex items-center gap-3 rounded-xl p-1.5 -m-1.5 btn-press">
          <div className="w-10 h-10 rounded-xl gradient-purple-deep flex items-center justify-center glow-purple shrink-0">
            <span className="text-lg font-black text-primary-foreground tracking-tight">K</span>
          </div>
          <span className="hidden lg:inline font-black text-foreground tracking-tight text-lg">Korero</span>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-2 lg:p-3 overflow-y-auto">
        {MAIN_NAV_ITEMS.map((tab) => {
          const active = isNavItemActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors btn-press",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <tab.icon className={cn("w-5 h-5 shrink-0", active && "text-primary")} />
              <span className="hidden lg:inline text-sm font-bold truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
