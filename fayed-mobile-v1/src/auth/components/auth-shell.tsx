import type { PropsWithChildren } from "react";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppCard, AppText } from "@/shared/ui";

type AuthShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const { colors, spacing } = useAppTheme();

  return (
    <View style={{ gap: spacing.xl, justifyContent: "center", flex: 1 }}>
      <View style={{ gap: spacing.sm }}>
        <AppText color={colors.primary} style={{ fontWeight: "800" }}>
          Fayed
        </AppText>
        <AppText variant="display" style={{ fontWeight: "900" }}>
          {title}
        </AppText>
        <AppText color={colors.textSecondary}>{subtitle}</AppText>
      </View>
      <AppCard style={{ backgroundColor: colors.surfaceLowest, gap: spacing.md }}>{children}</AppCard>
    </View>
  );
}
