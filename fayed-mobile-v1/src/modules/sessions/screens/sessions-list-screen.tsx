import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { SessionListCard } from "@/modules/sessions/components/session-list-card";
import { useMySessions } from "@/modules/sessions/hooks/use-sessions";
import { AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function SessionsListScreen() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const sessionsQuery = useMySessions();

  if (sessionsQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => sessionsQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!sessionsQuery.data || sessionsQuery.data.items.length === 0) {
    return (
      <AppScreen>
        <AppHeader title={t("sessionsTitle")} subtitle={t("sessionsSubtitle")} />
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  const now = Date.now();
  const upcoming = sessionsQuery.data.items.filter((item) => {
    if (!item.scheduledStartAt) return false;
    return new Date(item.scheduledStartAt).getTime() >= now;
  });
  const past = sessionsQuery.data.items.filter((item) => {
    if (!item.scheduledStartAt) return true;
    return new Date(item.scheduledStartAt).getTime() < now;
  });

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("sessionsTitle")} subtitle={t("sessionsSubtitle")} />
        {upcoming.length > 0 ? (
          <AppCard style={{ backgroundColor: "rgba(242,244,246,0.75)", gap: spacing.md }}>
            <AppText variant="title" style={{ fontWeight: "800" }}>
              {t("sessionsUpcomingTitle")}
            </AppText>
            {upcoming.map((session) => (
              <SessionListCard key={session.id} session={session} />
            ))}
          </AppCard>
        ) : null}
        {past.length > 0 ? (
          <AppCard style={{ backgroundColor: "rgba(242,244,246,0.55)", gap: spacing.md }}>
            <AppText variant="title" style={{ fontWeight: "800" }}>
              {t("sessionsPastTitle")}
            </AppText>
            {past.map((session) => (
              <SessionListCard key={session.id} session={session} />
            ))}
          </AppCard>
        ) : null}
      </View>
    </AppScreen>
  );
}
