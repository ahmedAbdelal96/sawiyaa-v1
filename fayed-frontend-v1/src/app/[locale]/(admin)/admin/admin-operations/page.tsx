import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminFinanceOperationsListScreen from "@/features/admin/finance-operations/components/AdminFinanceOperationsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });
  return {
    title: t("meta.list.title"),
    description: t("meta.list.description"),
  };
}

export default async function AdminOperationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminFinanceOperationsListScreen />;
}
