import React from "react";
import { StyleSheet, View, Text, I18nManager } from "react-native";
import { usePublicTheme } from "../theme/public-theme";

interface PublicDiscoveryCardProps {
  title: string;
  desc: string;
  isSecondary?: boolean;
}

export function PublicDiscoveryCard({ title, desc, isSecondary }: PublicDiscoveryCardProps) {
  const { publicTheme } = usePublicTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.teaserCard,
        {
          backgroundColor: isSecondary ? publicTheme.secondaryText : publicTheme.primaryText,
          shadowColor: publicTheme.ambientShadow,
        },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${desc}`}
    >
      <View style={styles.teaserArtBg}>
        <View
          style={[
            styles.teaserCircle,
            {
              backgroundColor: isSecondary ? publicTheme.accentSand : publicTheme.accentMint,
              opacity: 0.35,
            },
          ]}
        />
        <View
          style={[
            styles.teaserMiniDot,
            {
              backgroundColor: isSecondary ? publicTheme.accentMint : publicTheme.accentPeach,
              opacity: 0.4,
            },
          ]}
        />
      </View>
      <Text style={[styles.teaserTitle, { textAlign: isRTL ? "right" : "left" }]}>
        {title}
      </Text>
      <Text style={[styles.teaserDesc, { textAlign: isRTL ? "right" : "left" }]}>
        {desc}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  teaserCard: {
    borderRadius: 28,
    height: 170,
    padding: 24,
    justifyContent: "flex-end",
    position: "relative",
    overflow: "hidden",
    flex: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  teaserArtBg: {
    position: "absolute",
    right: -25,
    top: -25,
    width: 120,
    height: 120,
  },
  teaserCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  teaserMiniDot: {
    position: "absolute",
    bottom: 10,
    left: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  teaserTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  teaserDesc: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
