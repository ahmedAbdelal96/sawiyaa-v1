import React from "react";
import { StyleSheet, View, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicJourney() {
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;

  const steps = [
    {
      num: "1",
      title: t("publicHome.journey.discover.title"),
      desc: t("publicHome.journey.discover.desc"),
    },
    {
      num: "2",
      title: t("publicHome.journey.choose.title"),
      desc: t("publicHome.journey.choose.desc"),
    },
    {
      num: "3",
      title: t("publicHome.journey.start.title"),
      desc: t("publicHome.journey.start.desc"),
    },
  ];

  return (
    <View style={styles.section}>
      <Text variant="h2" style={[styles.timelineTitle, { color: publicTheme.primaryText, textAlign: isRTL ? "right" : "left" }]}>
        {t("publicHome.journey.title")}
      </Text>

      <View style={styles.timelineContainer}>
        {/* Connected Vertical Timeline Line */}
        <View style={[styles.connectingLine, { backgroundColor: publicTheme.accentSand, [isRTL ? "right" : "left"]: 21 }]} />

        {steps.map((step, idx) => (
          <View key={idx} style={[styles.timelineItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {/* Dot/Marker */}
            <View style={[styles.timelineNumCircle, { backgroundColor: publicTheme.primaryText }]}>
              <Text style={styles.timelineNumText} color="#FFFFFF">
                {step.num}
              </Text>
            </View>

            {/* Content text */}
            <View style={[styles.timelineTextWrapper, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text variant="title" style={{ color: publicTheme.primaryText, fontWeight: "700" }}>
                {step.title}
              </Text>
              <Text style={[styles.timelineItemDesc, { color: publicTheme.secondaryText, textAlign: isRTL ? "right" : "left" }]}>
                {step.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 36,
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  timelineTitle: {
    marginBottom: 28,
    fontWeight: "900",
    fontSize: 26,
  },
  timelineContainer: {
    position: "relative",
    gap: 28,
  },
  connectingLine: {
    position: "absolute",
    top: 22,
    bottom: 22,
    width: 2,
    opacity: 0.3,
  },
  timelineItem: {
    gap: 18,
    alignItems: "flex-start",
  },
  timelineNumCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowColor: "rgba(0, 0, 0, 0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineNumText: {
    fontSize: 16,
    fontWeight: "900",
  },
  timelineTextWrapper: {
    flex: 1,
    paddingTop: 8,
  },
  timelineItemDesc: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
});
