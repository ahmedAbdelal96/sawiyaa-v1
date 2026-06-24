"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import type { AdminRefundPolicy } from "../types/admin-refund-policies.types";

type Props = {
  policy: AdminRefundPolicy;
  displayLocale?: "ar" | "en";
  className?: string;
};

export default function AdminRefundPolicyDocument({ policy, displayLocale = "ar", className = "" }: Props) {
  const t = useTranslations("admin-refund-policies");
  const clauses = policy.clauses.filter((clause) => clause.isActive);

  const title = displayLocale === "ar" ? policy.titleAr || policy.titleEn : policy.titleEn || policy.titleAr;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-[24px] border border-border-light bg-white p-4">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      </div>

      <div className="space-y-2">
        {clauses.map((clause, index) => {
          const clauseTitle =
            displayLocale === "ar" ? clause.titleAr || clause.titleEn : clause.titleEn || clause.titleAr;
          const body = displayLocale === "ar" ? clause.bodyAr : clause.bodyEn;

          return (
            <div key={clause.id} className="rounded-2xl border border-border-light bg-surface px-4 py-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="light" color="primary" size="sm">
                    {t("document.clauseOrder", { order: index + 1 })}
                  </Badge>
                  {clauseTitle ? <span className="text-sm font-semibold text-text-primary">{clauseTitle}</span> : null}
                </div>
                <p className="text-sm leading-7 text-text-primary">{body}</p>
              </div>
            </div>
          );
        })}

        {clauses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-light bg-white px-4 py-4 text-sm text-text-secondary">
            {t("document.noClauses")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
