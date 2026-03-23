"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  shouldShowAppNav,
  isNavItemActive,
  MAIN_NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  isAdminNavActive,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { isAdmin, authSessionReady } = useApp();

  if (!shouldShowAppNav(pathname, { authSessionReady, isAdmin })) {
    return null;
  }

  if (isAdmin) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50">
        <div className="flex items-stretch max-w-lg mx-auto min-h-[4.25rem] px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {ADMIN_NAV_ITEMS.map((tab) => {
            const isActive = isAdminNavActive(pathname, searchParams, tab.tab);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pt-1"
              >
                {isActive && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                    <motion.div
                      layoutId="admin-nav-indicator"
                      className="h-[3px] w-8 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-colors",
                    isActive ? "bg-accent" : "",
                  )}
                >
                  <tab.icon
                    className={cn(
                      "w-[18px] h-[18px] transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[9px] font-bold leading-tight text-center px-0.5 line-clamp-2",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50">
      <div className="flex items-stretch max-w-md mx-auto h-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {MAIN_NAV_ITEMS.map((tab) => {
          const isActive = isNavItemActive(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1"
            >
              {isActive && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                  <motion.div
                    layoutId="nav-indicator"
                    className="h-[3px] w-10 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                </div>
              )}
              <div className={cn("p-2 rounded-xl transition-colors", isActive ? "bg-accent" : "")}>
                <tab.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
