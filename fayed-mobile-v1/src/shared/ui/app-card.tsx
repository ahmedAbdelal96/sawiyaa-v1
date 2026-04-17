import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";

type AppCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AppCard({ children, style }: AppCardProps) {
  const { colors, radii, shadows, spacing } = useAppTheme();

  return (
    <View
      style={[
        styles.base,
        shadows.card,
        {
          backgroundColor: colors.surfaceLowest,
          borderRadius: radii.lg,
          padding: spacing.xl,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
