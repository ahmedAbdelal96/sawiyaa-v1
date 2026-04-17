import { Link } from "@/i18n/navigation";
import React from "react";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export default function BrandMark({
  compact = false,
  href = "/",
}: BrandMarkProps) {
  return (
    <Link href={href} className="inline-flex items-center">
      <span className="inline-flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white shadow-sm">
          F
        </span>
        {!compact && (
          <span className="flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Fayed
            </span>
            <span className="text-xs text-text-secondary">
              Care Platform Base
            </span>
          </span>
        )}
      </span>
    </Link>
  );
}
