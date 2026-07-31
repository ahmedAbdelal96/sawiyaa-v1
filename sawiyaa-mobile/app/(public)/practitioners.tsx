import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

export default function PractitionersPlaceholder() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <View style={styles.content}>
        <Ionicons name="people-outline" size={80} color={theme.colors.primarySoft} style={styles.icon} />
        <Text variant="h1" color={theme.colors.textPrimary} style={styles.title}>
          {t("publicHome.placeholders.comingSoon")}
        </Text>
        <Text variant="body" color={theme.colors.textSecondary} style={styles.desc}>
          {t("publicHome.placeholders.comingSoonDesc")}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: "700",
  },
  desc: {
    textAlign: "center",
    lineHeight: 20,
  },
});
