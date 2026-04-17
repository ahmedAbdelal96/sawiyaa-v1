import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

function resolveToneColors(tone: StatusBadgeTone, colors: ReturnType<typeof useAppTheme>["colors"]) {
  switch (tone) {
    case "success":
      return { bg: "rgba(197,236,204,0.7)", text: colors.success };
    case "warning":
      return { bg: "rgba(214,227,255,0.8)", text: colors.primary };
    case "danger":
      return { bg: "rgba(255,218,214,0.85)", text: colors.danger };
    case "info":
      return { bg: "rgba(213,227,255,0.75)", text: colors.primary };
    default:
      return { bg: colors.surfaceLow, text: colors.textSecondary };
  }
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const { colors, radii, spacing } = useAppTheme();
  const toneColors = resolveToneColors(tone, colors);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: toneColors.bg,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: 8,
        },
      ]}
    >
      <AppText variant="caption" color={toneColors.text} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "700",
  },
});
