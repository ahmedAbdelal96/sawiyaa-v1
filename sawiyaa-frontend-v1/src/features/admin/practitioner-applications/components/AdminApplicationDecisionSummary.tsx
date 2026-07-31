"use client";

import { CheckCircle2, XCircle } from "lucide-react";

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
  const Icon = status === "APPROVED" ? CheckCircle2 : XCircle;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <Icon className={status === "APPROVED" ? "h-6 w-6 text-success-600" : "h-6 w-6 text-error-600"} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{statusLabel}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{dateLabel}</p>
              <p className="mt-1 text-gray-900 dark:text-white">
                {reviewedAt ? new Date(reviewedAt).toLocaleString() : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{reviewedByLabel}</p>
              <p className="mt-1 text-gray-900 dark:text-white">{reviewedByUserId || "-"}</p>
            </div>
          </div>
          {sections.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{sectionsLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sections.map((section) => (
                  <span key={`${section.label}-${section.status}`} className="inline-flex items-center rounded-full border border-success-200 bg-success-50 px-3 py-1 text-xs font-medium text-success-800 dark:border-success-900/40 dark:bg-success-900/10 dark:text-success-200">
                    {section.label}: {section.status}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600 dark:bg-gray-950 dark:text-gray-300">
            {readOnlyNote}
          </p>
        </div>
      </div>
    </section>
  );
}
