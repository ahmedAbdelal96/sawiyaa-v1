import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientTrainingEnrollmentDetailScreen from "@/features/training/components/PatientTrainingEnrollmentDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.patientDetailTitle"),
    description: t("meta.patientDetailDescription"),
  };
}

export default async function PatientTrainingEnrollmentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <PatientTrainingEnrollmentDetailScreen enrollmentId={id} />;
}
