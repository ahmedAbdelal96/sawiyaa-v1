"use client";

import type {
  AdminProfessionalContentReview,
  ProfessionalContentLocale,
} from "../types/practitioner-applications.types";

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
    <span className={complete
      ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"}>
      {complete ? completeLabel : incompleteLabel}
    </span>
  );
}

function ContentValue({ value, emptyLabel }: { value: string | null; emptyLabel: string }) {
  return (
    <p className={value
      ? "whitespace-pre-wrap text-sm font-semibold leading-relaxed text-gray-900 dark:text-gray-100"
      : "text-sm font-semibold text-gray-400 dark:text-gray-500"}>
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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2">
            {profileRows.map((row) => (
              <div key={row.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{row.label}</p>
                <p className="mt-1 text-base font-extrabold text-gray-900 dark:text-white">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3.5 rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{bioLabel}</p>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-gray-900 dark:text-gray-100">{bio}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2">
            {prices.map((price) => (
              <div key={price.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{price.label}</p>
                <p className="mt-1 text-base font-extrabold text-gray-900 dark:text-white">{price.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {professionalContentReview && professionalContentLabels ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                {professionalContentLabels.sectionTitle}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {professionalContentLabels.primaryLanguage}: {professionalContentReview.proposed.readiness.primaryContentLocale
                  ? professionalContentReview.proposed.readiness.primaryContentLocale === "ar"
                    ? professionalContentLabels.arabic
                    : professionalContentLabels.english
                  : professionalContentLabels.notSpecified}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {professionalContentReview.proposed.readiness.bilingualComplete
                  ? professionalContentLabels.bilingualComplete
                  : professionalContentLabels.bilingualIncomplete}
              </span>
              {professionalContentReview.proposed.readiness.fallbackActive ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  {professionalContentLabels.fallbackActive}
                </span>
              ) : null}
              {professionalContentReview.proposed.readiness.sourceLocaleUnresolved ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {professionalContentLabels.sourceLocaleUnresolved}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {(["ar", "en"] as const).map((contentLocale: ProfessionalContentLocale) => {
              const current = professionalContentReview.currentApproved.readiness.locales[contentLocale];
              const proposed = professionalContentReview.proposed.readiness.locales[contentLocale];
              const localeLabel = contentLocale === "ar" ? professionalContentLabels.arabic : professionalContentLabels.english;
              return (
                <div key={contentLocale} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{localeLabel}</h4>
                    <ReadinessBadge
                      complete={proposed.complete}
                      completeLabel={professionalContentLabels.complete}
                      incompleteLabel={professionalContentLabels.incomplete}
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([
                      ["professionalTitle", professionalContentLabels.professionalTitle],
                      ["bio", professionalContentLabels.bio],
                    ] as const).map(([field, fieldLabel]) => (
                      <div key={field} dir={contentLocale} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{fieldLabel}</p>
                        <div className="mt-2 space-y-2 text-start">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{professionalContentLabels.currentApproved}</p>
                            <ContentValue value={current[field]} emptyLabel={professionalContentLabels.noContent} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{professionalContentLabels.proposed}</p>
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

          {professionalContentReview.currentApproved.legacyContent || professionalContentReview.proposed.legacyContent ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{professionalContentLabels.legacyContent}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{professionalContentLabels.legacySourceUnresolved}</p>
              <div dir="auto" className="mt-2 grid gap-2 sm:grid-cols-2">
                <ContentValue value={professionalContentReview.proposed.legacyContent?.professionalTitle ?? null} emptyLabel={professionalContentLabels.noContent} />
                <ContentValue value={professionalContentReview.proposed.legacyContent?.bio ?? null} emptyLabel={professionalContentLabels.noContent} />
              </div>
            </div>
          ) : null}

          <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
            <p className="text-xs font-extrabold text-gray-700 dark:text-gray-200">{professionalContentLabels.changedFields}</p>
            {professionalContentReview.changedFields.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {professionalContentReview.changedFields.map((field) => (
                  <li key={field.path} className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {field.field === "professionalTitle"
                        ? `${field.locale === "ar" ? professionalContentLabels.arabic : professionalContentLabels.english} — ${professionalContentLabels.professionalTitle}`
                        : field.field === "bio"
                          ? `${field.locale === "ar" ? professionalContentLabels.arabic : professionalContentLabels.english} — ${professionalContentLabels.bio}`
                          : professionalContentLabels.primaryLanguage}
                    </span>
                    <span className="font-bold text-gray-500 dark:text-gray-400">
                      {field.status === "ADDED"
                        ? professionalContentLabels.added
                        : field.status === "REMOVED"
                          ? professionalContentLabels.removed
                          : professionalContentLabels.modified}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-extrabold text-gray-900 dark:text-white">{differencesLabel}</p>
        <div className="mt-3 space-y-2">
          {differences.length > 0 ? (
            differences.map((item) => (
              <div key={item.key} className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/50">
                <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100">{item.label}</p>
                <div className="mt-1.5 grid gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 sm:grid-cols-2">
                  <span>{liveValueLabel}: {item.current}</span>
                  <span>{requestedValueLabel}: {item.requested}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{noDifferencesLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
