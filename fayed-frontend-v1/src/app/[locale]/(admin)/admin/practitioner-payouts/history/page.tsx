import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPractitionerPayoutHistoryScreen from "@/features/admin/practitioner-payouts/components/AdminPractitionerPayoutHistoryScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-practitioner-payouts" });

  return {
    title: t("history.meta.title"),
    description: t("history.meta.description"),
  };
}

export default async function AdminPractitionerPayoutHistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPractitionerPayoutHistoryScreen />;
}
