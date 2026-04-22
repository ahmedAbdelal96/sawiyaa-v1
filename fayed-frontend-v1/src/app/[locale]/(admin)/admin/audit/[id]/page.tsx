import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAuditEventDetailScreen from "@/features/admin/audit/components/AdminAuditEventDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-audit" });

  return {
    title: t("audit.meta.detailTitle"),
    description: t("audit.meta.detailDescription"),
  };
}

export default async function AdminAuditEventDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminAuditEventDetailScreen eventId={id} />;
}
