import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPlatformSettingsScreen from "@/features/admin/platform-settings/components/AdminPlatformSettingsScreen";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "admin-platform-settings",
  });
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function PlatformSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPlatformSettingsScreen />;
}
