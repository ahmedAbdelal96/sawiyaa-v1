import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrainingEnrollmentPayPanel from "@/features/training/components/TrainingEnrollmentPayPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.patientPayTitle"),
    description: t("meta.patientPayDescription"),
  };
}

export default async function PatientTrainingPayPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <TrainingEnrollmentPayPanel enrollmentId={id} />;
}
