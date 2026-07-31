import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAccountingReconciliationScreen from "@/features/admin/accounting/components/AdminAccountingReconciliationScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-accounting" });

  return {
    title: t("meta.financialReconciliation.title"),
    description: t("meta.financialReconciliation.description"),
  };
}

export default async function FinancialReconciliationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminAccountingReconciliationScreen />;
}
