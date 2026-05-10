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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(68,161,148,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(68,161,148,0.12),_transparent_30%)] bg-surface dark:bg-surface">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(244,247,245,0.94))] dark:bg-[linear-gradient(180deg,rgba(9,16,16,0.88),rgba(13,23,22,0.96))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="overflow-hidden rounded-[30px] border border-border-light bg-white/90 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/90">
          <div className="flex items-center justify-between gap-4 border-b border-border-light px-6 py-5 dark:border-border-light sm:px-8">
            <div className="max-w-[8.5rem]">
              <BrandMark />
            </div>
            <div className="rounded-full border border-border-light bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-secondary dark:border-border-light dark:bg-surface-tertiary dark:text-text-secondary">
              {t("authShell.badge")}
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mb-6 space-y-3 px-2 sm:px-0">
              <h1 className="text-2xl font-semibold leading-tight text-text-primary dark:text-text-primary sm:text-3xl">
                {t("authShell.title")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-text-secondary dark:text-text-secondary">
                {t("authShell.description")}
              </p>
            </div>

            {children}

            <div className="mt-8 flex items-center gap-3 px-2 text-sm text-text-muted dark:text-text-muted sm:px-0">
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
