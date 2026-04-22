"use client";

import { useLocale } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";

type DirectionalArrowIconProps = {
  className?: string;
  direction?: "back" | "forward";
};

export default function DirectionalArrowIcon({
  className = "h-4 w-4",
  direction = "back",
}: DirectionalArrowIconProps) {
  const locale = useLocale();
  const isArabic = locale.startsWith("ar");

  const Icon =
    direction === "back"
      ? isArabic
        ? ArrowRight
        : ArrowLeft
      : isArabic
        ? ArrowLeft
        : ArrowRight;

  return <Icon className={className} />;
}
