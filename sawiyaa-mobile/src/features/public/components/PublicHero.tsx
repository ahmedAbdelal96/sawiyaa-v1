import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicHero() {
  const router = useRouter();
  const { t } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { rowDirection, textAlign, arrowForward } = useAppDirection();

  return (
    <View style={[styles.heroSection, { backgroundColor: publicTheme.canvas }]}>
      {/* 1. Concise Title (Max 2 lines) */}
      <Text
        style={[styles.heroTitle, { color: publicTheme.primaryText, textAlign }]}
        numberOfLines={2}
      >
        {t("publicHome.hero.title")}
      </Text>

      {/* 2. Concise Subtitle (Max 2 lines) */}
      <Text
        style={[styles.heroSubtitle, { color: publicTheme.secondaryText, textAlign }]}
        numberOfLines={2}
      >
        {t("publicHome.hero.subtitle")}
      </Text>

      {/* 3. Patient Action Area (Primary & Secondary Actions) */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup/patient")}
          style={[styles.primaryBtn, { backgroundColor: publicTheme.primaryText }]}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={t("publicHome.hero.primaryCta")}
        >
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Text style={styles.primaryBtnText} color="#FFFFFF">
              {t("publicHome.hero.primaryCta")}
            </Text>
            <Ionicons
              name={arrowForward}
              size={18}
              color="#FFFFFF"
              importantForAccessibility="no"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signin/patient")}
          style={[styles.secondaryBtn, { backgroundColor: publicTheme.accentMint, borderColor: publicTheme.subtleBorder }]}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={t("publicHome.hero.secondaryCta")}
        >
          <Text style={[styles.secondaryBtnText, { color: publicTheme.primaryText }]}>
            {t("publicHome.hero.secondaryCta")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    paddingTop: 24,
    paddingBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 36,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.9,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(0, 0, 0, 0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
