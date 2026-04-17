import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPractitionersDirectory from "@/features/admin/practitioners/components/AdminPractitionersDirectory";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "navigation" });
  const tAdmin = await getTranslations({ locale, namespace: "admin-area" });

  return {
    title: `${tNav("main.practitioners")} - ${tAdmin("dashboard.page.title")}`,
    description: tAdmin("dashboard.meta.description"),
  };
}

export default async function AdminPractitionersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPractitionersDirectory />;
}

