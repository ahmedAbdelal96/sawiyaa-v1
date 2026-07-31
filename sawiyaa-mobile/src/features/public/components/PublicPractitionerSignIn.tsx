import React from "react";
import { StyleSheet, TouchableOpacity, Text, I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePublicTheme } from "../theme/public-theme";

export function PublicPractitionerSignIn() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;

  return (
    /* Exact practitioner signin route */
    <TouchableOpacity
      onPress={() => router.push("/(auth)/signin/practitioner")}
      style={styles.practitionerCta}
      accessibilityRole="button"
      accessibilityLabel={t("publicHome.practitioner.button")}
    >
      <Text style={[styles.practitionerText, { color: publicTheme.secondaryText, textAlign: "center" }]}>
        {t("publicHome.practitioner.label")}{" "}
        <Text style={[styles.practitionerTextLink, { color: publicTheme.primaryText }]}>
          {t("publicHome.practitioner.button")}
        </Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  practitionerCta: {
    alignSelf: "center",
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
    marginBottom: 40,
  },
  practitionerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  practitionerTextLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
