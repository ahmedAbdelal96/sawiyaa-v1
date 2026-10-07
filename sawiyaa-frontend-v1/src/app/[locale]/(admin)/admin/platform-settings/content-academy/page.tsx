import { setRequestLocale } from "next-intl/server";
import PlatformSettingsDomainScreen from "@/features/admin/platform-settings/components/PlatformSettingsDomainScreen";

type Props = { params: Promise<{ locale: string }> };

export default async function ContentAcademySettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlatformSettingsDomainScreen domain="contentAcademy" />;
}
