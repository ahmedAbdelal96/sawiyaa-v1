import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientMessagesScreen from "@/features/messages-shell/components/PatientMessagesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("meta.listTitle") || "Messages",
  };
}

export default async function PatientMessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-[calc(100vh-96px)] min-h-0 overflow-hidden mb-[-16px] md:mb-[-24px]">
      <PatientMessagesScreen />
    </div>
  );
}
