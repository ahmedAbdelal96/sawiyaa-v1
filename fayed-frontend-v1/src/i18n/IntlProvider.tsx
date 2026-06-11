"use client";

import { IntlErrorCode, NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { warnMissingTranslation } from "./missing-key-warning";

type Props = {
  children: ReactNode;
  locale: string;
  messages: Parameters<typeof NextIntlClientProvider>[0]["messages"];
};

export function AppIntlProvider({ children, locale, messages }: Props) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.error("[Fayed i18n error]", error.message);
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
      {children}
    </NextIntlClientProvider>
  );
}

