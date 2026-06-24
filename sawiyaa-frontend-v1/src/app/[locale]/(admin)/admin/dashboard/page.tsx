import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminDashboard from "@/features/admin/components/AdminDashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("dashboard.meta.title"),
    description: t("dashboard.meta.description"),
  };
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminDashboard />;
}
