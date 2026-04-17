import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientAssessmentResultScreen from "@/features/assessments/components/PatientAssessmentResultScreen";

type Props = {
  params: Promise<{ locale: string; submissionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessments" });

  return {
    title: t("meta.resultTitle"),
    description: t("meta.resultDescription"),
  };
}

export default async function PatientAssessmentSubmissionPage({ params }: Props) {
  const { locale, submissionId } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4 py-8">
      <PatientAssessmentResultScreen submissionId={submissionId} />
    </div>
  );
}
