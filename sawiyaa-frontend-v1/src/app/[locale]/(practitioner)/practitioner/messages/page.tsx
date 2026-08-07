import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerMessagesScreen from "@/features/messages-shell/components/PractitionerMessagesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("practitioner.meta.listTitle") || "Messages",
  };
}

export default async function PractitionerMessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="w-full h-[calc(100vh-76px)] min-h-0 overflow-hidden px-1 sm:px-2 pb-1">
      <PractitionerMessagesScreen />
    </div>
  );
}
