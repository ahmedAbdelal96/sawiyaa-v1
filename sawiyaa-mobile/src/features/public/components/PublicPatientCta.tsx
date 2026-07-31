import React from "react";
import { StyleSheet, View, TouchableOpacity, I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicPatientCta() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;

  return (
    <View style={styles.container}>
      <View style={[styles.ctaCard, { backgroundColor: publicTheme.primaryText }]}>
        <Text style={styles.ctaTitle}>
          {t("publicHome.patientCta.title")}
        </Text>
        <Text style={styles.ctaDesc}>
          {t("publicHome.patientCta.desc")}
        </Text>
        
        {/* Exact patient signup route */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: publicTheme.raisedSurface }]}
          onPress={() => router.push("/(auth)/signup/patient")}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("publicHome.patientCta.button")}
        >
          <Text style={[styles.ctaButtonText, { color: publicTheme.primaryText }]}>
            {t("publicHome.patientCta.button")}
          </Text>
        </TouchableOpacity>

        {/* Dynamic accent shapes for high-contrast container */}
        <View style={[styles.circleOverlay, { backgroundColor: publicTheme.accentMint, opacity: 0.15 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    marginBottom: 36,
  },
  ctaCard: {
    borderRadius: 32,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "rgba(0, 0, 0, 0.12)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 38,
    marginBottom: 12,
    textAlign: "center",
    zIndex: 2,
  },
  ctaDesc: {
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 300,
    zIndex: 2,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowColor: "rgba(0, 0, 0, 0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  circleOverlay: {
    position: "absolute",
    right: -40,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
});
