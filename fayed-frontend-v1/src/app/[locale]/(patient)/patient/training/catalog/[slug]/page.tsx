import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { StateCard } from "@/components/shared/ContentStates";
import PatientTrainingCatalogDetailScreen from "@/features/training/components/PatientTrainingCatalogDetailScreen";
import { fetchPublicTrainingBySlug } from "@/features/training/api/training-ssr.api";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  const training = await fetchPublicTrainingBySlug(slug, locale);

  if (!training) {
    return {
      title: t("meta.catalogFallbackTitle"),
      description: t("meta.catalogFallbackDescription"),
    };
  }

  return {
    title: training.seo.metaTitle ?? training.title,
    description:
      training.seo.metaDescription ??
      training.shortDescription ??
      t("meta.catalogFallbackDescription"),
  };
}

export default async function PatientTrainingCatalogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "training" });

  let training = null;
  try {
    training = await fetchPublicTrainingBySlug(slug, locale);
  } catch {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <StateCard
          title={t("patient.catalogDetail.states.error.heading")}
          note={t("patient.catalogDetail.states.error.note")}
          action={{
            href: (
              <a
                href={`/${locale}/patient/training`}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("patient.catalogDetail.states.error.back")}
              </a>
            ),
            label: t("patient.catalogDetail.states.error.back")
          }}
        />
      </div>
    );
  }
  if (!training) notFound();

  return <PatientTrainingCatalogDetailScreen training={training} />;
}
