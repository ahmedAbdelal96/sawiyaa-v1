"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type {
  AdminProfessionalContentReview,
  ProfessionalContentLocale,
} from "../types/practitioner-applications.types";
import { Briefcase, CreditCard, Sparkles, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

type ComparisonRow = {
  key: string;
  label: string;
  current: string;
  requested: string;
};

type PriceRow = {
  label: string;
  value: string;
};

type Props = {
  profileRows: Array<{ label: string; value: string }>;
  bio: string;
  prices: PriceRow[];
  differences: ComparisonRow[];
  noDifferencesLabel: string;
  liveValueLabel: string;
  requestedValueLabel: string;
  bioLabel: string;
  differencesLabel: string;
  professionalContentReview?: AdminProfessionalContentReview;
  professionalContentLabels?: {
    sectionTitle: string;
    primaryLanguage: string;
    notSpecified: string;
    arabic: string;
    english: string;
    complete: string;
    incomplete: string;
    bilingualComplete: string;
    bilingualIncomplete: string;
    fallbackActive: string;
    sourceLocaleUnresolved: string;
    currentApproved: string;
    proposed: string;
    professionalTitle: string;
    bio: string;
    noContent: string;
    changedFields: string;
    added: string;
    removed: string;
    modified: string;
    legacyContent: string;
    legacySourceUnresolved: string;
  };
};

function ReadinessBadge({ complete, completeLabel, incompleteLabel }: {
  complete: boolean;
  completeLabel: string;
  incompleteLabel: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-bold",
        complete
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
      )}
    >
      {complete ? completeLabel : incompleteLabel}
    </span>
  );
}

function ContentValue({ value, emptyLabel }: { value: string | null; emptyLabel: string }) {
  return (
    <p
      className={cn(
        "text-xs leading-relaxed",
        value
          ? "font-semibold text-text-primary dark:text-white/90"
          : "font-medium text-text-muted",
      )}
    >
      {value || emptyLabel}
    </p>
  );
}

