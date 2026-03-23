"use client";

import * as React from "react";

export type AppBreakpoint = "mobile" | "tablet" | "desktop";

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

function getBreakpoint(width: number): AppBreakpoint {
  if (width >= DESKTOP_MIN) return "desktop";
  if (width >= TABLET_MIN) return "tablet";
  return "mobile";
}

/** Tracks mobile (under 768px), tablet (768–1023), desktop (1024+) for layout decisions. */
export function useBreakpoint(): AppBreakpoint {
  const [bp, setBp] = React.useState<AppBreakpoint>("mobile");

  React.useEffect(() => {
    const onResize = () => setBp(getBreakpoint(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}
