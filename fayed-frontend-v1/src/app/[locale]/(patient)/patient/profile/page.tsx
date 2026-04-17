import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CollapsibleHelpCenter from "@/components/shared/CollapsibleHelpCenter";
import PatientProfileForm from "@/features/patients/components/PatientProfileForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patient-profile" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function PatientProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "patient-profile" });

  return (
    <div className="app-max-content mx-auto space-y-6 px-4 py-8">
      <section className="rounded-2xl border border-border-light bg-white p-5 sm:p-6">
        <h1 className="text-xl font-bold text-text-primary">{t("page.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("page.subtitle")}</p>
      </section>

      <PatientProfileForm />

      <CollapsibleHelpCenter
        title={t("help.title")}
        summary={t("help.summary")}
        sections={[
          {
            heading: t("help.sections.profile.heading"),
            items: [t("help.sections.profile.item1"), t("help.sections.profile.item2")],
          },
          {
            heading: t("help.sections.photo.heading"),
            items: [t("help.sections.photo.item1"), t("help.sections.photo.item2")],
          },
        ]}
      />
    </div>
  );
}
