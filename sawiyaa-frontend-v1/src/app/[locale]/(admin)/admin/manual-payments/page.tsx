import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminManualPaymentsScreen from "@/features/admin/manual-payments/components/AdminManualPaymentsScreen";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-manual-payments" });
  return { title: t("title"), description: t("description") };
}
export default async function AdminManualPaymentsPage({ params }: Props) {
  const { locale } = await params; setRequestLocale(locale);
  return <AdminPermissionGate requiredPermissions={[PermissionKey.MANUAL_PAYMENTS_METHODS_READ, PermissionKey.MANUAL_PAYMENTS_SUBMISSIONS_READ]}><AdminManualPaymentsScreen /></AdminPermissionGate>;
}
