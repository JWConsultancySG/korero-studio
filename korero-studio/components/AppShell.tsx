"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { shouldShowAppNav } from "@/lib/nav";
import SidebarNav from "@/components/SidebarNav";
import { useApp } from "@/context/AppContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { isAdmin, authSessionReady } = useApp();
  const showChrome = shouldShowAppNav(pathname, { authSessionReady, isAdmin });

  return (
    <div className="min-h-screen flex flex-col">
      {showChrome && (
        <Suspense fallback={null}>
          <SidebarNav />
        </Suspense>
      )}
      <main
        className={cn(
          "flex-1 min-w-0 w-full",
          showChrome &&
            "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0 md:pl-[4.5rem] lg:pl-64",
        )}
      >
        {children}
      </main>
    </div>
  );
}
