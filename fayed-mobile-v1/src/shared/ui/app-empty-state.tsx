import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppButton } from "@/shared/ui/app-button";
import { AppCard } from "@/shared/ui/app-card";
import { AppText } from "@/shared/ui/app-text";

type AppEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function AppEmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
}: AppEmptyStateProps) {
  const { colors, spacing } = useAppTheme();

  return (
    <AppCard style={{ backgroundColor: colors.surfaceLow }}>
      <View style={{ gap: spacing.md }}>
        <View
          style={{
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: colors.surfaceLowest,
            borderRadius: 999,
            height: 42,
            justifyContent: "center",
            width: 42,
          }}
        >
          <AppText color={colors.textMuted}>...</AppText>
        </View>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText color={colors.textSecondary}>{description}</AppText>
        {actionLabel && onActionPress ? (
          <AppButton label={actionLabel} onPress={onActionPress} style={styles.action} />
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: "800",
  },
  action: {
    marginTop: 8,
  },
});
