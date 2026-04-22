import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSupportReportScreen from "@/features/admin/reports/components/AdminSupportReportScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-reports" });
  return {
    title: t("meta.support.title"),
    description: t("meta.support.description"),
  };
}

export default async function AdminSupportReportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSupportReportScreen />;
}

