import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";

export function HomeActionCard({
  title,
  subtitle,
  ctaLabel,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { isRtl, rowDirection, arrowForward } = useAppDirection();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: "#FCFAF6", // Warm Card
          borderColor: "#E8DED0", // Soft border
          borderWidth: 1,
          borderLeftWidth: isRtl ? 1 : 4,
          borderRightWidth: isRtl ? 4 : 1,
          borderLeftColor: isRtl ? "#E8DED0" : "#A7BFAE", // Soft Sage on LTR left edge
          borderRightColor: isRtl ? "#A7BFAE" : "#E8DED0", // Soft Sage on RTL right edge
          ...theme.shadows.sm,
        },
      ]}
    >
      <View style={[styles.inner, { flexDirection: rowDirection }]}>
        <View style={styles.leading}>
          <View style={[styles.iconWrap, { backgroundColor: "#EEF4EF" }]}>
            <Ionicons name={icon} size={20} color="#24564F" />
          </View>
        </View>

        <View style={[styles.textWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text variant="title" weight="700" style={[styles.title, { textAlign: isRtl ? "right" : "left" }]} numberOfLines={2}>
            {title}
          </Text>
          <Text
            variant="bodySmall"
            color={theme.colors.textSecondary}
            style={[styles.subtitle, { textAlign: isRtl ? "right" : "left" }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
          <View style={[styles.ctaRow, { flexDirection: rowDirection }]}>
            <Text variant="bodySmall" weight="700" color="#24564F" style={{ textDecorationLine: "underline" }}>
              {ctaLabel}
            </Text>
            <Ionicons
              name={arrowForward as any}
              size={14}
              color="#24564F"
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, // Replaced 24 with 20 for brand consistency
    padding: 16,
    marginBottom: 16,
  },
  inner: {
    alignItems: "flex-start",
    gap: 14,
  },
  leading: {
    paddingTop: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
    fontSize: 15,
  },
  subtitle: {
    marginBottom: 12,
    fontSize: 12.5,
    lineHeight: 18,
  },
  ctaRow: {
    alignItems: "center",
    gap: 6,
  },
});
