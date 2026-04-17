import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AuthEntryChooser from "@/components/auth/AuthEntryChooser";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("meta.signIn.title"),
    description: t("meta.signIn.description"),
  };
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthEntryChooser />;
}
