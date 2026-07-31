import React from "react";
import { StyleSheet, View, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";

interface PublicFeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  style?: any;
}

export function PublicFeatureCard({ icon, title, desc, style }: PublicFeatureCardProps) {
  const { publicTheme } = usePublicTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.bentoCard,
        {
          backgroundColor: publicTheme.raisedSurface,
          borderColor: publicTheme.subtleBorder,
        },
        style,
      ]}
    >
      <View style={[styles.bentoHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.iconPill, { backgroundColor: publicTheme.accentSand }]}>
          <Ionicons name={icon as any} size={22} color={publicTheme.primaryText} />
        </View>
        <Text variant="title" style={[styles.bentoTitle, { color: publicTheme.primaryText, textAlign: isRTL ? "right" : "left" }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.bentoDesc, { color: publicTheme.secondaryText, textAlign: isRTL ? "right" : "left" }]}>
        {desc}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bentoCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    shadowColor: "rgba(31, 51, 47, 0.02)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  bentoHeader: {
    alignItems: "center",
    gap: 12,
  },
  bentoTitle: {
    fontWeight: "600",
    flex: 1,
  },
  bentoDesc: {
    lineHeight: 22,
    fontSize: 15,
  },
  iconPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
