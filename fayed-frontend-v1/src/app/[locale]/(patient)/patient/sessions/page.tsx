import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <div className="app-max-content mx-auto px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary dark:text-white/95">
        {t("list.heading")}
      </h1>
      <PatientSessionsPanel />
    </div>
  );
}
