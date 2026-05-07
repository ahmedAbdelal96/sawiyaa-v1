"use client";

import { useLocale, useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { useRefundPolicy } from "../hooks/use-refund-policies";
import PublicRefundPolicyDocument from "./PublicRefundPolicyDocument";
import { getRefundPolicyTitle } from "../lib/refund-policy-public";
import type { RefundPolicyType } from "../types/refund-policies.types";

type Props = {
  policyType: RefundPolicyType;
};

export default function PublicRefundPolicyPageScreen({ policyType }: Props) {
  const t = useTranslations("refund-policies");
  const locale = useLocale();
  const refundPolicyQuery = useRefundPolicy(policyType);
  const policy = refundPolicyQuery.data?.item ?? null;
  const appError = refundPolicyQuery.error ? toAppError(refundPolicyQuery.error) : null;

  if (refundPolicyQuery.isLoading && !policy) {
    return <div className="h-64 rounded-[28px] bg-white/80" />;
  }

  if (!policy) {
    return (
      <div className="mx-auto max-w-3xl">
        <StateCard
          icon={<ShieldAlert className="h-8 w-8 text-text-muted" />}
          title={t("public.notConfiguredTitle")}
          note={appError?.message ?? t("public.notConfiguredNote")}
          action={{
            label: t("public.backToOverview"),
            onClick: () => window.location.assign("/refund-policies"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("public.eyebrow")}</p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary">
              {locale === "ar" ? policy.titleAr || getRefundPolicyTitle(policyType) : policy.titleEn || getRefundPolicyTitle(policyType)}
            </h1>
            <p className="mt-2 text-sm leading-7 text-text-secondary">{t("public.description")}</p>
          </div>
          <Link
            href={"/refund-policies" as never}
            className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
          >
            {t("public.backToOverview")}
          </Link>
        </div>
      </SurfaceCard>

      <PublicRefundPolicyDocument policy={policy} />
    </div>
  );
}
