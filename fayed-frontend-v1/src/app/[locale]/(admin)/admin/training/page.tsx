import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminTrainingOverviewScreen from "@/features/training/components/AdminTrainingOverviewScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.adminTitle"),
    description: t("meta.adminDescription"),
  };
}

export default async function AdminTrainingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminTrainingOverviewScreen />;
}
