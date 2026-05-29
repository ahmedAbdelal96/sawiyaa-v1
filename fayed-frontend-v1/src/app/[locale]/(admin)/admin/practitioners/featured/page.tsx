import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminFeaturedPractitionersScreen from "@/features/admin/featured-practitioners/components/AdminFeaturedPractitionersScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-featured-practitioners" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function AdminFeaturedPractitionersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.FEATURED_PRACTITIONERS_READ]}>
      <AdminFeaturedPractitionersScreen />
    </AdminPermissionGate>
  );
}
