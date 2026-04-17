import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { useCancelSession, usePrepareRuntime, useSessionDetails } from "@/modules/sessions/hooks/use-sessions";
import { mapSessionStatusLabel } from "@/modules/sessions/lib/session-presentation";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen, AppText, StatusBadge } from "@/shared/ui";

export function SessionDetailsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const sessionQuery = useSessionDetails(sessionId);
  const prepareRuntimeMutation = usePrepareRuntime(sessionId);
  const cancelSessionMutation = useCancelSession(sessionId);

  if (!sessionId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (sessionQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => sessionQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!sessionQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  const startsAtText = sessionQuery.data.scheduledStartAt
    ? new Intl.DateTimeFormat(i18n.language, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(sessionQuery.data.scheduledStartAt))
    : "-";

  const canPay = sessionQuery.data.status === "PENDING_PAYMENT";
  const canCancel =
    sessionQuery.data.status === "SCHEDULED" || sessionQuery.data.status === "PENDING_PAYMENT";

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("sessionDetailsTitle")} subtitle={sessionQuery.data.sessionCode} />

        <AppCard style={{ backgroundColor: colors.surfaceLow }}>
          <View style={{ gap: spacing.sm }}>
            <AppText color={colors.textSecondary}>
              {sessionQuery.data.practitioner.displayName || sessionQuery.data.practitioner.slug}
            </AppText>
            <AppText color={colors.textSecondary}>{startsAtText}</AppText>
            <StatusBadge label={mapSessionStatusLabel(sessionQuery.data.status, t)} tone="info" />
            <AppText color={colors.textSecondary}>
              {`${sessionQuery.data.durationMinutes} ${t("minutesLabel")}`}
            </AppText>
          </View>
        </AppCard>

        {canPay ? (
          <AppButton
            label={t("sessionGoToPayment")}
            onPress={() => router.push(routes.app.paymentCheckout(sessionId))}
          />
        ) : null}

        <AppButton
          label={t("supportCreateTicket")}
          onPress={() =>
            router.push(
              routes.app.supportNewTicketPrefilled({
                category: "SESSION",
                relatedSessionId: sessionId,
                subject: `${t("sessionDetailsTitle")} - ${sessionQuery.data.sessionCode}`,
              }),
            )
          }
          variant="secondary"
        />

        <AppButton
          label={t("sessionPrepareRuntime")}
          loading={prepareRuntimeMutation.isPending}
          onPress={() =>
            prepareRuntimeMutation.mutate(undefined, {
              onSuccess: () => router.push(routes.app.sessionJoin(sessionId)),
            })
          }
          variant="secondary"
        />

        <AppButton
          label={t("sessionJoinNow")}
          onPress={() => router.push(routes.app.sessionJoin(sessionId))}
          variant="secondary"
        />

        {canCancel ? (
          <AppButton
            label={t("sessionCancel")}
            loading={cancelSessionMutation.isPending}
            onPress={() =>
              cancelSessionMutation.mutate(undefined, {
                onSuccess: () => {
                  void sessionQuery.refetch();
                },
              })
            }
            variant="ghost"
          />
        ) : null}

        {(prepareRuntimeMutation.isError || cancelSessionMutation.isError) ? <AppErrorState /> : null}
      </View>
    </AppScreen>
  );
}
