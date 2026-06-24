import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientSectionFrame from "@/components/patient/PatientSectionFrame";
import PatientSessionsPanel from "@/features/sessions/components/PatientSessionsPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });
  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function PatientSessionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "sessions" });

  return (
    <PatientSectionFrame
      eyebrow={t("list.heading")}
      title={t("list.heading")}
      description={t("meta.listDescription")}
    >
      <PatientSessionsPanel />
    </PatientSectionFrame>
  );
}
