import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import PatientAssessmentDefinitionScreen from "@/features/assessments/components/PatientAssessmentDefinitionScreen";
import { fetchPublicAssessmentDefinition } from "@/features/assessments/api/assessments-ssr.api";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "assessments" });
  const data = await fetchPublicAssessmentDefinition(slug, locale);

  if (!data) {
    return {
      title: t("meta.listTitle"),
      description: t("meta.listDescription"),
    };
  }

  return {
    title: t("meta.detailTitle", { title: data.item.title }),
    description: data.item.description ?? t("meta.detailDescription", { title: data.item.title }),
  };
}

export default async function PatientAssessmentDefinitionPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const data = await fetchPublicAssessmentDefinition(slug, locale);

  if (!data) {
    notFound();
  }

  return (
    <div className="app-max-content mx-auto px-4 py-4 sm:py-6">
      <PatientAssessmentDefinitionScreen item={data.item} />
    </div>
  );
}
