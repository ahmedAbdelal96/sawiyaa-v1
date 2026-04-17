import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPractitionerStatementScreen from "@/features/admin/settlements/components/AdminPractitionerStatementScreen";

type Props = {
  params: Promise<{ locale: string; practitionerId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settlements" });

  return {
    title: t("statement.metaTitle"),
    description: t("statement.metaDescription"),
  };
}

export default async function AdminPractitionerStatementPage({ params }: Props) {
  const { locale, practitionerId } = await params;
  setRequestLocale(locale);

  return <AdminPractitionerStatementScreen practitionerId={practitionerId} />;
}
