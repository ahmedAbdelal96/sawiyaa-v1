import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <div className="app-max-content mx-auto px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary dark:text-white/95">
        {t("list.heading")}
      </h1>
      <PatientPackagePurchasesPanel />
    </div>
  );
}
