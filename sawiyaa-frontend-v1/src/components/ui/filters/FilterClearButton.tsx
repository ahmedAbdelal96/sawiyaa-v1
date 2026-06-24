"use client";

import { useLocale } from "next-intl";
import Button from "@/components/ui/button/Button";

type FilterClearButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export default function FilterClearButton({
  onClick,
  disabled = false,
  className,
}: FilterClearButtonProps) {
  const locale = useLocale();
  const label = locale.startsWith("ar") ? "مسح الفلاتر" : "Clear filters";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {label}
    </Button>
  );
}

