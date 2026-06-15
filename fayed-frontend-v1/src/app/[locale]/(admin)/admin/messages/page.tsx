import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminMessagesScreen from "@/features/messages-shell/components/AdminMessagesScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("admin.meta.listTitle") || "Messages",
  };
}

export default async function AdminMessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL, PermissionKey.SUPPORT_TICKET_ASSIGN]}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-[calc(100vh-96px)] min-h-0 overflow-hidden mb-[-16px] md:mb-[-24px]">
        <AdminMessagesScreen />
      </div>
    </AdminPermissionGate>
  );
}
