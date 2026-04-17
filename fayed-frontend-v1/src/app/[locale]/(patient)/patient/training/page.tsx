import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StateCard } from "@/components/shared/ContentStates";
import PatientTrainingHomeScreen from "@/features/training/components/PatientTrainingHomeScreen";
import { fetchPublicTrainings } from "@/features/training/api/training-ssr.api";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.patientListTitle"),
    description: t("meta.patientListDescription"),
  };
}

export default async function PatientTrainingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "training" });

  try {
    const catalog = await fetchPublicTrainings(locale, { page: 1, limit: 6 });

    return <PatientTrainingHomeScreen catalog={catalog} />;
  } catch {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <StateCard
          title={t("patient.catalog.states.error.heading")}
          note={t("patient.catalog.states.error.note")}
          action={{
            href: (
              <a
                href={`/${locale}/patient/training`}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("patient.catalog.states.error.retry")}
              </a>
            ),
            label: t("patient.catalog.states.error.retry")
          }}
        />
      </div>
    );
  }
}
