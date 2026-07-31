import React from "react";
import { StyleSheet, View, I18nManager } from "react-native";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

interface PublicSectionHeadingProps {
  eyebrow?: string;
  title: string;
}

export function PublicSectionHeading({ eyebrow, title }: PublicSectionHeadingProps) {
  const { publicTheme } = usePublicTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.sectionHeader, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
      {eyebrow && (
        <Text style={[styles.sectionEyebrow, { color: publicTheme.primaryText, backgroundColor: `${publicTheme.accentMint}40` }]}>
          {eyebrow}
        </Text>
      )}
      <Text variant="h2" style={[styles.sectionTitle, { color: publicTheme.primaryText }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 16,
    gap: 6,
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontWeight: "700",
  },
});
