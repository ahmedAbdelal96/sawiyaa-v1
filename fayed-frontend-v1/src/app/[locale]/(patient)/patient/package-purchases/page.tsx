import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientSectionFrame from "@/components/patient/PatientSectionFrame";
import PatientPackagePurchasesPanel from "@/features/package-plans/components/PatientPackagePurchasesPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "package-purchases" });
  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function PatientPackagePurchasesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "package-purchases" });

  return (
    <PatientSectionFrame
      eyebrow={t("list.heading")}
      title={t("list.heading")}
      description={t("meta.listDescription")}
    >
      <PatientPackagePurchasesPanel />
    </PatientSectionFrame>
  );
}
