import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import type { AvailabilityWindow } from "@/modules/practitioners/domain/practitioners.types";
import { formatWindowRange } from "@/modules/practitioners/lib/date";
import { AppCard, AppEmptyState, AppText } from "@/shared/ui";

type AvailabilityWindowListProps = {
  windows: AvailabilityWindow[];
  locale: string;
};

export function AvailabilityWindowList({
  windows,
  locale,
}: AvailabilityWindowListProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();

  if (windows.length === 0) {
    return (
      <AppEmptyState
        title={t("availableWindowsTitle")}
        description={t("profileAvailabilityHint")}
      />
    );
  }

  return (
    <AppCard style={{ backgroundColor: colors.surfaceLow }}>
      <View style={{ gap: spacing.md }}>
        <AppText variant="title" style={{ fontWeight: "800" }}>
          {t("availableWindowsTitle")}
        </AppText>
        {windows.slice(0, 8).map((window) => (
          <AppText key={`${window.startsAt}-${window.endsAt}`} color={colors.textSecondary}>
            {formatWindowRange(window.startsAt, window.endsAt, locale)}
          </AppText>
        ))}
      </View>
    </AppCard>
  );
}
