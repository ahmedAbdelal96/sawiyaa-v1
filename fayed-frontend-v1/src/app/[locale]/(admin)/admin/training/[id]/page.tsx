import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminTrainingDetailScreen from "@/features/training/components/AdminTrainingDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });

  return {
    title: t("meta.adminDetailTitle"),
    description: t("meta.adminDetailDescription"),
  };
}

export default async function AdminTrainingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminTrainingDetailScreen trainingId={id} />;
}