export default function AdminApplicationStepProfessional({
  profileRows,
  bio,
  prices,
  differences,
  noDifferencesLabel,
  liveValueLabel,
  requestedValueLabel,
  bioLabel,
  differencesLabel,
  professionalContentReview,
  professionalContentLabels,
}: Props) {
  const locale = useLocale();

  return (
    <div className="space-y-4">
      {/* ── Top Grid: Professional Profile & Pricing ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left/Main Column: Professional Details (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
            <div className="flex items-center justify-between border-b border-border-light pb-2.5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold text-text-primary dark:text-white/95">
                  {locale === "ar" ? "بيانات الملف المهني" : "Professional Details"}
                </h2>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {profileRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-border-light bg-surface-secondary/30 p-2.5 dark:bg-surface-secondary/20"
                >
                  <p className="text-[11px] font-semibold text-text-muted">{row.label}</p>
                  <p className="mt-0.5 text-xs font-bold text-text-primary dark:text-white/95">
                    {row.value || "-"}
                  </p>
                </div>
              ))}
            </div>

            {/* Bio Section */}
            <div className="mt-3 rounded-xl border border-border-light bg-surface-secondary/30 p-3 dark:bg-surface-secondary/20">
              <div className="flex items-center gap-1.5 text-text-muted pb-1">
                <FileText className="h-3 w-3 text-primary" />
                <p className="text-[11px] font-semibold text-text-muted">{bioLabel}</p>
              </div>
              <p className="mt-1 text-xs font-medium leading-relaxed text-text-primary dark:text-white/90">
                {bio || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Overview (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
            <div className="flex items-center justify-between border-b border-border-light pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold text-text-primary dark:text-white/95">
                  {locale === "ar" ? "قائمة الأسعار والتسعير" : "Pricing Overview"}
                </h2>
              </div>
            </div>

            <div className="mt-3 divide-y divide-border-light/60 rounded-xl border border-border-light bg-surface-secondary/30 overflow-hidden dark:bg-surface-secondary/20">
              {prices.map((price) => (
                <div
                  key={price.label}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-text-secondary">{price.label}</span>
                  <span className="font-mono font-bold text-text-primary tabular-nums dark:text-white/95">
                    {price.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Multilingual Review (if available) ── */}
      {professionalContentReview && professionalContentLabels ? (
        <section className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-light pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-xs font-bold text-text-primary dark:text-white/95">
                  {professionalContentLabels.sectionTitle}
                </h3>
                <p className="text-[11px] text-text-muted">
                  {professionalContentLabels.primaryLanguage}:{" "}
                  {professionalContentReview.proposed.readiness.primaryContentLocale
                    ? professionalContentReview.proposed.readiness.primaryContentLocale === "ar"
                      ? professionalContentLabels.arabic
                      : professionalContentLabels.english
                    : professionalContentLabels.notSpecified}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full border border-border-light bg-surface-secondary px-2.5 py-0.5 text-[11px] font-bold text-text-secondary">
                {professionalContentReview.proposed.readiness.bilingualComplete
                  ? professionalContentLabels.bilingualComplete
                  : professionalContentLabels.bilingualIncomplete}
              </span>
              {professionalContentReview.proposed.readiness.fallbackActive ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {professionalContentLabels.fallbackActive}
                </span>
              ) : null}
              {professionalContentReview.proposed.readiness.sourceLocaleUnresolved ? (
                <span className="rounded-full border border-border-light bg-surface-secondary px-2.5 py-0.5 text-[11px] font-bold text-text-muted">
                  {professionalContentLabels.sourceLocaleUnresolved}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(["ar", "en"] as const).map((contentLocale: ProfessionalContentLocale) => {
              const current = professionalContentReview.currentApproved.readiness.locales[contentLocale];
              const proposed = professionalContentReview.proposed.readiness.locales[contentLocale];
              const localeLabel = contentLocale === "ar" ? professionalContentLabels.arabic : professionalContentLabels.english;
              return (
                <div
                  key={contentLocale}
                  className="rounded-xl border border-border-light bg-surface-secondary/30 p-3 dark:bg-surface-secondary/20"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border-light/60 pb-2">
                    <h4 className="text-xs font-bold text-text-primary dark:text-white/95">{localeLabel}</h4>
                    <ReadinessBadge
                      complete={proposed.complete}
                      completeLabel={professionalContentLabels.complete}
                      incompleteLabel={professionalContentLabels.incomplete}
                    />
                  </div>

                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    {([
                      ["professionalTitle", professionalContentLabels.professionalTitle],
                      ["bio", professionalContentLabels.bio],
                    ] as const).map(([field, fieldLabel]) => (
                      <div
                        key={field}
                        dir={contentLocale}
                        className="rounded-lg border border-border-light bg-surface p-2.5 dark:bg-surface-secondary/40"
                      >
                        <p className="text-[11px] font-bold text-text-muted">{fieldLabel}</p>
                        <div className="mt-1.5 space-y-1.5 text-start">
                          <div>
                            <p className="text-[10px] font-bold text-text-muted">
                              {professionalContentLabels.currentApproved}
                            </p>
                            <ContentValue value={current[field]} emptyLabel={professionalContentLabels.noContent} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-primary">
                              {professionalContentLabels.proposed}
                            </p>
                            <ContentValue value={proposed[field]} emptyLabel={professionalContentLabels.noContent} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Changed fields list */}
          {professionalContentReview.changedFields.length > 0 && (
            <div className="mt-3 border-t border-border-light pt-2.5">
              <p className="text-xs font-bold text-text-primary dark:text-white/95">
                {professionalContentLabels.changedFields}
              </p>
              <div className="mt-2 space-y-1.5">
                {professionalContentReview.changedFields.map((field) => (
                  <div
                    key={field.path}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border-light bg-surface px-3 py-1.5 text-xs dark:bg-surface-secondary/40"
                  >
                    <span className="font-semibold text-text-primary dark:text-white/90">
                      {field.field === "professionalTitle"
                        ? `${field.locale === "ar" ? professionalContentLabels.arabic : professionalContentLabels.english} — ${professionalContentLabels.professionalTitle}`
                        : field.field === "bio"
                          ? `${field.locale === "ar" ? professionalContentLabels.arabic : professionalContentLabels.english} — ${professionalContentLabels.bio}`
                          : professionalContentLabels.primaryLanguage}
                    </span>
                    <span className="rounded-md bg-surface-secondary px-2 py-0.5 text-[10px] font-bold text-text-secondary border border-border-light">
                      {field.status === "ADDED"
                        ? professionalContentLabels.added
                        : field.status === "REMOVED"
                          ? professionalContentLabels.removed
                          : professionalContentLabels.modified}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* ── Differences & Diffs Card ── */}
      <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
        <div className="flex items-center gap-2 border-b border-border-light pb-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-xs font-bold text-text-primary dark:text-white/95">
            {differencesLabel}
          </h3>
        </div>

        <div className="mt-3 space-y-2">
          {differences.length > 0 ? (
            differences.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800/60 dark:bg-amber-950/30"
              >
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{item.label}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-text-muted">
                    {liveValueLabel}: <strong className="text-text-primary dark:text-white/90">{item.current}</strong>
                  </span>
                  <span className="text-amber-800 dark:text-amber-300">
                    {requestedValueLabel}: <strong className="font-bold">{item.requested}</strong>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-center text-xs font-semibold text-text-muted">
              {noDifferencesLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
