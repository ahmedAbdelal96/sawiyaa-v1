import React, { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CompactActionRow,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
  formatDateTime,
} from "../../src/components/ui";
import {
  usePatientSessions,
  useResolvePatientSessionJoinContract,
} from "../../src/features/patient/sessions/hooks";
import type {
  SessionJoinContract,
  SessionListItem,
  SessionStatus,
} from "../../src/features/patient/sessions/types";
import { useTheme } from "../../src/providers/ThemeProvider";
import { extractApiErrorMessage } from "../../src/lib/api";
import { normalizeAllowedExternalUrl } from "../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../src/lib/analytics";

const UPCOMING_STATUSES: SessionStatus[] = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PENDING_PRACTITIONER_RESPONSE",
  "CONFIRMED",
  "UPCOMING",
];

const ACTIVE_STATUSES: SessionStatus[] = ["READY_TO_JOIN", "IN_PROGRESS"];

const RECENT_STATUSES: SessionStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
];

export default function PatientSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const joinMutation = useResolvePatientSessionJoinContract();
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const sessionsQuery = usePatientSessions({ page: 1, limit: 50 });
  const sessions = sessionsQuery.data?.items ?? [];
  const sections = useMemo(() => buildWorkspaceSections(sessions), [sessions]);
  const overview = useMemo(() => buildOverview(sessions), [sessions]);

  const handleViewDetails = (sessionId: string) => {
    router.push(`/(patient)/sessions/${sessionId}`);
  };

  const handleContinuePayment = (sessionId: string) => {
    router.push(`/(patient)/sessions/${sessionId}/pay`);
  };

  const handleJoinSession = async (session: SessionListItem) => {
    if (!isJoinCandidate(session)) {
      handleViewDetails(session.id);
      return;
    }

    setJoiningSessionId(session.id);
    setFeedback(null);

    try {
      const payload = await joinMutation.mutateAsync(session.id);
      const contract = payload.item;

      if (!contract.canJoin || !contract.roomUrl) {
        setFeedback(
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

      const joinUrl = buildJoinUrl(contract);
      if (joinUrl) {
        const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
        if (!safeJoinUrl) {
          setFeedback(t("patientSessionsFlow.detail.joinError"));
          return;
        }

        await Linking.openURL(safeJoinUrl);
        trackAnalyticsEvent("session_joined", {
          role: "patient",
          sessionId: session.id,
          sessionStatus: session.status,
          provider: contract.provider,
          source: "sessions_workspace",
        });
        return;
      }

      setFeedback(
        t("patientSessionsFlow.detail.joinBlocked", {
          reason: t(
            "patientSessionsFlow.detail.joinBlockedReasons.SESSION_NOT_JOINABLE_STATUS",
          ),
        }),
      );
    } catch (error) {
      setFeedback(extractApiErrorMessage(error));
    } finally {
      setJoiningSessionId(null);
    }
  };

  return (
    <ListPageScaffold
      title={t("patientSessionsFlow.list.workspace.title")}
      loading={sessionsQuery.isLoading}
      loadingMessage={t("patientSessionsFlow.common.loading")}
      error={sessionsQuery.isError}
      errorTitle={t("patientSessionsFlow.common.loadError")}
      errorMessage={t("patientSessionsFlow.common.loadError")}
      onRetry={() => void sessionsQuery.refetch()}
      retryText={t("patientSessionsFlow.common.retry")}
      empty={!sessionsQuery.isLoading && !sessionsQuery.isError && sessions.length === 0}
      emptyTitle={t("patientSessionsFlow.list.emptyTitle")}
      emptyDescription={t("patientSessionsFlow.list.emptyDescription")}
      emptyActionLabel={t("patientSessionsFlow.list.findTherapist")}
      onEmptyAction={() => router.push("/(patient)/discovery")}
      contentContainerStyle={styles.scaffoldContent}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="flat" padding="lg" style={styles.heroCard}>
          <SectionHeader
            title={t("patientSessionsFlow.list.workspace.subtitle")}
            subtitle={t("patientSessionsFlow.list.workspace.heroNote")}
          />

          <View style={styles.overviewList}>
            <SummaryRow
              label={t("patientSessionsFlow.list.workspace.overview.total")}
              value={String(overview.total)}
              helperText={t("patientSessionsFlow.list.workspace.overview.totalHint")}
            />
            <SummaryRow
              label={t("patientSessionsFlow.list.workspace.overview.action")}
              value={String(overview.actionRequired)}
              helperText={t("patientSessionsFlow.list.workspace.overview.actionHint")}
            />
            <SummaryRow
              label={t("patientSessionsFlow.list.workspace.overview.active")}
              value={String(overview.active)}
              helperText={t("patientSessionsFlow.list.workspace.overview.activeHint")}
            />
          </View>
        </Card>

        {feedback ? (
          <Card variant="flat" padding="md" style={styles.feedbackCard}>
            <Text color={theme.colors.textSecondary}>{feedback}</Text>
          </Card>
        ) : null}

        {sections.map((section) => (
          <View key={section.key} style={styles.sectionBlock}>
            <SectionHeader
              title={t(section.titleKey)}
              subtitle={t(section.subtitleKey)}
            />

            <View style={styles.sectionCards}>
              {section.items.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  locale={locale}
                  joiningSessionId={joiningSessionId}
                  onJoin={handleJoinSession}
                  onContinuePayment={handleContinuePayment}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ListPageScaffold>
  );
}

function SessionCard({
  session,
  locale,
  joiningSessionId,
  onJoin,
  onContinuePayment,
  onViewDetails,
}: {
  session: SessionListItem;
  locale: string;
  joiningSessionId: string | null;
  onJoin: (session: SessionListItem) => void;
  onContinuePayment: (sessionId: string) => void;
  onViewDetails: (sessionId: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const tone = mapSessionTone(session.status);
  const isJoinable = isJoinCandidate(session);
  const isJoining = joiningSessionId === session.id;

  return (
    <Card variant="outlined" padding="lg" style={styles.sessionCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTextWrap}>
          <Text weight="600" style={styles.sessionTitle} color={theme.colors.textPrimary}>
            {session.practitioner.displayName ??
              t("patientSessionsFlow.common.practitionerFallback")}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.sessionCode}>
            {session.sessionCode}
          </Text>
        </View>

        <StatusChip
          label={t(`patientSessionsFlow.statuses.${session.status}`)}
          tone={tone}
        />
      </View>

      <View style={styles.metaStack}>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {session.scheduledStartAt
            ? formatDateTime(session.scheduledStartAt, locale)
            : t("patientSessionsFlow.common.notAvailable")}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {t("patientSessionsFlow.list.durationValue", {
            minutes: session.durationMinutes,
          })}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {t("patientSessionsFlow.common.videoSession")}
        </Text>
      </View>

      <View style={styles.actionsBlock}>
        {isJoinable ? (
          <Button
            title={
              isJoining
                ? t("patientSessionsFlow.detail.joining")
                : t("patientSessionsFlow.detail.join")
            }
            onPress={() => void onJoin(session)}
            disabled={isJoining}
          />
        ) : session.status === "PENDING_PAYMENT" ? (
          <Button
            title={t("patientSessionsFlow.detail.payNow")}
            onPress={() => onContinuePayment(session.id)}
          />
        ) : null}

        <CompactActionRow
          label={t("patientSessionsFlow.list.workspace.viewDetails")}
          onPress={() => onViewDetails(session.id)}
          accessibilityLabel={t("patientSessionsFlow.list.workspace.viewDetails")}
        />
      </View>
    </Card>
  );
}

function buildWorkspaceSections(sessions: SessionListItem[]) {
  const upcoming: SessionListItem[] = [];
  const active: SessionListItem[] = [];
  const recent: SessionListItem[] = [];

  for (const session of sessions) {
    if (ACTIVE_STATUSES.includes(session.status)) {
      active.push(session);
      continue;
    }

    if (UPCOMING_STATUSES.includes(session.status)) {
      upcoming.push(session);
      continue;
    }

    recent.push(session);
  }

  return [
    {
      key: "upcoming",
      titleKey: "patientSessionsFlow.list.workspace.sections.upcoming.title",
      subtitleKey: "patientSessionsFlow.list.workspace.sections.upcoming.subtitle",
      items: sortBySchedule(upcoming, "asc"),
    },
    {
      key: "active",
      titleKey: "patientSessionsFlow.list.workspace.sections.active.title",
      subtitleKey: "patientSessionsFlow.list.workspace.sections.active.subtitle",
      items: sortBySchedule(active, "asc"),
    },
    {
      key: "recent",
      titleKey: "patientSessionsFlow.list.workspace.sections.recent.title",
      subtitleKey: "patientSessionsFlow.list.workspace.sections.recent.subtitle",
      items: sortBySchedule(recent, "desc"),
    },
  ].filter((section) => section.items.length > 0);
}

function buildOverview(sessions: SessionListItem[]) {
  const actionRequired = sessions.filter((session) =>
    ["PENDING_PAYMENT", "PENDING_PRACTITIONER_RESPONSE", "READY_TO_JOIN"].includes(
      session.status,
    ),
  ).length;
  const active = sessions.filter((session) =>
    ["CONFIRMED", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
      session.status,
    ),
  ).length;

  return {
    total: sessions.length,
    actionRequired,
    active,
  };
}

function sortBySchedule(sessions: SessionListItem[], direction: "asc" | "desc") {
  return [...sessions].sort((left, right) => {
    const leftTimestamp = getSessionTimestamp(left);
    const rightTimestamp = getSessionTimestamp(right);

    if (leftTimestamp === null && rightTimestamp === null) {
      return 0;
    }

    if (leftTimestamp === null) {
      return 1;
    }

    if (rightTimestamp === null) {
      return -1;
    }

    return direction === "asc"
      ? leftTimestamp - rightTimestamp
      : rightTimestamp - leftTimestamp;
  });
}

function getSessionTimestamp(session: SessionListItem) {
  const raw = session.scheduledStartAt ?? session.scheduledEndAt;
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isJoinCandidate(session: SessionListItem) {
  return (
    session.sessionMode === "VIDEO" &&
    (session.status === "READY_TO_JOIN" || session.status === "IN_PROGRESS")
  );
}

function mapSessionTone(status: SessionStatus) {
  switch (status) {
    case "READY_TO_JOIN":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
    case "CONFIRMED":
    case "PENDING_PRACTITIONER_RESPONSE":
    case "PENDING_PAYMENT":
    case "DRAFT":
      return "warning" as const;
    case "NO_SHOW":
    case "CANCELLED":
    case "EXPIRED":
      return "error" as const;
    case "REFUND_PENDING":
      return "info" as const;
    default:
      return "default" as const;
  }
}

function buildJoinUrl(joinContract: SessionJoinContract | null) {
  if (!joinContract?.canJoin || !joinContract.roomUrl) {
    return null;
  }

  if (joinContract.joinToken && joinContract.provider === "DAILY") {
    return `${joinContract.roomUrl}${
      joinContract.roomUrl.includes("?") ? "&" : "?"
    }t=${encodeURIComponent(joinContract.joinToken)}`;
  }

  return joinContract.roomUrl;
}

const styles = StyleSheet.create({
  scaffoldContent: {
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  heroCard: {
    gap: 8,
  },
  overviewList: {
    gap: 4,
  },
  feedbackCard: {
    gap: 8,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionCards: {
    gap: 12,
  },
  sessionCard: {
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTextWrap: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  sessionCode: {
    fontSize: 12,
  },
  metaStack: {
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 22,
  },
  actionsBlock: {
    gap: 10,
  },
});
