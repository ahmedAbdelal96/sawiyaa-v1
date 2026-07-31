import { Link } from "@/i18n/navigation";
import React from "react";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  asButton?: boolean;
};

const logoMark = (
  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary text-lg font-bold text-white shadow-[0_14px_24px_-18px_rgba(68,161,148,0.42)]">
    S
  </span>
);

export default function BrandMark({
  compact = false,
  href = "/",
  onClick,
  asButton = false,
}: BrandMarkProps) {
  const inner = (
    <span className="inline-flex items-center gap-3">
      {logoMark}
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
  );

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        className="inline-flex items-center"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>} className="inline-flex items-center">
      {inner}
    </Link>
  );
}

