import React from "react";
import { StyleSheet, View, TouchableOpacity, I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicHero() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;

  return (
    <View style={[styles.heroSection, { backgroundColor: publicTheme.heroSurface ?? publicTheme.canvas }]}>
      {/* 1. Strong Visual Title */}
      <Text style={[styles.heroTitle, { color: publicTheme.primaryText, textAlign: isRTL ? "right" : "left" }]}>
        {t("publicHome.hero.title")}
      </Text>
      
      {/* 2. Body description */}
      <Text style={[styles.heroSubtitle, { color: publicTheme.secondaryText, textAlign: isRTL ? "right" : "left" }]}>
        {t("publicHome.hero.subtitle")}
      </Text>

      {/* 3. Primary Action Button */}
      <View style={[styles.heroActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup/patient")}
          style={[styles.heroPrimaryBtn, { backgroundColor: publicTheme.primaryText }]}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("publicHome.patientCta.button")}
        >
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.heroPrimaryBtnText} color="#FFFFFF">
              {t("publicHome.patientCta.button")}
            </Text>
            <Ionicons
              name={isRTL ? "arrow-back-outline" : "arrow-forward-outline"}
              size={18}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Elegant Informational Note (Directory status - Fully Localized) */}
      <Text style={[styles.directoryNote, { color: publicTheme.secondaryText, textAlign: isRTL ? "right" : "left" }]}>
        {t("publicHome.hero.directoryNote")}
      </Text>

      {/* 5. Ambient styled shapes (Stitch visual composition) */}
      <View style={[styles.accentBlobLeft, { backgroundColor: publicTheme.accentMint }]} />
      <View style={[styles.accentBlobRight, { backgroundColor: publicTheme.accentPeach }]} />
      <View style={[styles.accentDot, { backgroundColor: publicTheme.accentSand }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    paddingTop: 36,
    paddingBottom: 28,
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.02)",
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 46,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 28,
    opacity: 0.95,
  },
  heroActions: {
    width: "100%",
    zIndex: 10,
    marginBottom: 20,
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  heroPrimaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  directoryNote: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.8,
  },
  accentBlobLeft: {
    position: "absolute",
    left: -30,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.12,
    zIndex: -1,
  },
  accentBlobRight: {
    position: "absolute",
    right: -40,
    bottom: 20,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.14,
    zIndex: -1,
  },
  accentDot: {
    position: "absolute",
    left: "40%",
    bottom: 12,
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.25,
    zIndex: -1,
  },
});
