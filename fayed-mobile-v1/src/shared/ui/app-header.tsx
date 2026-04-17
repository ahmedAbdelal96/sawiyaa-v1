import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export function AppHeader({ title, subtitle, rightSlot }: AppHeaderProps) {
  const { colors, spacing } = useAppTheme();

  return (
    <View style={[styles.row, { marginBottom: spacing.lg }]}>
      <View style={[styles.copy, { gap: spacing.xs }]}>
        <AppText variant="heading" style={[styles.title, { color: colors.text }]}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    maxWidth: "92%",
  },
});
