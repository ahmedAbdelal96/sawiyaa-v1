import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type AppLoaderProps = {
  label?: string;
};

export function AppLoader({ label }: AppLoaderProps) {
  const { colors, spacing, radii } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceLow,
          borderRadius: radii.lg,
          gap: spacing.md,
          padding: spacing.xl,
        },
      ]}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <AppText color={colors.textSecondary}>{label}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
