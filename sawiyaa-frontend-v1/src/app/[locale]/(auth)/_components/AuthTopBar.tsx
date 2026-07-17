"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export default function AuthTopBar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "ar" | "en" });
  };

  const isAr = locale === "ar";

  return (
    <div className="w-full border-b border-border-light bg-surface-tertiary py-2 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
        <div></div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleChange("ar")}
            className={`font-semibold transition-colors hover:text-primary ${
              isAr ? "text-primary font-bold underline underline-offset-4" : "text-text-secondary"
            }`}
          >
            اللغة العربية - AR
          </button>
          <span className="text-border-light">|</span>
          <button
            onClick={() => handleChange("en")}
            className={`font-semibold transition-colors hover:text-primary ${
              !isAr ? "text-primary font-bold underline underline-offset-4" : "text-text-secondary"
            }`}
          >
            EN - English
          </button>
        </div>
      </div>
    </div>
  );
}
