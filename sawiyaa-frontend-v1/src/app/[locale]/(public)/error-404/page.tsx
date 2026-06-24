import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-pages.meta.notFound" });

  return buildPublicMetadata({
    locale,
    pathname: "/error-404",
    title: t("title"),
    description: t("description"),
    noIndex: true,
  });
}

export default async function Error404() {
  const t = await getTranslations("public-pages.notFound");

  return (
    <PublicPageState
      icon={<SearchX size={40} />}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      actions={[
        { href: "/", label: t("home"), primary: true },
        { href: "/practitioners", label: t("practitioners") },
        { href: "/specialties", label: t("specialties") },
      ]}
    />
  );
}
