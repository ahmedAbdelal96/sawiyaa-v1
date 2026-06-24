import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPractitionerPayoutsScreen from "@/features/admin/practitioner-payouts/components/AdminPractitionerPayoutsScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-practitioner-payouts" });

  return {
    title: t("list.meta.title"),
    description: t("list.meta.description"),
  };
}

export default async function AdminPractitionerPayoutsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PRACTITIONER_PAYOUTS_READ, PermissionKey.PRACTITIONER_PAYOUTS_WRITE]}
    >
      <AdminPractitionerPayoutsScreen />
    </AdminPermissionGate>
  );
}
