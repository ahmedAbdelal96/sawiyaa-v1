import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminHelpQuestionsScreen from "@/features/help/components/AdminHelpQuestionsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-help" });

  return {
    title: t("meta.questionsTitle"),
    description: t("meta.questionsDescription"),
  };
}

export default async function AdminHelpQuestionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminHelpQuestionsScreen />;
}
