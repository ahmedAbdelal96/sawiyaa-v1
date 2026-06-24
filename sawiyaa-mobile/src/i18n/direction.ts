import { I18nManager } from "react-native";
import { useTranslation } from "react-i18next";

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

export interface AppDirectionInfo {
  isRtl: boolean;
  direction: AppDirection;
  rowDirection: "row" | "row-reverse";
  rowReverseDirection: "row-reverse" | "row";
  textAlign: "left" | "right";
  oppositeTextAlign: "right" | "left";
  writingDirection: "ltr" | "rtl";
  chevronForward: "chevron-back" | "chevron-forward";
  chevronBack: "chevron-forward" | "chevron-back";
  arrowForward: "arrow-back" | "arrow-forward";
  arrowBack: "arrow-forward" | "arrow-back";
}

export function useAppDirection(): AppDirectionInfo {
  const { i18n } = useTranslation();
  const isRtl = isCurrentLanguageRtl(i18n.language);
  const direction = isRtl ? "rtl" : "ltr";

  return {
    isRtl,
    direction,
    rowDirection: isRtl ? "row-reverse" : "row",
    rowReverseDirection: isRtl ? "row" : "row-reverse",
    textAlign: isRtl ? "right" : "left",
    oppositeTextAlign: isRtl ? "left" : "right",
    writingDirection: isRtl ? "rtl" : "ltr",
    chevronForward: isRtl ? "chevron-back" : "chevron-forward",
    chevronBack: isRtl ? "chevron-forward" : "chevron-back",
    arrowForward: isRtl ? "arrow-back" : "arrow-forward",
    arrowBack: isRtl ? "arrow-forward" : "arrow-back",
  };
}
