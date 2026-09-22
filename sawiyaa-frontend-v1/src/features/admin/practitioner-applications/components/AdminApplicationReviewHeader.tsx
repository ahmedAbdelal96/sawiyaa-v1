"use client";

import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/avatar/Avatar";
import type { ReactNode } from "react";
import { Mail, Phone, Globe, CalendarClock } from "lucide-react";

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
    <section className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            disabled={!hasAvatar}
            onClick={() => {
              if (!avatarUrl) return;
              window.open(avatarUrl, "_blank", "noopener,noreferrer");
            }}
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-light bg-surface-secondary shadow-2xs transition",
              hasAvatar ? "cursor-pointer hover:border-primary/40 hover:ring-2 hover:ring-primary/10 active:scale-95" : "cursor-default",
            )}
            aria-label={hasAvatar ? previewPhotoLabel : photoMissingLabel}
            title={hasAvatar ? previewPhotoLabel : photoMissingLabel}
          >
            <Avatar
              src={avatarUrl}
              name={name}
              size="custom"
              className="h-full w-full rounded-2xl"
            />
          </button>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-extrabold text-text-primary dark:text-white/95">{name}</h1>
              {statusBadge}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
              {email && email !== "-" && (
                <span className="flex items-center gap-1 text-text-muted">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-text-secondary">{email}</span>
                </span>
              )}
              {phone && phone !== "-" && (
                <span className="flex items-center gap-1 text-text-muted">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono font-medium text-text-secondary" dir="ltr">{phone}</span>
                </span>
              )}
              {country && country !== "-" && (
                <span className="flex items-center gap-1 text-text-muted">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-text-secondary">{country}</span>
                </span>
              )}
              {submittedAt && submittedAt !== "-" && (
                <span className="flex items-center gap-1 text-text-muted">
                  <CalendarClock className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-text-muted">{submittedAt}</span>
                </span>
              )}
            </div>

            {summaryChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {summaryChips.slice(0, 4).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
