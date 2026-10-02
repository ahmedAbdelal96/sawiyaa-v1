import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSignInRouteForRole } from "@/config/route-access";

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
  const { mode, callbackUrl } = await searchParams;
  const role = mode === "practitioner" ? "PRACTITIONER" : mode === "admin" ? "ADMIN" : mode === "trainee" ? "TRAINEE" : "PATIENT";
  const query = callbackUrl
    ? `?${new URLSearchParams({ callbackUrl }).toString()}`
    : "";
  setRequestLocale(locale);
  redirect(`/${locale}${getSignInRouteForRole(role)}${query}`);
}
