import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminSessionRuntimeInspectionScreen from "@/features/admin/session-runtime/components/AdminSessionRuntimeInspectionScreen";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sessionId?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-session-runtime" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function AdminSessionRuntimeInspectionPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { sessionId } = await searchParams;

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.SESSIONS_READ_ADMIN]}
    >
      <div className="px-4 py-8">
        <AdminSessionRuntimeInspectionScreen initialSessionId={sessionId} />
      </div>
    </AdminPermissionGate>
  );
}
