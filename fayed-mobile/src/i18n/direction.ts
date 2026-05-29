import { I18nManager } from "react-native";

export type AppDirection = "rtl" | "ltr";

export function isCurrentLanguageRtl(language?: string | null): boolean {
  if (typeof language === "string" && language.length > 0) {
    return language.toLowerCase().startsWith("ar");
  }

  return I18nManager.isRTL;
}

export function getAppDirection(language?: string | null): AppDirection {
  return isCurrentLanguageRtl(language) ? "rtl" : "ltr";
}

