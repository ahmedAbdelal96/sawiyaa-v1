import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import PublicHelpScreen from "@/features/help/components/PublicHelpScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });

  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function PatientHelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="app-max-content mx-auto space-y-5 px-4 py-6 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <PublicHelpScreen />
    </div>
  );
}
