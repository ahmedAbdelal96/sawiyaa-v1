import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
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

  // Compatibility only: old bookmarks may still carry mode on the legacy route.
  // All first-party links use the concrete account routes below.
  if (mode === "patient" || mode === "practitioner") {
    const query = callbackUrl
      ? `?${new URLSearchParams({ callbackUrl }).toString()}`
      : "";
    redirect(`/${locale}/signup/${mode}${query}`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });
  const callbackSuffix = callbackUrl
    ? `?${new URLSearchParams({ callbackUrl }).toString()}`
    : "";
  return (
    <div className="w-full max-w-3xl rounded-[32px] border border-border-light bg-white/85 p-8 text-center shadow-[0_24px_70px_rgba(36,86,79,0.05)] dark:border-white/5 dark:bg-surface-secondary/75 sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {t("entryEyebrow")}
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary dark:text-white sm:text-3xl">
        {t("entryTitle")}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
        {t("entryDescription")}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/signup/patient${callbackSuffix}`}
          className="rounded-2xl border border-primary/20 bg-primary-light/30 p-5 text-start transition-colors hover:bg-primary-light/60 dark:bg-primary/10 dark:hover:bg-primary/20"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("entryCards.patient.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-bold text-text-primary dark:text-white">
            {t("entryCards.patient.secondaryCta")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("entryCards.patient.description")}
          </p>
        </Link>
        <Link
          href={`/signup/practitioner${callbackSuffix}`}
          className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5 text-start transition-colors hover:bg-sky-500/15"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            {t("entryCards.practitioner.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-bold text-text-primary dark:text-white">
            {t("entryCards.practitioner.secondaryCta")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("entryCards.practitioner.description")}
          </p>
        </Link>
      </div>
    </div>
  );
}
