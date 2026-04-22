import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminReportsHomeScreen from "@/features/admin/reports/components/AdminReportsHomeScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-reports" });

  return {
    title: t("meta.home.title"),
    description: t("meta.home.description"),
  };
}

export default async function AdminReportsHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminReportsHomeScreen />;
}

