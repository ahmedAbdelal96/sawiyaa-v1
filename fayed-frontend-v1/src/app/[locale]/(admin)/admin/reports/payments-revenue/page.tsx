import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPaymentsRevenueReportScreen from "@/features/admin/reports/components/AdminPaymentsRevenueReportScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-reports" });
  return {
    title: t("meta.paymentsRevenue.title"),
    description: t("meta.paymentsRevenue.description"),
  };
}

export default async function AdminPaymentsRevenueReportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPaymentsRevenueReportScreen />;
}

