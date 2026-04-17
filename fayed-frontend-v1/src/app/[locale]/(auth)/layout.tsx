import ThemeTogglerTwo from "@/components/shared/ThemeTogglerTwo";
import BrandMark from "@/components/shared/BrandMark";
import { getTranslations } from "next-intl/server";
import React from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  await params;
  const t = await getTranslations("auth");

  return (
    <div className="relative z-1 bg-surface dark:bg-surface">
      <div className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden px-4 py-4 dark:bg-surface sm:px-6 sm:py-5 lg:flex-row lg:px-0 lg:py-0">
        {children}

        <div className="relative hidden h-full w-full overflow-hidden border-s border-border-light bg-surface-secondary lg:grid lg:w-1/2 lg:items-center dark:border-border-light dark:bg-surface-secondary">
          <div className="absolute -right-28 top-10 h-80 w-80 rounded-full bg-primary-light opacity-70 blur-3xl dark:bg-primary/10 dark:opacity-100" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-surface-tertiary opacity-90 blur-3xl dark:bg-surface-tertiary" />

          <div className="relative z-10 flex h-full flex-col justify-between p-14">
            <div className="self-end rounded-full border border-border-light bg-surface px-4 py-2 text-xs font-medium tracking-[0.22em] text-text-secondary dark:border-border-light dark:bg-surface-tertiary dark:text-text-secondary">
              {t("authShell.badge")}
            </div>

            <div className="max-w-sm">
              <div className="mb-6 max-w-[9rem]">
                <BrandMark />
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold leading-tight text-text-primary dark:text-text-primary">
                  {t("authShell.title")}
                </h2>
                <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary">
                  {t("authShell.description")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-text-muted dark:text-text-muted">
              <div className="h-px flex-1 bg-border-light" />
              <span>{t("authShell.footer")}</span>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
