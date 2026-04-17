import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSessionsListScreen from "@/features/admin/sessions/components/AdminSessionsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-sessions" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function AdminSessionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSessionsListScreen />;
}

