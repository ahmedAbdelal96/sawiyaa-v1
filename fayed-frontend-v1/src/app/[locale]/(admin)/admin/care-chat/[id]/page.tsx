import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminCareChatRequestScreen from "@/features/care-chat/components/AdminCareChatRequestScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("admin.meta.detailTitle"),
    description: t("admin.meta.detailDescription"),
  };
}

export default async function AdminCareChatRequestPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN]}
    >
      <AdminCareChatRequestScreen requestId={id} />
    </AdminPermissionGate>
  );
}
