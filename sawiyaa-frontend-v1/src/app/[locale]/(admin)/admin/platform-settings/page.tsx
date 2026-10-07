import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPlatformSettingsScreen from "@/features/admin/platform-settings/components/AdminPlatformSettingsScreen";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ domain?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "admin-platform-settings",
  });
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function PlatformSettingsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { domain } = await searchParams;
  setRequestLocale(locale);

  const routeByLegacyDomain: Record<string, string> = {
    sessions: "sessions",
    notifications: "notifications",
    messaging: "messaging",
    practitioners: "practitioners",
    patientsAccounts: "patients-accounts",
    contentAcademy: "content-academy",
    general: "general",
    advanced: "advanced",
    storage: "advanced",
    payments: "../payments",
    revenue_share: "../payments",
  };

  if (domain && routeByLegacyDomain[domain]) {
    redirect(
      routeByLegacyDomain[domain].startsWith("../")
        ? `/${locale}/admin/${routeByLegacyDomain[domain].slice(3)}`
        : `/${locale}/admin/platform-settings/${routeByLegacyDomain[domain]}`,
    );
  }

  return <AdminPlatformSettingsScreen />;
}
