import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { RuntimeBlockedStateCard } from "@/modules/sessions/components/runtime-blocked-state-card";
import { usePrepareRuntime, useSessionJoinContract } from "@/modules/sessions/hooks/use-sessions";
import { mapRuntimeProviderLabel, mapSessionStatusLabel } from "@/modules/sessions/lib/session-presentation";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function SessionJoinScreen() {
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const joinQuery = useSessionJoinContract(sessionId);
  const prepareRuntimeMutation = usePrepareRuntime(sessionId);

  if (!sessionId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (joinQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (joinQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => joinQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!joinQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  const hasJoinUrl = Boolean(joinQuery.data.roomUrl);
  const canJoinSafely = joinQuery.data.canJoin && hasJoinUrl;

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("sessionJoinTitle")} subtitle={t("sessionJoinSubtitle")} />

        <AppCard>
          <View style={{ gap: spacing.sm }}>
            <AppText color={colors.textSecondary}>
              {t("sessionRuntimeStatusLabel")}: {mapSessionStatusLabel(joinQuery.data.status, t)}
            </AppText>
            <AppText color={colors.textSecondary}>
              {t("sessionRuntimeProviderLabel")}: {mapRuntimeProviderLabel(joinQuery.data.provider, t)}
            </AppText>
            <AppText color={colors.textSecondary}>
              {canJoinSafely ? t("sessionRuntimeReady") : t("sessionRuntimeNotReady")}
            </AppText>
          </View>
        </AppCard>

        {canJoinSafely ? (
          <AppButton
            label={t("sessionJoinNow")}
            onPress={async () => {
              await Linking.openURL(joinQuery.data.roomUrl!);
            }}
          />
        ) : null}

        {!canJoinSafely && joinQuery.data.blockedReason ? (
          <RuntimeBlockedStateCard blockedReason={joinQuery.data.blockedReason} />
        ) : null}

        {!canJoinSafely && !joinQuery.data.blockedReason ? (
          <AppCard>
            <AppText color={colors.textSecondary}>{t("sessionBlockedUnknown")}</AppText>
          </AppCard>
        ) : null}

        {!canJoinSafely ? (
          <AppButton
            label={t("sessionPrepareRuntime")}
            loading={prepareRuntimeMutation.isPending}
            onPress={() =>
              prepareRuntimeMutation.mutate(undefined, {
                onSuccess: () => {
                  void joinQuery.refetch();
                },
              })
            }
            variant="secondary"
          />
        ) : null}

        <AppButton
          label={t("sessionJoinRefresh")}
          onPress={() => {
            void joinQuery.refetch();
          }}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
}
