"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import GridShape from "@/components/shared/GridShape";

export default function LocalizedNotFound() {
  const t = useTranslations("common.notFound");
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#FDFAF7] p-6 dark:bg-gray-900"
    >
      <GridShape />
      
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#F4EBE1] bg-white p-8 text-center shadow-theme-sm dark:border-white/5 dark:bg-gray-800/50">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Image
              src="/images/logo/icon.png"
              alt="Sawiyaa"
              width={48}
              height={48}
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Small 404 badge */}
        <div className="mb-6 inline-flex rounded-full bg-[#EAF2F1] px-3.5 py-1 text-xs font-semibold text-[#24564F] dark:bg-[#24564F]/20 dark:text-[#52B788]">
          {isRtl ? "خطأ ٤٠٤" : "404 Error"}
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-[#1F2937] dark:text-white/95">
          {t("title")}
        </h1>

        {/* Subtitle */}
        <p className="mb-2 text-sm leading-relaxed text-[#4B5563] dark:text-gray-300">
          {t("subtitle")}
        </p>

        {/* Supportive line */}
        <p className="mb-8 text-xs leading-relaxed text-[#9CA3AF] dark:text-gray-400">
          {t("supportive")}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-xl bg-[#24564F] px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-[#1A3E39] active:scale-[0.98]"
          >
            {t("goHome")}
          </Link>

          <Link
            href="/signin"
            className="flex w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#374151] transition-colors hover:bg-gray-50 active:scale-[0.98] dark:border-white/10 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            {t("signIn")}
          </Link>

          <button
            onClick={() => router.back()}
            className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-[#6B7280] transition-colors hover:text-[#374151] dark:text-gray-400 dark:hover:text-white cursor-pointer"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t("goBack")}</span>
          </button>
        </div>
      </div>

      {/* Footer copyright */}
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-[#9CA3AF] dark:text-gray-500">
        &copy; {new Date().getFullYear()} Sawiyaa
      </p>
    </div>
  );
}
