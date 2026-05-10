"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import {
  ChevronLeftIcon,
  GridIcon,
  GroupIcon,
  UserCircleIcon,
} from "@/icons";

const ENTRY_OPTIONS = [
  {
    key: "patient",
    href: "/signin?mode=patient",
    signupHref: "/signup?mode=patient",
    showSignup: true,
    icon: UserCircleIcon,
  },
  {
    key: "practitioner",
    href: "/signin?mode=practitioner",
    signupHref: "/signup?mode=practitioner",
    showSignup: true,
    icon: GroupIcon,
  },
  {
    key: "admin",
    href: "/signin?mode=admin",
    signupHref: null,
    showSignup: false,
    icon: GridIcon,
  },
] as const;

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const [pathname, existingQuery = ""] = basePath.split("?");
  const search = new URLSearchParams(existingQuery);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function AuthEntryChooser() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = normalizeCallbackPath(searchParams.get("callbackUrl"));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>

        <div className="hidden rounded-full border border-border-light bg-surface/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary dark:border-border-light dark:bg-surface-tertiary/80 dark:text-text-secondary sm:block">
          {t("authShell.footer")}
        </div>
      </div>

      <div className="py-2 sm:py-4">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary sm:text-sm">
            {t("entryEyebrow")}
          </p>
          <h1 className="mb-3 text-3xl font-semibold leading-tight text-text-primary dark:text-text-primary sm:text-4xl lg:text-5xl">
            {t("entryTitle")}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-text-secondary dark:text-text-secondary sm:text-base">
            {t("entryDescription")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {ENTRY_OPTIONS.map((option) => (
            <section
              key={option.key}
              className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border-light bg-surface/78 p-6 transition duration-200 hover:border-primary/30 dark:border-border-light dark:bg-surface-tertiary/70"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-primary-light" />

              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    {t(`entryCards.${option.key}.eyebrow`)}
                  </p>
                  <h2 className="text-2xl font-semibold leading-tight text-text-primary dark:text-text-primary">
                    {t(`entryCards.${option.key}.title`)}
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/12 dark:text-primary-light">
                  <option.icon className="h-5 w-5" />
                </div>
              </div>

              <p className="mb-4 text-sm leading-7 text-text-secondary dark:text-text-secondary">
                {t(`entryCards.${option.key}.description`)}
              </p>

              <p className="mb-6 rounded-2xl bg-white/80 px-4 py-3 text-xs font-medium leading-6 text-text-muted dark:bg-surface/70 dark:text-text-muted">
                {t(`entryCards.${option.key}.meta`)}
              </p>

              <div className="mt-auto space-y-3">
                <Link
                  href={buildAuthHref(option.href, { callbackUrl })}
                  className="flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-hover"
                >
                  {t(`entryCards.${option.key}.primaryCta`)}
                </Link>

                {option.showSignup && option.signupHref ? (
                  <Link
                    href={buildAuthHref(option.signupHref, { callbackUrl })}
                    className="flex items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:border-border-light dark:bg-surface dark:text-text-secondary"
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
