import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type MessageDaySeparatorProps = {
  dateLabel: string;
};

export function MessageDaySeparator({ dateLabel }: MessageDaySeparatorProps) {
  const { colors, radii, spacing } = useAppTheme();

  return (
    <View
      style={[
        styles.row,
        {
          marginVertical: spacing.sm,
          backgroundColor: colors.surfaceLow,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xs,
        },
      ]}
    >
      <AppText variant="caption" color={colors.textMuted} style={styles.label}>
        {dateLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "center",
  },
  label: {
    fontWeight: "600",
  },
});
