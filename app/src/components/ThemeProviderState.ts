import { createContext, useContext } from "react";
import { getMemory, setMemory } from "@/utils/memory.ts";
import { themeEvent } from "@/events/theme.ts";

export type Theme = "dark" | "light" | "system";

export const defaultTheme: Theme = "system";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme?: () => void;
};

export function activeTheme(theme: Theme) {
  const root = window.document.documentElement;

  root.classList.remove("light", "dark");
  let actualTheme = theme;
  if (theme === "system") {
    actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  root.classList.add(actualTheme);
  setMemory("theme", theme);
  themeEvent.emit(actualTheme);
}

export function getTheme() {
  return (getMemory("theme") as Theme) || defaultTheme;
}

export function getNextTheme(current: Theme): Theme {
  return current === "system" ? "dark" : current === "dark" ? "light" : "system";
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: (theme: Theme) => {
    activeTheme(theme);
  },
  toggleTheme: () => {
    const key = getMemory("theme");
    const current = (key.length > 0 ? (key as Theme) : defaultTheme) as Theme;
    const next = getNextTheme(current);
    activeTheme(next);
  },
};

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
