"use client";

import * as React from "react";

type ThemeName = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class";
  defaultTheme?: ThemeName;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: string) => void;
  resolvedTheme: "light" | "dark";
  themes: string[];
  systemTheme: "light" | "dark";
};

const STORAGE_KEY = "theme";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemeName, enableSystem: boolean): "light" | "dark" {
  if (enableSystem && theme === "system") return getSystemTheme();
  return theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setThemeState] = React.useState<ThemeName>(defaultTheme);

  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /** Until mounted, keep stable SSR + first client paint (matches theme-init script + avoids hydration mismatch). */
  const resolvedTheme: "light" | "dark" = mounted ? resolveTheme(theme, enableSystem) : "light";
  const systemTheme: "light" | "dark" = mounted ? getSystemTheme() : "light";

  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const apply = (r: "light" | "dark") => {
      if (attribute === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(r);
      }
      root.style.colorScheme = r;
    };
    const r = resolveTheme(theme, enableSystem);
    if (disableTransitionOnChange) {
      const style = document.createElement("style");
      style.appendChild(
        document.createTextNode(
          "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
        ),
      );
      document.head.appendChild(style);
      apply(r);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.head.removeChild(style);
        });
      });
    } else {
      apply(r);
    }
  }, [theme, mounted, attribute, enableSystem, disableTransitionOnChange]);

  React.useEffect(() => {
    if (!mounted || !enableSystem || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = getSystemTheme();
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(r);
      document.documentElement.style.colorScheme = r;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted, enableSystem]);

  const setTheme = React.useCallback((t: string) => {
    const next = t as ThemeName;
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
      systemTheme,
    }),
    [theme, setTheme, resolvedTheme, enableSystem, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: undefined as string | undefined,
      setTheme: () => {},
      resolvedTheme: undefined as "light" | "dark" | undefined,
      themes: [] as string[],
      systemTheme: undefined as "light" | "dark" | undefined,
    };
  }
  return ctx;
}
