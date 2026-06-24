import SignUpForm, { type SignUpMode } from "@/components/auth/SignUpForm";
import PatientSignUpForm from "@/components/auth/PatientSignUpForm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; mode?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("meta.signUp.title"),
    description: t("meta.signUp.description"),
  };
}

export default async function SignUp({ params, searchParams }: Props) {
  const { locale } = await params;
  const { callbackUrl, mode } = await searchParams;
  setRequestLocale(locale);

  const signUpMode: SignUpMode = mode === "practitioner" ? "practitioner" : "patient";
  if (signUpMode === "patient") {
    return <PatientSignUpForm callbackUrl={callbackUrl} />;
  }
  return <SignUpForm mode={signUpMode} />;
}
