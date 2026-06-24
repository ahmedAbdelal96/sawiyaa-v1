import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import PublicRefundPoliciesScreen from "@/features/refund-policies/components/PublicRefundPoliciesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-pages" });
  return {
    title: t("meta.refundPolicies.title"),
    description: t("meta.refundPolicies.description"),
  };
}

export default function RefundPoliciesPage() {
  return <PublicRefundPoliciesScreen />;
}
