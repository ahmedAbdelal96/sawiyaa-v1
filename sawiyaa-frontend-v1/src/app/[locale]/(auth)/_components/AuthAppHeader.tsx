"use client";

import Image from "next/image";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter, Link } from "@/i18n/navigation";

import AuthThemeToggle from "./AuthThemeToggle";

export default function AuthAppHeader() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const isRtl = locale === "ar";
  const otherLocale = isRtl ? "en" : "ar";
  const otherLocaleLabel = isRtl ? "English" : "العربية";

  const toggleLanguage = () => {
    router.replace(pathname, { locale: otherLocale });
  };

  return (
    <header className="relative z-10 w-full select-none border-b border-border-light/50 bg-white/95 shadow-[0_10px_30px_rgba(17,24,39,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-surface/95 dark:shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-[0.98]"
          title={isRtl ? "الذهاب للرئيسية" : "Go to Home"}
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-border-light/60 bg-white p-1.5 shadow-theme-md transition-transform duration-200 group-hover:scale-[1.03] dark:border-white/10 dark:bg-surface">
            <Image
              src="/images/logo/icon.png"
              alt="Sawiyaa Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-col text-start">
            <span className="text-sm font-semibold tracking-tight text-primary dark:text-primary-light">
              {isRtl ? "سويّة" : "Sawiyaa"}
            </span>
            <span className="hidden text-[11px] text-text-muted sm:block">
              {isRtl ? "منصة رعاية صحية" : "Healthcare platform"}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleLanguage}
            className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-border-light bg-surface-secondary/40 px-3.5 text-xs font-semibold text-text-primary shadow-theme-xs transition-all duration-200 hover:-translate-y-[1px] hover:bg-surface-secondary/70 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-surface"
            title={isRtl ? "Switch to English" : "تغيير إلى العربية"}
          >
            <Globe className="h-4 w-4 shrink-0 text-text-muted dark:text-white/80" />
            <span>{otherLocaleLabel}</span>
          </button>

          <AuthThemeToggle />
        </div>
      </div>
    </header>
  );
}
