import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppCard, AppText } from "@/shared/ui";

type RuntimeBlockedStateCardProps = {
  blockedReason: string;
};

function mapBlockedReason(reason: string, t: (key: string) => string) {
  switch (reason) {
    case "SESSION_NOT_JOINABLE_STATUS":
      return t("sessionBlockedNotJoinable");
    case "SESSION_NOT_VIDEO_MODE":
      return t("sessionBlockedNotVideo");
    case "SESSION_TIME_WINDOW_NOT_OPEN":
      return t("sessionBlockedTimeWindow");
    case "SESSION_RUNTIME_NOT_PREPARED":
      return t("sessionBlockedNotPrepared");
    default:
      return t("sessionBlockedUnknown");
  }
}

export function RuntimeBlockedStateCard({ blockedReason }: RuntimeBlockedStateCardProps) {
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();

  return (
    <AppCard>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" style={{ fontWeight: "800" }}>
          {t("sessionJoinUnavailableTitle")}
        </AppText>
        <AppText color={colors.textSecondary}>{mapBlockedReason(blockedReason, t)}</AppText>
      </View>
    </AppCard>
  );
}
