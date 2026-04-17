import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { SessionItem } from "@/modules/sessions/domain/sessions.types";
import { mapSessionStatusLabel } from "@/modules/sessions/lib/session-presentation";
import { AppButton, AppCard, AppText, StatusBadge } from "@/shared/ui";

type SessionListCardProps = {
  session: SessionItem;
};

export function SessionListCard({ session }: SessionListCardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const startsAtText = session.scheduledStartAt
    ? new Intl.DateTimeFormat(i18n.language, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(session.scheduledStartAt))
    : "-";

  return (
    <AppCard style={{ backgroundColor: colors.surfaceLowest }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" style={{ fontWeight: "800" }}>
          {session.practitioner.displayName || session.practitioner.slug}
        </AppText>
        <AppText color={colors.textSecondary}>{startsAtText}</AppText>
        <StatusBadge
          label={mapSessionStatusLabel(session.status, t)}
          tone={session.status === "COMPLETED" ? "success" : "info"}
        />
        <AppButton
          label={t("sessionOpenDetails")}
          onPress={() => router.push(routes.app.sessionDetails(session.id))}
          variant="secondary"
        />
      </View>
    </AppCard>
  );
}
