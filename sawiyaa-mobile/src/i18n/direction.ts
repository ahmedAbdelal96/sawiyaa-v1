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
  isRTL: boolean;
  isRtl: boolean;
  direction: AppDirection;
  rowDirection: "row-reverse" | "row";
  rowReverseDirection: "row" | "row-reverse";
  textAlign: "right" | "left";
  oppositeTextAlign: "left" | "right";
  contentAlignment: "flex-end" | "flex-start";
  iconDirection: "arrow-back" | "arrow-forward";
  writingDirection: "rtl" | "ltr";
  chevronForward: "chevron-back" | "chevron-forward";
  chevronBack: "chevron-forward" | "chevron-back";
  arrowForward: "arrow-back" | "arrow-forward";
  arrowBack: "arrow-forward" | "arrow-back";
}

export function useAppDirection(): AppDirectionInfo {
  const { i18n } = useTranslation();
  const isRTL = isCurrentLanguageRtl(i18n.language);
  const direction = isRTL ? "rtl" : "ltr";

  return {
    isRTL,
    isRtl: isRTL,
    direction,
    rowDirection: isRTL ? "row-reverse" : "row",
    rowReverseDirection: isRTL ? "row" : "row-reverse",
    textAlign: isRTL ? "right" : "left",
    oppositeTextAlign: isRTL ? "left" : "right",
    contentAlignment: isRTL ? "flex-end" : "flex-start",
    iconDirection: isRTL ? "arrow-back" : "arrow-forward",
    writingDirection: isRTL ? "rtl" : "ltr",
    chevronForward: isRTL ? "chevron-back" : "chevron-forward",
    chevronBack: isRTL ? "chevron-forward" : "chevron-back",
    arrowForward: isRTL ? "arrow-back" : "arrow-forward",
    arrowBack: isRTL ? "arrow-forward" : "arrow-back",
  };
}
