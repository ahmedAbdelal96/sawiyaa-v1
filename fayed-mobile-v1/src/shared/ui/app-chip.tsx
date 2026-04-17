import { Pressable, StyleSheet } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type AppChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function AppChip({ label, selected = false, onPress }: AppChipProps) {
  const { colors, radii, spacing } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceLow,
          borderColor: selected ? colors.primary : "rgba(194,198,211,0.3)",
          borderRadius: radii.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <AppText color={selected ? "#FFFFFF" : colors.textSecondary} variant="bodySmall" style={styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
  text: {
    fontWeight: "600",
  },
});
