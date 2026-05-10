import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
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
    <div className="app-max-content mx-auto space-y-5 px-4 py-8 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <PatientAssessmentResultScreen submissionId={submissionId} />
    </div>
  );
}
