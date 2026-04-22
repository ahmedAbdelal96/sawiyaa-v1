import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPayoutsReportScreen from "@/features/admin/reports/components/AdminPayoutsReportScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-reports" });
  return {
    title: t("meta.payouts.title"),
    description: t("meta.payouts.description"),
  };
}

export default async function AdminPayoutsReportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPayoutsReportScreen />;
}

