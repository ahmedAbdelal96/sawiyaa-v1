import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientTrainingHomeScreen from "@/features/training/components/PatientTrainingHomeScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.patientListTitle"),
    description: t("meta.patientListDescription"),
  };
}

export default async function PatientTrainingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PatientTrainingHomeScreen />;
}
