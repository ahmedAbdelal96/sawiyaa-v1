"use client";

import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import type { RefundPolicy } from "../types/refund-policies.types";

type Props = {
  policy: RefundPolicy;
  showEnglishSecondary?: boolean;
  showHeader?: boolean;
  className?: string;
};

export default function PublicRefundPolicyDocument({
  policy,
  showEnglishSecondary = true,
  showHeader = true,
  className = "",
}: Props) {
  const t = useTranslations("refund-policies");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const primaryTitle = isArabic ? policy.titleAr || policy.titleEn : policy.titleEn || policy.titleAr;
  const secondaryTitle = isArabic ? policy.titleEn || "" : policy.titleAr || "";

  return (
    <div className={`space-y-5 ${className}`}>
      {showHeader ? (
        <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-sm sm:p-6 dark:bg-surface-secondary">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {t("public.contentHeading")}
              </p>
              <h3 className="text-xl font-semibold text-text-primary dark:text-white/95 sm:text-2xl">
                {primaryTitle}
              </h3>
              {showEnglishSecondary && isArabic && secondaryTitle && secondaryTitle !== primaryTitle ? (
                <p className="max-w-2xl text-sm leading-7 text-text-secondary">
                  {secondaryTitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2 text-end">
              <Badge variant="solid" color={policy.isActive ? "success" : "warning"} size="sm">
                {policy.isActive ? t("public.activeBadge") : t("public.inactiveBadge")}
              </Badge>
              <span className="text-xs font-medium text-text-muted">
                {t("public.clausesHeading")}: {policy.clauses.length}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("public.clausesHeading")}
          </p>
        </div>
        {policy.clauses.length ? (
          policy.clauses.map((clause, index) => {
            const clauseTitle = isArabic
              ? clause.titleAr || clause.titleEn
              : clause.titleEn || clause.titleAr;
            const clauseBody = isArabic ? clause.bodyAr : clause.bodyEn;
            const secondaryBody = isArabic ? clause.bodyEn : clause.bodyAr;

            return (
              <article
                key={clause.id}
                className="rounded-[24px] border border-border-light bg-white p-5 shadow-sm sm:p-6 dark:bg-surface-secondary"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/15">
                      {t("public.clauseIndex", { index: index + 1 })}
                    </span>
                    {clauseTitle ? (
                      <p className="text-base font-semibold leading-7 text-text-primary dark:text-white/95">
                        {clauseTitle}
                      </p>
                    ) : null}
                  </div>
                  {!clause.isActive ? (
                    <Badge variant="light" color="warning" size="sm">
                      {t("public.inactiveBadge")}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-8 text-text-primary dark:text-white/90">
                    {clauseBody}
                  </p>
                  {showEnglishSecondary && isArabic && secondaryBody ? (
                    <p className="text-sm leading-7 text-text-secondary">
                      {secondaryBody}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-border-light bg-white p-5 text-sm text-text-secondary shadow-sm dark:bg-surface-secondary">
            {t("public.noClauses")}
          </div>
        )}
      </section>
    </div>
  );
}
