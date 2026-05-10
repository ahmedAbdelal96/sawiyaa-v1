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
  Text,
  formatDateTime,
} from "../../../src/components/ui";
import {
  usePreparePractitionerSessionRuntime,
  usePractitionerSessions,
  useResolvePractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/hooks";
import type {
  PractitionerSessionJoinContract,
  PractitionerSessionListItem,
  SessionStatus,
} from "../../../src/features/practitioner/sessions/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";

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

const PREPARE_ELIGIBLE_STATUSES: SessionStatus[] = [
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
];

export default function PractitionerSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const sessionsQuery = usePractitionerSessions({ limit: 50 });
  const sessions = sessionsQuery.data?.items ?? [];
  const sections = useMemo(
    () => buildWorkspaceSections(sessions),
    [sessions],
  );

  const handleViewDetails = (sessionId: string) => {
    router.push(`/(practitioner)/sessions/${sessionId}`);
  };

  const handleJoinSession = async (session: PractitionerSessionListItem) => {
    if (!isDirectJoinCandidate(session)) {
      handleViewDetails(session.id);
      return;
    }

    setJoiningSessionId(session.id);
    setFeedback(null);

    try {
      let contract = (await joinMutation.mutateAsync(session.id)).item;

      if (
        !contract.canJoin &&
        contract.blockedReason === "SESSION_RUNTIME_NOT_PREPARED" &&
        canAttemptPrepare(session)
      ) {
        await prepareMutation.mutateAsync(session.id);
        contract = (await joinMutation.mutateAsync(session.id)).item;
      }

      const joinUrl = buildJoinUrl(contract);
      if (joinUrl) {
        const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
        if (!safeJoinUrl) {
          setFeedback(t("practitioner.sessionDetail.joinError"));
          return;
        }

        await Linking.openURL(safeJoinUrl);
        trackAnalyticsEvent("session_joined", {
          role: "practitioner",
          sessionId: session.id,
          sessionStatus: session.status,
          provider: contract.provider,
          source: "sessions_workspace",
        });
        return;
      }

      setFeedback(
        t("practitioner.sessionDetail.joinBlocked", {
          reason: t(
            `practitioner.sessionDetail.blocked.${
              contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"
            }` as const,
          ),
        }),
      );
    } catch {
      setFeedback(t("practitioner.sessionDetail.joinError"));
    } finally {
      setJoiningSessionId(null);
    }
  };

  return (
    <ListPageScaffold
      title={t("practitioner.sessions.workspace.title")}
      loading={sessionsQuery.isLoading}
      error={sessionsQuery.isError}
      errorTitle={t("practitioner.sessions.workspace.title")}
      errorMessage={t("practitioner.common.loadError")}
      onRetry={() => void sessionsQuery.refetch()}
      contentContainerStyle={styles.scaffoldContent}
      empty={!sessionsQuery.isLoading && !sessionsQuery.isError && sessions.length === 0}
      emptyTitle={t("practitioner.sessions.emptyTitle")}
      emptyDescription={t("practitioner.sessions.emptyBody")}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="flat" padding="lg" style={styles.heroCard}>
          <Text color={theme.colors.textSecondary} style={styles.heroBody}>
            {t("practitioner.sessions.workspace.subtitle")}
          </Text>
        </Card>

        {feedback ? (
          <Card variant="flat" padding="md" style={styles.feedbackCard}>
            <Text color={theme.colors.textSecondary}>{feedback}</Text>
          </Card>
        ) : null}

        {sections.map((section) =>
          section.items.length ? (
            <View key={section.key} style={styles.sectionBlock}>
              <SectionHeader
                title={t(section.titleKey)}
                subtitle={t(section.subtitleKey)}
              />

              <View style={styles.sectionCards}>
                {section.items.map((session) => (
                  <SessionWorkspaceCard
                    key={session.id}
                    session={session}
                    locale={locale}
                    t={t}
                    theme={theme}
                    joiningSessionId={joiningSessionId}
                    onJoin={handleJoinSession}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </View>
            </View>
          ) : null,
        )}
      </ScrollView>
    </ListPageScaffold>
  );
}

function SessionWorkspaceCard({
  session,
  locale,
  t,
  theme,
  joiningSessionId,
  onJoin,
  onViewDetails,
}: {
  session: PractitionerSessionListItem;
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: ReturnType<typeof useTheme>["theme"];
  joiningSessionId: string | null;
  onJoin: (session: PractitionerSessionListItem) => void;
  onViewDetails: (sessionId: string) => void;
}) {
  const statusTone = mapSessionStatusTone(session.status);
  const isJoinable = isDirectJoinCandidate(session);
  const isJoining = joiningSessionId === session.id;

  return (
    <Card variant="outlined" padding="lg" style={styles.sessionCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTextWrap}>
          <Text weight="600" style={styles.patientName} color={theme.colors.textPrimary}>
            {session.patient?.displayName ?? t("practitioner.sessions.unknownPatient")}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.sessionCode}>
            {session.sessionCode}
          </Text>
        </View>

        <StatusChip
          label={t(`practitioner.sessionStatus.${session.status}`)}
          tone={statusTone}
        />
      </View>

      <View style={styles.metaStack}>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {session.scheduledStartAt
            ? formatDateTime(session.scheduledStartAt, locale)
            : t("practitioner.sessions.noSchedule")}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {t("practitioner.sessions.duration", {
            minutes: session.durationMinutes,
          })}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {t("practitioner.sessionDetail.mode")}{" "}
          {t(`practitioner.sessionDetail.modeValue.${session.sessionMode}`)}
        </Text>
      </View>

      <View style={styles.actionsBlock}>
        {isJoinable ? (
          <Button
            title={
              isJoining
                ? t("practitioner.sessionDetail.joining")
                : t("practitioner.sessionDetail.join")
            }
            onPress={() => void onJoin(session)}
            disabled={isJoining}
          />
        ) : null}

        <CompactActionRow
          label={t("practitioner.sessions.workspace.viewDetails")}
          onPress={() => onViewDetails(session.id)}
          accessibilityLabel={t("practitioner.sessions.workspace.viewDetails")}
        />
      </View>
    </Card>
  );
}

function buildWorkspaceSections(
  sessions: PractitionerSessionListItem[],
) {
  const upcoming: PractitionerSessionListItem[] = [];
  const active: PractitionerSessionListItem[] = [];
  const recent: PractitionerSessionListItem[] = [];

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
      titleKey: "practitioner.sessions.workspace.sections.upcoming",
      subtitleKey: "practitioner.sessions.workspace.sections.upcomingSubtitle",
      items: sortSessionsByStartTime(upcoming, "asc"),
    },
    {
      key: "active",
      titleKey: "practitioner.sessions.workspace.sections.active",
      subtitleKey: "practitioner.sessions.workspace.sections.activeSubtitle",
      items: sortSessionsByStartTime(active, "asc"),
    },
    {
      key: "recent",
      titleKey: "practitioner.sessions.workspace.sections.recent",
      subtitleKey: "practitioner.sessions.workspace.sections.recentSubtitle",
      items: sortSessionsByStartTime(recent, "desc"),
    },
  ].filter((section) => section.items.length > 0);
}

function sortSessionsByStartTime(
  sessions: PractitionerSessionListItem[],
  direction: "asc" | "desc",
) {
  return [...sessions].sort((left, right) => {
    const leftTimestamp = getSessionSortTimestamp(left);
    const rightTimestamp = getSessionSortTimestamp(right);

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

function getSessionSortTimestamp(session: PractitionerSessionListItem) {
  const rawDate = session.scheduledStartAt ?? session.scheduledEndAt;
  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isDirectJoinCandidate(session: PractitionerSessionListItem) {
  return (
    session.sessionMode === "VIDEO" &&
    (session.status === "READY_TO_JOIN" || session.status === "IN_PROGRESS")
  );
}

function canAttemptPrepare(session: PractitionerSessionListItem) {
  return (
    session.sessionMode === "VIDEO" &&
    PREPARE_ELIGIBLE_STATUSES.includes(session.status)
  );
}

function mapSessionStatusTone(status: SessionStatus) {
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

function buildJoinUrl(joinContract: PractitionerSessionJoinContract | null) {
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
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  heroCard: {
    gap: 8,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
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
  patientName: {
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
