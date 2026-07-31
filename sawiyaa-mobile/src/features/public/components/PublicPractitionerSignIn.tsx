import React from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";

export function PublicPractitionerSignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { textAlign } = useAppDirection();

  return (
    <TouchableOpacity
      onPress={() => router.push("/(auth)/signin/practitioner")}
      style={styles.practitionerCta}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t("publicHome.practitioner.button")}
    >
      <Text style={[styles.practitionerText, { color: publicTheme.secondaryText, textAlign }]}>
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
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
