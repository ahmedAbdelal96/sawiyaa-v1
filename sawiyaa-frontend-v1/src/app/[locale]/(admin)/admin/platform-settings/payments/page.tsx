import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PaymentSettingsScreen, {
  type PaymentSettingsTab,
} from "@/features/admin/platform-settings/components/PaymentSettingsScreen";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-platform-settings" });
  return {
    title: t("paymentsSettings.title"),
    description: t("paymentsSettings.description"),
  };
}

export default async function PaymentSettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
  const activeTab: PaymentSettingsTab = tab === "manual" ? "manual" : "automatic";
  return <PaymentSettingsScreen activeTab={activeTab} />;
}
