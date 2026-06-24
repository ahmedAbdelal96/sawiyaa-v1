"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/stores/theme-store";

export default function ThemeToggle() {
  const t = useTranslations("common.themeToggle");
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-all hover:bg-surface-tertiary hover:text-primary dark:hover:bg-white/10"
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.8} />
      ) : (
        <Moon size={18} strokeWidth={1.8} />
      )}
    </button>
  );
}
