import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("meta.forgotPasswordPage.title"),
    description: t("meta.forgotPasswordPage.description"),
  };
}

export default async function PatientForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForgotPasswordForm mode="patient" />;
}
