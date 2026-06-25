"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/stores/theme-store";

export default function AuthThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-text-secondary shadow-theme-xs transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:border-primary/20 hover:bg-primary-light/40 dark:border-border-light dark:bg-surface-secondary dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/10 focus:outline-none"
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
