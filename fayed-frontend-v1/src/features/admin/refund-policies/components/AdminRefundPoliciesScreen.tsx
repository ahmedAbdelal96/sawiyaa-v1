"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, FileText } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { useAdminRefundPolicies } from "../hooks/use-admin-refund-policies";
import {
  formatAdminRefundPolicyDate,
  getAdminRefundPolicyPath,
} from "../lib/admin-refund-policies";

export default function AdminRefundPoliciesScreen() {
  const t = useTranslations("admin-refund-policies");
  const locale = useLocale();
  const router = useRouter();
  const policiesQuery = useAdminRefundPolicies();

  const policies = useMemo(() => policiesQuery.data?.items ?? [], [policiesQuery.data?.items]);
  const policyByType = useMemo(
    () =>
      new Map(
        policies.map((policy) => [policy.policyType, policy]),
      ),
    [policies],
  );
  const cards = useMemo(
    () => [
      {
        policyType: "SESSION" as const,
        path: "session" as const,
      },
      {
        policyType: "PACKAGE" as const,
        path: "package" as const,
      },
    ],
    [],
  );

  if (policiesQuery.isLoading && !policiesQuery.data) {
    return (
      <AdminOperationalListShell
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      >
        <ListStateSkeleton items={2} heightClass="h-36" />
      </AdminOperationalListShell>
    );
  }

  if (policiesQuery.isError || !policiesQuery.data) {
    const appError = policiesQuery.error ? toAppError(policiesQuery.error) : null;
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<FileText className="h-8 w-8 text-text-muted" />}
          title={t("states.error.heading")}
          note={appError?.message ?? t("states.error.note")}
          action={{
            label: t("states.error.retry"),
            onClick: () => policiesQuery.refetch(),
          }}
        />
      </div>
    );
  }

  return (
    <AdminOperationalListShell
      eyebrow={t("page.eyebrow")}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map(({ policyType, path }) => {
          const policy = policyByType.get(policyType) ?? null;
          const titleAr = policy?.titleAr?.trim() || t(`overview.cards.${path}.title` as never);
          const titleEn = policy?.titleEn?.trim() || "";
          const hasDistinctEnglishTitle = titleEn && titleEn !== titleAr;
          const clauseLabel = t("overview.cards.clauses", { count: policy?.clauseCount ?? 0 });
          const updatedLabel = t("overview.cards.updatedAt", {
            date: policy ? formatAdminRefundPolicyDate(policy.updatedAt, locale) : "-",
          });

          return (
            <SurfaceCard key={policyType} as="section" variant="section" className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <Badge variant="solid" color={policy?.isActive ? "success" : "warning"} size="sm">
                    {policy?.isActive ? t("badges.active") : t("badges.inactive")}
                  </Badge>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold leading-8 text-text-primary dark:text-white/95">
                      {titleAr}
                    </h3>
                    {hasDistinctEnglishTitle ? (
                      <p className="text-sm leading-6 text-text-secondary">{titleEn}</p>
                    ) : null}
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary">
                    {t(`overview.cards.${path}.description` as never)}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => router.push(`/admin/refund-policies/${getAdminRefundPolicyPath(policyType)}` as never)}
                  startIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t("overview.cards.manage")}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-text-primary">
                  {clauseLabel}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-text-primary">
                  {updatedLabel}
                </span>
              </div>
            </SurfaceCard>
          );
        })}
      </div>
    </AdminOperationalListShell>
  );
}
