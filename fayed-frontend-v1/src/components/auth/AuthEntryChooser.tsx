"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ChevronLeftIcon,
  GridIcon,
  GroupIcon,
  UserCircleIcon,
} from "@/icons";

const ENTRY_OPTIONS = [
  {
    key: "patient",
    href: "/signin/patient",
    signupHref: "/signup/patient",
    showSignup: true,
    icon: UserCircleIcon,
  },
  {
    key: "practitioner",
    href: "/signin/practitioner",
    signupHref: "/signup/practitioner",
    showSignup: true,
    icon: GroupIcon,
  },
  {
    key: "admin",
    href: "/signin/admin",
    signupHref: null,
    showSignup: false,
    icon: GridIcon,
  },
] as const;

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default function AuthEntryChooser() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-6 w-full max-w-3xl sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary sm:text-sm">
            {t("entryEyebrow")}
          </p>
          <h1 className="mb-3 text-4xl font-semibold leading-tight text-text-primary dark:text-text-primary sm:text-5xl">
            {t("entryTitle")}
          </h1>
          <p className="max-w-xl text-sm leading-7 text-text-secondary dark:text-text-secondary sm:text-base">
            {t("entryDescription")}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {ENTRY_OPTIONS.map((option) => (
            <section
              key={option.key}
              className="app-panel app-lift group relative overflow-hidden rounded-[28px] p-6 hover:-translate-y-0.5"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-primary-light" />

              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    {t(`entryCards.${option.key}.eyebrow`)}
                  </p>
                  <h2 className="text-2xl font-semibold text-text-primary dark:text-white">
                    {t(`entryCards.${option.key}.title`)}
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                  <option.icon className="h-5 w-5" />
                </div>
              </div>

              <p className="mb-4 text-sm leading-7 text-text-secondary dark:text-white/72">
                {t(`entryCards.${option.key}.description`)}
              </p>

              <p className="mb-6 text-xs font-medium leading-6 text-text-muted dark:text-white/55">
                {t(`entryCards.${option.key}.meta`)}
              </p>

              <div className="space-y-3">
                <Link
                  href={buildAuthHref(option.href, { callbackUrl })}
                  className="flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-hover"
                >
                  {t(`entryCards.${option.key}.primaryCta`)}
                </Link>

                {option.showSignup && option.signupHref ? (
                  <Link
                    href={buildAuthHref(option.signupHref, { callbackUrl })}
                    className="flex items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:border-border-light dark:text-text-secondary"
                  >
                    {t(`entryCards.${option.key}.secondaryCta`)}
                  </Link>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border-light bg-surface px-4 py-3 text-center text-xs leading-6 text-text-muted dark:border-border-light dark:bg-surface-tertiary dark:text-text-muted">
                    {t(`entryCards.${option.key}.supportNote`)}
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
