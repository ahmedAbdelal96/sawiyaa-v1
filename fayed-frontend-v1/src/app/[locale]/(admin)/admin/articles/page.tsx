import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminArticlesListScreen from "@/features/admin/articles/components/AdminArticlesListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-articles" });
  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function AdminArticlesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="px-4 py-8">
      <AdminArticlesListScreen />
    </div>
  );
}
