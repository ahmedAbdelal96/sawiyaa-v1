"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useState, useRef, useEffect } from "react";

const localeData: Record<string, { name: string; nativeName: string; flag: string }> = {
  ar: { name: "Arabic", nativeName: "العربية", flag: "AR" },
  en: { name: "English", nativeName: "English", flag: "EN" },
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "ar" | "en" });
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLocale = localeData[locale];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span className="text-xs font-semibold">{currentLocale.flag}</span>
        <span className="hidden sm:inline">{currentLocale.nativeName}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ltr:right-0 rtl:left-0">
          {Object.entries(localeData).map(([loc, data]) => (
            <button
              key={loc}
              onClick={() => handleChange(loc)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                locale === loc ? "bg-primary-light text-text-brand" : "text-gray-700 dark:text-gray-200"
              }`}
            >
              <span className="text-xs font-semibold">{data.flag}</span>
              <span className="font-medium">{data.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LanguageSwitcherCompact() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    router.replace(pathname, { locale: newLocale });
  };

  const otherLocale = localeData[locale === "ar" ? "en" : "ar"];

  return (
    <button
      onClick={toggleLocale}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      aria-label={`Switch to ${otherLocale.name}`}
      title={`Switch to ${otherLocale.nativeName}`}
    >
      <span className="text-xs font-semibold">{otherLocale.flag}</span>
    </button>
  );
}
