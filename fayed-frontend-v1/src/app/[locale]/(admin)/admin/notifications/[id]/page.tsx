import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminNotificationDetailScreen from "@/features/admin/notifications/components/AdminNotificationDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-notifications" });

  return {
    title: t("notifications.meta.detailTitle"),
    description: t("notifications.meta.detailDescription"),
  };
}

export default async function AdminNotificationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminNotificationDetailScreen notificationId={id} />;
}
