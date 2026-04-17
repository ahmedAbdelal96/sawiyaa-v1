import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import type { BookingDuration } from "@/modules/booking/domain/booking.types";
import { AppCard, AppText } from "@/shared/ui";

type SessionSummaryCardProps = {
  practitionerName: string;
  startsAt: string;
  durationMinutes: BookingDuration;
};

export function SessionSummaryCard({
  practitionerName,
  startsAt,
  durationMinutes,
}: SessionSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const { spacing, colors } = useAppTheme();
  const dateText = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));

  return (
    <AppCard style={{ backgroundColor: colors.surfaceLow }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" style={{ fontWeight: "800" }}>
          {t("bookingSummaryTitle")}
        </AppText>
        <AppText color={colors.textSecondary}>{practitionerName}</AppText>
        <AppText color={colors.textSecondary}>{dateText}</AppText>
        <AppText color={colors.primary} style={{ fontWeight: "700" }}>
          {`${durationMinutes} ${t("minutesLabel")}`}
        </AppText>
      </View>
    </AppCard>
  );
}
