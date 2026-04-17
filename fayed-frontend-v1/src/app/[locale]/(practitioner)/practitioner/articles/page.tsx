import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ModulePlaceholder from "@/components/shared/ModulePlaceholder";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("placeholder.articles.meta.title"),
    description: t("placeholder.articles.meta.description"),
  };
}

export default async function PractitionerArticlesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return (
    <ModulePlaceholder
      eyebrow={t("placeholder.eyebrow")}
      title={t("placeholder.articles.title")}
      description={t("placeholder.articles.description")}
      cta={{ href: "/practitioner/dashboard", label: t("placeholder.backToDashboard") }}
    />
  );
}
