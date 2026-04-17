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
    title: t("placeholder.settings.meta.title"),
    description: t("placeholder.settings.meta.description"),
  };
}

export default async function PractitionerSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return (
    <ModulePlaceholder
      eyebrow={t("placeholder.eyebrow")}
      title={t("placeholder.settings.title")}
      description={t("placeholder.settings.description")}
      cta={{ href: "/practitioner/dashboard", label: t("placeholder.backToDashboard") }}
    />
  );
}
