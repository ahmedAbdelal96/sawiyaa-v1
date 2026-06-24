import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminReviewsListScreen from "@/features/reviews/components/AdminReviewsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return {
    title: t("admin.meta.list.title"),
    description: t("admin.meta.list.description"),
  };
}

export default async function AdminReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminReviewsListScreen />;
}
