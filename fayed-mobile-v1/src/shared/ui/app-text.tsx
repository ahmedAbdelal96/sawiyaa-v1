import type { PropsWithChildren } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { I18nManager } from "react-native";
import { StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";

type AppTextVariant = "display" | "heading" | "title" | "body" | "bodySmall" | "caption";

function getFontFamily(variant: AppTextVariant, isRtl: boolean) {
  if (variant === "display" || variant === "heading") {
    return isRtl ? "Tajawal_900Black" : "Manrope_800ExtraBold";
  }

  if (variant === "title") {
    return isRtl ? "Tajawal_700Bold" : "Manrope_700Bold";
  }

  if (variant === "caption") {
    return isRtl ? "IBM_Plex_Sans_Arabic_500Medium" : "Manrope_700Bold";
  }

  return isRtl ? "IBM_Plex_Sans_Arabic_500Medium" : "Manrope_500Medium";
}

type AppTextProps = PropsWithChildren<{
  variant?: AppTextVariant;
  color?: string;
  align?: TextStyle["textAlign"];
  style?: StyleProp<TextStyle>;
}>;

export function AppText({
  children,
  variant = "body",
  color,
  align = "auto",
  style,
}: AppTextProps) {
  const { colors, typography } = useAppTheme();
  const isRtl = I18nManager.isRTL;

  return (
    <Text
      style={[
        styles.base,
        {
          color: color || colors.text,
          textAlign: align === "auto" ? (isRtl ? "right" : "left") : align,
          fontSize: typography[variant],
          lineHeight: Math.round(typography[variant] * 1.5),
          fontFamily: getFontFamily(variant, isRtl),
          writingDirection: isRtl ? "rtl" : "ltr",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: "500",
    letterSpacing: 0,
  },
});
