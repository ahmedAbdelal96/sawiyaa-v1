"use client";

import { cn } from "@/lib/utils";
import AvatarText from "@/components/ui/avatar/AvatarText";
import type { ReactNode } from "react";

type Props = {
  avatarUrl: string | null;
  name: string;
  email: string;
  phone: string;
  country: string;
  statusBadge: ReactNode;
  submittedAt: string;
  summaryChips: string[];
  photoMissingLabel: string;
  previewPhotoLabel: string;
};

export default function AdminApplicationReviewHeader({
  avatarUrl,
  name,
  email,
  phone,
  country,
  statusBadge,
  submittedAt,
  summaryChips,
  photoMissingLabel,
  previewPhotoLabel,
}: Props) {
  const hasAvatar = Boolean(avatarUrl);
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            type="button"
            disabled={!hasAvatar}
            onClick={() => {
              if (!avatarUrl) return;
              window.open(avatarUrl, "_blank", "noopener,noreferrer");
            }}
            className={cn(
              "flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-surface-secondary",
              hasAvatar ? "cursor-pointer hover:border-primary/40 hover:ring-2 hover:ring-primary/10" : "cursor-default",
            )}
            aria-label={hasAvatar ? previewPhotoLabel : photoMissingLabel}
            title={hasAvatar ? previewPhotoLabel : photoMissingLabel}
          >
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl ?? ""} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <AvatarText name={name} className="h-[68px] w-[68px]" />
            )}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-gray-900 dark:text-white">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{email}</span>
              <span>{phone}</span>
              <span>{country}</span>
              <span>{submittedAt}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {statusBadge}
              {summaryChips.slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-medium text-warning-800 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-100"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
