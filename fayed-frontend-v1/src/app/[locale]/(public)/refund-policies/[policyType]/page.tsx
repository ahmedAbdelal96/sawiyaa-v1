import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PublicRefundPolicyPageScreen from "@/features/refund-policies/components/PublicRefundPolicyPageScreen";
import { normalizeRefundPolicyType } from "@/features/refund-policies/lib/refund-policy-public";

type Props = {
  params: Promise<{ locale: string; policyType: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, policyType } = await params;
  const t = await getTranslations({ locale, namespace: "public-pages" });
  const normalized = normalizeRefundPolicyType(policyType);

  if (!normalized) {
    return {
      title: t("notFound.title"),
      description: t("notFound.description"),
    };
  }

  return normalized === "SESSION"
    ? {
        title: t("meta.refundPolicySession.title"),
        description: t("meta.refundPolicySession.description"),
      }
    : {
        title: t("meta.refundPolicyPackage.title"),
        description: t("meta.refundPolicyPackage.description"),
      };
}

export default async function RefundPolicyPage({ params }: Props) {
  const { policyType } = await params;
  const normalized = normalizeRefundPolicyType(policyType);

  if (!normalized) {
    notFound();
  }

  return <PublicRefundPolicyPageScreen policyType={normalized} />;
}
