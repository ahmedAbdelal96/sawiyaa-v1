import React from "react";
import { StyleSheet, View, Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { usePublicTheme } from "../theme/public-theme";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicSereneVisual() {
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;

  return (
    <View style={styles.visualContainer}>
      <View style={[styles.visualCard, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}>
        <View style={[styles.sereneVisualCanvas, { backgroundColor: publicTheme.canvas }]}>
          <View style={[styles.visualSun, { backgroundColor: publicTheme.accentPeach }]} />
          <View style={[styles.visualHills, { backgroundColor: publicTheme.accentMint }]} />
          <View style={[styles.visualHillsSecond, { backgroundColor: publicTheme.accentSand }]} />
        </View>
        
        <View
          style={[
            styles.pulseBadge,
            {
              backgroundColor: publicTheme.raisedSurface,
              borderColor: publicTheme.subtleBorder,
              alignSelf: isRTL ? "flex-end" : "flex-start",
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View style={styles.pulseDot} />
          <Text style={[styles.pulseText, { color: publicTheme.primaryText }]}>
            {t("publicHome.sereneBadge")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visualContainer: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    marginBottom: 36,
  },
  visualCard: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 12,
    shadowColor: "rgba(0, 0, 0, 0.04)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  sereneVisualCanvas: {
    height: 180,
    borderRadius: 24,
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  visualSun: {
    position: "absolute",
    top: 30,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.8,
  },
  visualHills: {
    height: 100,
    width: "120%",
    borderRadius: 100,
    position: "absolute",
    bottom: -40,
    left: -40,
    transform: [{ rotate: "-8deg" }],
  },
  visualHillsSecond: {
    height: 90,
    width: "120%",
    borderRadius: 100,
    position: "absolute",
    bottom: -50,
    right: -40,
    transform: [{ rotate: "6deg" }],
    opacity: 0.9,
  },
  pulseBadge: {
    marginTop: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  pulseText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
