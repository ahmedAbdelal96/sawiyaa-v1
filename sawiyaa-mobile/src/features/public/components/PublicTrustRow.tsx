import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicTrustRow() {
  const { t } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { rowDirection } = useAppDirection();
  const { width } = useWindowDimensions();

  // Responsive layout: viewports < 390 stack or wrap compactly
  const isNarrow = width < 390;

  const trustItems = [
    {
      icon: "checkmark-circle-outline" as const,
      label: t("publicHome.trust.clearChoice"),
    },
    {
      icon: "calendar-outline" as const,
      label: t("publicHome.trust.simpleBooking"),
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: t("publicHome.trust.privacyPriority"),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.trustRow, { flexDirection: rowDirection, flexWrap: "wrap" }]}>
        {trustItems.map((item, idx) => (
          <View
            key={idx}
            style={[
              styles.trustItem,
              {
                flexDirection: rowDirection,
                backgroundColor: publicTheme.raisedSurface,
                borderColor: publicTheme.subtleBorder,
                flex: isNarrow ? (idx === 2 ? 1 : 0) : 1,
                minWidth: isNarrow ? 140 : 100,
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={publicTheme.primaryText}
              importantForAccessibility="no"
            />
            <Text
              style={[styles.trustLabel, { color: publicTheme.primaryText }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    paddingVertical: 12,
  },
  trustRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  trustItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trustLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
