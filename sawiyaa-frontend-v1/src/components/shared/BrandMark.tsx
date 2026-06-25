import { Link } from "@/i18n/navigation";
import React from "react";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

export default function BrandMark({
  compact = false,
  href = "/",
  onClick,
}: BrandMarkProps) {
  return (
    <Link href={href} onClick={onClick} className="inline-flex items-center">
      <span className="inline-flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary text-lg font-bold text-white shadow-[0_14px_24px_-18px_rgba(68,161,148,0.42)]">
          S
        </span>
        {!compact && (
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-[0.12em] text-primary">
              Sawiyaa
            </span>
            <span className="text-[11px] text-text-secondary">
              Healthcare platform
            </span>
          </span>
        )}
      </span>
    </Link>
  );
}
