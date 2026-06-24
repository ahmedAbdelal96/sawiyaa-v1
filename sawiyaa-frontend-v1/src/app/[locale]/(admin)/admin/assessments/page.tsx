import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAssessmentsListScreen from "@/features/admin/assessments/components/AdminAssessmentsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("assessmentsAdmin.meta.listTitle"),
    description: t("assessmentsAdmin.meta.listDescription"),
  };
}

export default async function AdminAssessmentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminAssessmentsListScreen />;
}
