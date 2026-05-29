import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../providers/ThemeProvider";
import { getAppDirection } from "../../i18n/direction";
import { Text } from "./Text";

interface ScreenHeadingProps {
  title: string;
  subtitle?: string;
  compact?: boolean;
  titleVariant?: "h1" | "h2" | "title";
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeading({
  title,
  subtitle,
  compact = false,
  titleVariant = "h2",
  style,
}: ScreenHeadingProps) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === "rtl";

  return (
    <View
      style={[
        style,
        styles.container,
        compact ? styles.compact : null,
        {
          width: "100%",
          alignSelf: "stretch",
          alignItems: isRTL ? "flex-end" : "flex-start",
        },
      ]}
    >
      <Text
        variant={titleVariant}
        weight="600"
        style={[
          styles.title,
          {
            textAlign: isRTL ? "right" : "left",
            writingDirection: direction,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant="bodySmall"
          color={theme.colors.textSecondary}
          style={[
            styles.subtitle,
            {
              textAlign: isRTL ? "right" : "left",
              writingDirection: direction,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    marginBottom: 2,
  },
  compact: {
    gap: 2,
  },
  title: {
    width: "100%",
  },
  subtitle: {
    width: "100%",
  },
});
