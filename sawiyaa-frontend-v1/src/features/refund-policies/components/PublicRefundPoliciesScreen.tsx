"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/ui/data-table";
import DataTableActionButton from "@/components/ui/data-table/DataTableActionButton";
import { StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { useCurrentRefundPolicies } from "../hooks/use-refund-policies";
import { formatRefundPolicyDate } from "../lib/refund-policy-display";
import { getRefundPolicyPath, getRefundPolicyTitle } from "../lib/refund-policy-public";
import type { RefundPolicy } from "../types/refund-policies.types";

export default function PublicRefundPoliciesScreen() {
  const t = useTranslations("refund-policies");
  const locale = useLocale();
  const router = useRouter();
  const policiesQuery = useCurrentRefundPolicies();

  const policies = useMemo(() => policiesQuery.data?.items ?? [], [policiesQuery.data?.items]);

  if (policiesQuery.isLoading && !policiesQuery.data) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-[28px] bg-white/80" />
        <div className="h-48 rounded-[28px] bg-white/80" />
      </div>
    );
  }

  if (policiesQuery.isError || !policiesQuery.data) {
    const appError = policiesQuery.error ? toAppError(policiesQuery.error) : null;
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<ShieldAlert className="h-8 w-8 text-text-muted" />}
          title={t("public.unavailableTitle")}
          note={appError?.message ?? t("public.unavailableNote")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("public.eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">{t("public.title")}</h1>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{t("public.description")}</p>
        </div>

        <DataTable
          data={policies}
          columns={[
            {
              id: "policy",
              header: t("public.columns.policy"),
              accessor: (row: RefundPolicy) => row.policyType,
              cell: (row) => (
                <div className="space-y-1">
                  <p className="font-semibold text-text-primary">
                    {locale === "ar" ? row.titleAr || getRefundPolicyTitle(row.policyType) : row.titleEn || getRefundPolicyTitle(row.policyType)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t(`types.${getRefundPolicyPath(row.policyType)}` as never)}
                  </p>
                </div>
              ),
            },
            {
              id: "updatedAt",
              header: t("public.columns.updatedAt"),
              accessor: (row: RefundPolicy) => row.updatedAt,
              cell: (row) => (
                <span className="text-sm text-text-secondary">
                  {formatRefundPolicyDate(row.updatedAt, locale)}
                </span>
              ),
            },
          ]}
          rowActionsHeader={t("public.columns.actions")}
          rowActions={(row) => (
            <DataTableActionButton
              label={t("public.viewPolicy")}
              icon={<ArrowRight className="h-4 w-4" />}
              intent="primary"
              onClick={() => router.push(`/refund-policies/${getRefundPolicyPath(row.policyType)}` as never)}
            />
          )}
          getRowId={(row) => row.id}
          striped
          hoverable
          ariaLabel={t("public.title")}
          caption={t("public.title")}
          emptyState={{
            icon: <ShieldAlert className="h-5 w-5 text-primary" />,
            title: t("public.notConfiguredTitle"),
            description: t("public.notConfiguredNote"),
          }}
        />
      </SurfaceCard>
    </div>
  );
}
