import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminRefundPolicyVersionScreen from "@/features/admin/refund-policies/components/AdminRefundPolicyVersionScreen";
import { normalizeAdminRefundPolicyType } from "@/features/admin/refund-policies/lib/admin-refund-policies";

type Props = {
  params: Promise<{ locale: string; policyType: string; versionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, policyType } = await params;
  const normalized = normalizeAdminRefundPolicyType(policyType);
  const t = await getTranslations({ locale, namespace: "admin-refund-policies" });

  if (!normalized) {
    return {
      title: t("meta.invalidTitle"),
      description: t("meta.invalidDescription"),
    };
  }

  return {
    title: `${t(`family.${normalized.toLowerCase()}.title`)} · ${t("detail.eyebrow")}`,
    description: t("detail.description"),
  };
}

export default async function AdminRefundPolicyVersionPage({ params }: Props) {
  const { locale, policyType } = await params;
  const normalized = normalizeAdminRefundPolicyType(policyType);
  if (!normalized) notFound();
  setRequestLocale(locale);

  return <AdminRefundPolicyVersionScreen policyType={normalized} />;
}
