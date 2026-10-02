"use client";

import { IntlErrorCode, NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { warnMissingTranslation } from "./missing-key-warning";
import { ViewerTimeZoneCookieSync } from "./ViewerTimeZoneCookieSync";

type Props = {
  children: ReactNode;
  locale: string;
  messages: Parameters<typeof NextIntlClientProvider>[0]["messages"];
  timeZone?: string;
};

export function AppIntlProvider({ children, locale, messages, timeZone = "Africa/Cairo" }: Props) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      onError={(error) => {
        if (
          error.code === IntlErrorCode.MISSING_MESSAGE ||
          error.code === IntlErrorCode.ENVIRONMENT_FALLBACK
        ) {
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.error("[Sawiyaa i18n error]", error.message);
        }
      }}
      getMessageFallback={({ namespace, key, error }) => {
        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          warnMissingTranslation({
            locale,
            namespace,
            key,
            fallbackLocale: locale === "ar" ? "en" : "ar",
          });
        }

        return namespace ? `${namespace}.${key}` : key;
      }}
    >
      <ViewerTimeZoneCookieSync />
      {children}
    </NextIntlClientProvider>
  );
}
