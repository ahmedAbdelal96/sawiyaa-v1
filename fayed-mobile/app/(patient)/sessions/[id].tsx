import React, { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Header,
  Screen,
  Text,
  Card,
  Button,
  LoadingState,
  ErrorState,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  usePatientSession,
  useResolvePatientSessionJoinContract,
} from "../../../src/features/patient/sessions/hooks";
import type {
  SessionJoinBlockedReason,
  SessionStatus,
} from "../../../src/features/patient/sessions/types";
import {
  formatLocalizedDateTime,
  formatLocalizedDate,
  formatLocalizedTime,
} from "../../../src/features/patient/sessions/slot-utils";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";

export default function SessionDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const params = useLocalSearchParams<{ id: string }>();

  const sessionQuery = usePatientSession(params.id ?? null);
  const joinMutation = useResolvePatientSessionJoinContract();
  const [joinError, setJoinError] = useState<string | null>(null);

  const canAttemptJoin = useMemo(() => {
    const status = sessionQuery.data?.status;
    return status === "READY_TO_JOIN" || status === "IN_PROGRESS";
  }, [sessionQuery.data?.status]);

  if (sessionQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <ErrorState fullScreen onRetry={sessionQuery.refetch} />
      </Screen>
    );
  }

  const session = sessionQuery.data;

  const handleJoin = async () => {
    setJoinError(null);

    try {
      const payload = await joinMutation.mutateAsync(session.id);
      const contract = payload.item;

      if (!contract.canJoin || !contract.roomUrl) {
        setJoinError(
          t("patientSessionsFlow.detail.joinBlocked", {
            reason: t(
              `patientSessionsFlow.detail.joinBlockedReasons.${
                contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"
              }` as const,
            ),
          }),
        );
        return;
      }

      const joinUrl =
        contract.joinToken && contract.provider === "DAILY"
          ? `${contract.roomUrl}${contract.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(contract.joinToken)}`
          : contract.roomUrl;

      const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
      if (!safeJoinUrl) {
        setJoinError(t("patientSessionsFlow.detail.joinError"));
        return;
      }

      await Linking.openURL(safeJoinUrl);
      trackAnalyticsEvent("session_joined", {
        role: "patient",
        sessionId: session.id,
        sessionStatus: session.status,
        provider: contract.provider,
        source: "session_detail",
      });
    } catch (error) {
      setJoinError(extractApiErrorMessage(error));
    }
  };

  const statusText = formatStatusLabel(t, session.status);
  const needsPayment = session.status === "PENDING_PAYMENT";
  const cancellationEligible =
    session.status === "CONFIRMED" ||
    session.status === "UPCOMING" ||
    session.status === "PENDING_PRACTITIONER_RESPONSE";

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={() => router.back()}
        title={t("patientSessionsFlow.detail.title")}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.heroCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightColor: theme.colors.primary },
          ]}
        >
          <View style={styles.statusRow}>
            <Text color={theme.colors.textSecondary}>
              {t("patientSessionsFlow.common.status")}
            </Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Text color={theme.colors.primary} weight="600">
                {statusText}
              </Text>
            </View>
          </View>
          <Text weight="bold" style={styles.codeText}>
            {session.sessionCode}
          </Text>
          <Text color={theme.colors.textSecondary}>
            {session.practitioner.displayName ??
              t("patientSessionsFlow.common.practitionerFallback")}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.professionalTitle}>
            {t("patientSessionsFlow.common.videoSession")}
          </Text>
        </Card>

        <Card variant="flat" padding="lg" style={styles.sectionCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme.colors.primary}
            />
            <View style={styles.infoTextWrap}>
              <Text color={theme.colors.textMuted} style={styles.infoLabel}>
                {t("patientSessionsFlow.detail.dateLabel")}
              </Text>
              <Text weight="600" style={styles.infoValue}>
                {session.scheduledStartAt
                  ? formatLocalizedDate(session.scheduledStartAt, locale)
                  : t("patientSessionsFlow.common.notAvailable")}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.primary}
            />
            <View style={styles.infoTextWrap}>
              <Text color={theme.colors.textMuted} style={styles.infoLabel}>
                {t("patientSessionsFlow.detail.timeLabel")}
              </Text>
              <Text weight="600" style={styles.infoValue}>
                {session.scheduledStartAt && session.scheduledEndAt
                  ? `${formatLocalizedTime(session.scheduledStartAt, locale)} \u2013 ${formatLocalizedTime(session.scheduledEndAt, locale)}`
                  : session.scheduledStartAt
                    ? formatLocalizedTime(session.scheduledStartAt, locale)
                    : t("patientSessionsFlow.common.notAvailable")}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="hourglass-outline"
              size={18}
              color={theme.colors.primary}
            />
            <View style={styles.infoTextWrap}>
              <Text color={theme.colors.textMuted} style={styles.infoLabel}>
                {t("patientSessionsFlow.common.duration")}
              </Text>
              <Text weight="600" style={styles.infoValue}>
                {t("patientSessionsFlow.detail.durationValue", {
                  minutes: session.durationMinutes,
                })}
              </Text>
            </View>
          </View>

          {session.expiresAt ? (
            <View style={styles.infoRow}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={theme.colors.primary}
              />
              <View style={styles.infoTextWrap}>
                <Text color={theme.colors.textMuted} style={styles.infoLabel}>
                  {t("patientSessionsFlow.detail.expiresAt")}
                </Text>
                <Text weight="600" style={styles.infoValue}>
                  {formatLocalizedDateTime(session.expiresAt, locale)}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <Text weight="600" style={styles.sectionTitle}>
            {t("patientSessionsFlow.detail.preparationTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.noteText}>
            {t("patientSessionsFlow.detail.preparationHint")}
          </Text>
        </Card>

        {joinError ? (
          <Card variant="flat" padding="sm">
            <Text color="#ba1a1a">{joinError}</Text>
          </Card>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
          },
        ]}
      >
        <Button
          title={
            needsPayment
              ? t("patientSessionsFlow.detail.payNow")
              : joinMutation.isPending
                ? t("patientSessionsFlow.detail.joining")
                : t("patientSessionsFlow.detail.join")
          }
          onPress={() => {
            if (needsPayment) {
              router.push(`/(patient)/sessions/${session.id}/pay`);
              return;
            }
            handleJoin();
          }}
          disabled={
            needsPayment ? false : !canAttemptJoin || joinMutation.isPending
          }
          style={styles.primaryAction}
        />

        <Button
          title={t("patientSessionsFlow.detail.viewCancellation")}
          onPress={() =>
            router.push(`/(patient)/sessions/${session.id}/cancel-preview`)
          }
          variant="secondary"
          disabled={!cancellationEligible}
          style={styles.secondaryAction}
        />
      </View>
    </Screen>
  );
}

function formatStatusLabel(
  t: ReturnType<typeof useTranslation>["t"],
  status: SessionStatus,
) {
  const map: Record<SessionStatus, string> = {
    DRAFT: t("patientSessionsFlow.statuses.DRAFT"),
    PENDING_PAYMENT: t("patientSessionsFlow.statuses.PENDING_PAYMENT"),
    PENDING_PRACTITIONER_RESPONSE: t(
      "patientSessionsFlow.statuses.PENDING_PRACTITIONER_RESPONSE",
    ),
    CONFIRMED: t("patientSessionsFlow.statuses.CONFIRMED"),
    UPCOMING: t("patientSessionsFlow.statuses.UPCOMING"),
    READY_TO_JOIN: t("patientSessionsFlow.statuses.READY_TO_JOIN"),
    IN_PROGRESS: t("patientSessionsFlow.statuses.IN_PROGRESS"),
    COMPLETED: t("patientSessionsFlow.statuses.COMPLETED"),
    CANCELLED: t("patientSessionsFlow.statuses.CANCELLED"),
    NO_SHOW: t("patientSessionsFlow.statuses.NO_SHOW"),
    EXPIRED: t("patientSessionsFlow.statuses.EXPIRED"),
    REFUND_PENDING: t("patientSessionsFlow.statuses.REFUND_PENDING"),
    REFUNDED: t("patientSessionsFlow.statuses.REFUNDED"),
  };

  return map[status] ?? status;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 145,
    gap: 12,
  },
  heroCard: {
    borderRightWidth: 3,
    borderRightColor: "#3f7dcf",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  codeText: {
    fontSize: 24,
    marginBottom: 4,
  },
  professionalTitle: {
    marginTop: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e7ecf2",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTextWrap: {
    marginStart: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  primaryAction: {
    borderRadius: 12,
  },
  secondaryAction: {
    borderRadius: 12,
  },
});
