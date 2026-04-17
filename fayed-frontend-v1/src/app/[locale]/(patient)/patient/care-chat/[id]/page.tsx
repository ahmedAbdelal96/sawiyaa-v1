import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientCareChatRequestScreen from "@/features/care-chat/components/PatientCareChatRequestScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("patient.meta.detailTitle"),
    description: t("patient.meta.detailDescription"),
  };
}

export default async function PatientCareChatRequestPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <PatientCareChatRequestScreen requestId={id} />;
}
