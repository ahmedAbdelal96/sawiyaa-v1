
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager, Platform } from "react-native";

import { env } from "@/core/env";
import arCommon from "@/core/i18n/resources/ar/common.json";
import enCommon from "@/core/i18n/resources/en/common.json";
import { isRtlLocale } from "@/core/utils/is-rtl";

const resources = {
  ar: { common: arCommon },
  en: { common: enCommon },
} as const;

let initialized = false;

export async function initializeI18n() {
  if (initialized) {
    return i18n;
  }

  const locale = Localization.getLocales()[0]?.languageCode || env.defaultLocale;

  await i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    lng: locale,
    fallbackLng: env.defaultLocale,
    defaultNS: "common",
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  if (Platform.OS !== "web") {
    I18nManager.allowRTL(true);
    if (typeof I18nManager.swapLeftAndRightInRTL === "function") {
      I18nManager.swapLeftAndRightInRTL(isRtlLocale(locale));
    }
  }

  initialized = true;
  return i18n;
}

export { i18n };
