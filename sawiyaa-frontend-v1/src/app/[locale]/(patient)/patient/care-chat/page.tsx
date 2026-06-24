import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientCareChatHomeScreen from "@/features/care-chat/components/PatientCareChatHomeScreen";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ practitionerSlug?: string; relatedSessionId?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("patient.meta.listTitle"),
    description: t("patient.meta.listDescription"),
  };
}

export default async function PatientCareChatPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { practitionerSlug, relatedSessionId } = await searchParams;
  setRequestLocale(locale);
  return (
    <PatientCareChatHomeScreen
      prefill={{ practitionerSlug, relatedSessionId }}
    />
  );
}
