"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTransition } from "react";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-tertiary hover:text-primary disabled:opacity-50 dark:hover:bg-white/10"
    >
      <span className="text-base leading-none">
        {locale === "ar" ? "🇬🇧" : "🇸🇦"}
      </span>
      <span>{locale === "ar" ? "EN" : "عر"}</span>
    </button>
  );
}
