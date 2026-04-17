import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminReviewDetailScreen from "@/features/reviews/components/AdminReviewDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return {
    title: t("admin.meta.detail.title"),
    description: t("admin.meta.detail.description"),
  };
}

export default async function AdminReviewDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminReviewDetailScreen reviewId={id} />;
}
