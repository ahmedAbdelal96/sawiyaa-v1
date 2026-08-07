import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import Image from "next/image";
import React from "react";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  asButton?: boolean;
  className?: string;
};

export default function BrandMark({
  compact = false,
  href = "/",
  onClick,
  asButton = false,
  className = "",
}: BrandMarkProps) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const inner = (
    <span className="inline-flex items-center gap-3.5">
      <span className="inline-flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary/60 p-0.5 dark:bg-white/5">
        <Image
          src="/images/logo/icon.png"
          alt="Sawiyaa Icon"
          width={52}
          height={52}
          className="h-12 w-12 sm:h-13 sm:w-13 object-contain rounded-2xl"
          priority
        />
      </span>
      {!compact && (
        <span className="flex flex-col text-start">
          <span className="text-[16px] font-extrabold tracking-[0.1em] text-primary dark:text-primary-light">
            Sawiyaa
          </span>
          <span className="text-[11.5px] font-medium text-text-muted">
            {isAr ? "منصة الرعاية الصحية" : "Healthcare platform"}
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
        className={`inline-flex items-center focus:outline-none cursor-pointer ${className}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      className={`inline-flex items-center ${className}`}
    >
      {inner}
    </Link>
  );
}
