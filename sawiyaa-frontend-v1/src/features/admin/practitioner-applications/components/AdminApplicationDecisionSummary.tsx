"use client";

import { useLocale } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  status: "APPROVED" | "REJECTED";
  statusLabel: string;
  title: string;
  dateLabel: string;
  reviewedAt: string | null;
  reviewedByLabel: string;
  reviewedByUserId: string | null;
  sectionsLabel: string;
  sections: Array<{ label: string; status: string }>;
  readOnlyNote: string;
};

export default function AdminApplicationDecisionSummary({
  status,
  statusLabel,
  title,
  dateLabel,
  reviewedAt,
  reviewedByLabel,
  reviewedByUserId,
  sectionsLabel,
  sections,
  readOnlyNote,
}: Props) {
  const locale = useLocale();
  const Icon = status === "APPROVED" ? CheckCircle2 : XCircle;

  // Resolve raw UUIDs into friendly reviewer label
  const displayReviewer = reviewedByUserId
    ? /^[0-9a-fA-F-]{36}$/.test(reviewedByUserId)
      ? (locale === "ar" ? "فريق المراجعة والاعتماد" : "Admin Review Team")
      : reviewedByUserId
    : "-";

  return (
    <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-2xs dark:bg-surface-secondary/40">
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            status === "APPROVED"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-text-primary dark:text-white/95">{title}</h2>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
                status === "APPROVED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
              )}
            >
              {statusLabel}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-border-light bg-surface-secondary/30 p-2.5 dark:bg-surface-secondary/20">
              <p className="text-[11px] font-semibold text-text-muted">{dateLabel}</p>
              <p className="mt-0.5 text-xs font-bold text-text-primary dark:text-white/95">
                {reviewedAt ? new Date(reviewedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US") : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-secondary/30 p-2.5 dark:bg-surface-secondary/20">
              <p className="text-[11px] font-semibold text-text-muted">{reviewedByLabel}</p>
              <p className="mt-0.5 text-xs font-bold text-text-primary dark:text-white/95">
                {displayReviewer}
              </p>
            </div>
          </div>

          {sections.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-text-muted">{sectionsLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((section) => (
                  <span
                    key={`${section.label}-${section.status}`}
                    className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {section.label}: {section.status}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="rounded-xl border border-border-light bg-surface-secondary/30 p-3 text-xs font-medium leading-relaxed text-text-secondary dark:bg-surface-secondary/20">
            {readOnlyNote}
          </p>
        </div>
      </div>
    </section>
  );
}
