import { useEffect, useState, ReactNode } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from "./ui/button";
import {
  activeTheme,
  getNextTheme,
  getTheme,
  Theme,
  ThemeProviderContext,
  useTheme,
} from "@/components/ThemeProviderState.ts";

export type { Theme } from "@/components/ThemeProviderState.ts";

type ThemeProviderProps = {
  children?: ReactNode;
  defaultTheme?: Theme;
};

export function ThemeProvider({
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => getTheme() || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      activeTheme(newTheme);
      setTheme(newTheme);
    },
    toggleTheme: () => {
      const nextTheme: Theme = getNextTheme(theme);
      activeTheme(nextTheme);
      setTheme(nextTheme);
    },
  };

  return <ThemeProviderContext.Provider {...props} value={value} />;
}

export function ThemeToggle({ className, size = "icon" }: { className?: string; size?: "icon" | "icon-md" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => toggleTheme?.()}
      className={`!m-0 ${className || ''}`}
    >
      <Sun
        className={`h-4 w-4 transition-all ${theme === "light" ? "relative rotate-0 scale-100" : "absolute -rotate-90 scale-0"}`}
      />
      <Moon
        className={`h-4 w-4 transition-all ${theme === "dark" ? "relative rotate-0 scale-100" : "absolute rotate-90 scale-0"}`}
      />
      <Monitor
        className={`h-4 w-4 transition-all ${theme === "system" ? "relative rotate-0 scale-100" : "absolute rotate-90 scale-0"}`}
      />
    </Button>
  );
}

export default ThemeToggle;
