import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PublicAcademyDetailScreen from "@/features/academy/components/PublicAcademyDetailScreen";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return buildPublicMetadata({
    locale,
    pathname: `/academy/${slug}`,
    title: t("meta.publicDetailTitle"),
    description: t("meta.publicDetailDescription"),
  });
}

export default async function AcademyDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return <PublicAcademyDetailScreen locale={locale} slug={slug} />;
}
