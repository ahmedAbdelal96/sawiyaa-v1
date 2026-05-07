import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PublicHelpScreen from "@/features/help/components/PublicHelpScreen";

type Props = {
  params: Promise<{ locale: string; categorySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });

  return {
    title: t("meta.categoryTitle"),
    description: t("meta.categoryDescription"),
  };
}

export default async function HelpCategoryPage({ params }: Props) {
  const { locale, categorySlug } = await params;
  setRequestLocale(locale);

  return <PublicHelpScreen categorySlug={categorySlug} />;
}
