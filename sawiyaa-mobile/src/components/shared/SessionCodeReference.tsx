import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "../ui/Text";
import { useTheme } from "../../providers/ThemeProvider";
import { getSessionCodeDisplay } from "./session-code";

type SessionCodeReferenceProps = {
  sessionCode?: string | null;
  labelVisible?: boolean;
  copyable?: boolean;
  onPress?: () => void;
  testID?: string;
};

/** Public Session Code display. UUIDs are intentionally never used as a fallback. */
export function SessionCodeReference({
  sessionCode,
  labelVisible = true,
  copyable = false,
  onPress,
  testID,
}: SessionCodeReferenceProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [copying, setCopying] = useState(false);
  const isArabic = i18n.language?.startsWith("ar") ?? false;
  const value = sessionCode?.trim() || null;
  const displayValue = getSessionCodeDisplay(value, t("sessionCode.unavailable"));

  const copyCode = async () => {
    if (!value || copying) return;
    setCopying(true);
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert(t("sessionCode.copySuccess"));
    } finally {
      setCopying(false);
    }
  };

  const content = (
    <View style={styles.content} testID={testID}>
      {labelVisible ? (
        <Text variant="caption" color={theme.colors.textMuted}>
          {t("sessionCode.label")}
        </Text>
      ) : null}
      <Text
        weight="600"
        color={value ? theme.colors.textPrimary : theme.colors.textMuted}
        style={styles.code}
        accessibilityLabel={value ? `${t("sessionCode.label")} ${value}` : t("sessionCode.unavailable")}
      >
        {displayValue}
      </Text>
    </View>
  );

  if (copyable && value) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("sessionCode.copyLabel", { sessionCode: value })}
        accessibilityHint={t("sessionCode.copyHint")}
        onPress={copyCode}
        disabled={copying}
        style={[styles.wrapper, { flexDirection: isArabic ? "row-reverse" : "row" }]}
      >
        {content}
        <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
      </TouchableOpacity>
    );
  }

  if (onPress && value) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("sessionCode.openLabel", { sessionCode: value })}
        onPress={onPress}
        style={styles.wrapper}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 8,
  },
  content: {
    alignItems: "flex-start",
    flexShrink: 1,
  },
  code: {
    writingDirection: "ltr",
    textAlign: "left",
    letterSpacing: 0.3,
  },
});
