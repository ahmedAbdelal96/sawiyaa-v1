import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PublicAcademyHomeScreen from "@/features/academy/components/PublicAcademyHomeScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return buildPublicMetadata({
    locale,
    pathname: "/patient/academy",
    title: t("meta.publicTitle"),
    description: t("meta.publicDescription"),
  });
}

export default async function PatientAcademyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PublicAcademyHomeScreen
      locale={locale}
      detailBaseHref={`/${locale}/patient/academy`}
    />
  );
}
