import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPayoutOperationsScreen from "@/features/admin/settlements/components/AdminPayoutOperationsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settlements" });

  return {
    title: t("meta.payoutsTitle"),
    description: t("meta.payoutsDescription"),
  };
}

export default async function AdminSettlementPayoutsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPayoutOperationsScreen />;
}

