import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SignInForm, { type SignInMode } from "@/components/auth/SignInForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; callbackUrl?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("meta.signIn.title"),
    description: t("meta.signIn.description"),
  };
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mode } = await searchParams;
  setRequestLocale(locale);

  const signInMode = mode === "patient" || mode === "practitioner" || mode === "admin"
    ? (mode as SignInMode)
    : "patient";

  return <SignInForm mode={signInMode} />;
}
