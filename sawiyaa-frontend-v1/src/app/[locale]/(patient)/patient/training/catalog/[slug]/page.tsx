import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";

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

export default async function PatientTrainingCatalogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  redirect(`/${locale}/academy/${slug}`);
}
