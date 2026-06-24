import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientGuidedPage from "@/components/patient/PatientGuidedPage";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patient-area" });
  return {
    title: t("placeholder.settings.meta.title"),
    description: t("placeholder.settings.meta.description"),
  };
}

export default async function PatientSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "patient-area" });

  return (
    <PatientGuidedPage
      eyebrow={t("guided.settings.eyebrow")}
      title={t("guided.settings.title")}
      description={t("guided.settings.description")}
      primaryAction={{ href: "/patient/profile", label: t("guided.settings.primaryAction") }}
      secondaryAction={{ href: "/patient/payments", label: t("guided.settings.secondaryAction") }}
      stepsTitle={t("guided.common.stepsTitle")}
      steps={[
        { title: t("guided.settings.steps.first.title"), description: t("guided.settings.steps.first.description") },
        { title: t("guided.settings.steps.second.title"), description: t("guided.settings.steps.second.description") },
        { title: t("guided.settings.steps.third.title"), description: t("guided.settings.steps.third.description") },
      ]}
      tipsTitle={t("guided.common.tipsTitle")}
      tips={[
        t("guided.settings.tips.first"),
        t("guided.settings.tips.second"),
        t("guided.settings.tips.third"),
      ]}
    />
  );
}
