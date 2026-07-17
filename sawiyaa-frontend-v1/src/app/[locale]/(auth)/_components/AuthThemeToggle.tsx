"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/stores/theme-store";

export default function AuthThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-text-secondary shadow-theme-xs transition-all duration-200 hover:-translate-y-[1px] hover:border-primary/20 hover:bg-surface-secondary/80 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-border-light dark:bg-surface-secondary dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/10 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-surface"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-text-primary transition-transform duration-300 rotate-0 dark:rotate-180" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-text-primary transition-transform duration-300" />
      )}
    </button>
  );
}
