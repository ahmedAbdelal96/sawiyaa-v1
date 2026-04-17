import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientAssessmentsHomeScreen from "@/features/assessments/components/PatientAssessmentsHomeScreen";
import { fetchPublicAssessments } from "@/features/assessments/api/assessments-ssr.api";
import type { AssessmentDefinition } from "@/features/assessments/types/assessments.types";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessments" });

  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function PatientAssessmentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let items: AssessmentDefinition[] = [];
  let loadFailed = false;

  try {
    const data = await fetchPublicAssessments(locale);
    items = data.items;
  } catch {
    loadFailed = true;
  }

  return (
    <div className="px-4 py-8">
      <PatientAssessmentsHomeScreen items={items} loadFailed={loadFailed} />
    </div>
  );
}
