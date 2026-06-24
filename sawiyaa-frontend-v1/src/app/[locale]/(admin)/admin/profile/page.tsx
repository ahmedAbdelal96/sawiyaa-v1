import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminProfileWorkspace from "@/features/settings/components/AdminProfileWorkspace";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settings" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function AdminProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminProfileWorkspace />;
}
