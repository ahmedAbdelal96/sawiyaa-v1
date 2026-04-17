"use client";

import { useLocale } from "next-intl";

type AdvancedFiltersToggleButtonProps = {
  expanded: boolean;
  hasHiddenActive?: boolean;
  onToggle: () => void;
};

export default function AdvancedFiltersToggleButton({
  expanded,
  hasHiddenActive = false,
  onToggle,
}: AdvancedFiltersToggleButtonProps) {
  const locale = useLocale();
  const isArabic = locale === "ar";

  const label = expanded
    ? isArabic
      ? "فلاتر أقل"
      : "Fewer filters"
    : hasHiddenActive
      ? isArabic
        ? "فلاتر أكثر •"
        : "More filters •"
      : isArabic
        ? "فلاتر أكثر"
        : "More filters";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="app-button app-button-outline h-11 px-4 text-sm"
    >
      {label}
    </button>
  );
}
