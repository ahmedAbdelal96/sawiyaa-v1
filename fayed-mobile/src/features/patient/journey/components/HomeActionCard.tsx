import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";

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

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text variant="title" weight="600" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodySmall" color={theme.colors.textSecondary} style={styles.subtitle}>
          {subtitle}
        </Text>
        <Text variant="bodySmall" weight="600" color={theme.colors.primary}>
          {ctaLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    marginBottom: 7,
  },
});

