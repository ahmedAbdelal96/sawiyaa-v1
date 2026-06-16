import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Linking,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
  formatDateTime,
} from "../../src/components/ui";
import {
  useInfinitePatientSessions,
  usePatientSessionSummary,
  useResolvePatientSessionJoinContract,
} from "../../src/features/patient/sessions/hooks";
import type {
  SessionJoinContract,
  SessionListItem,
  SessionPresentationStatus,
} from "../../src/features/patient/sessions/types";
import { getAppDirection } from "../../src/i18n/direction";
import { useTheme } from "../../src/providers/ThemeProvider";
import { extractApiErrorMessage } from "../../src/lib/api";
import { normalizeAllowedExternalUrl } from "../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../src/lib/analytics";

export default function PatientSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const joinMutation = useResolvePatientSessionJoinContract();
  const summaryQuery = usePatientSessionSummary();
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const direction = getAppDirection(i18n.language);
  const sessionsQuery = useInfinitePatientSessions({ limit: 20 });
  const sessions = useMemo(() => {
    const seen = new Set<string>();
    const flattened =
      sessionsQuery.data?.pages.flatMap((page) => page.items) ?? [];

    return flattened.filter((session) => {
      if (seen.has(session.id)) {
        return false;
      }

      seen.add(session.id);
      return true;
    });
  }, [sessionsQuery.data?.pages]);
  const sections = useMemo(() => buildWorkspaceSections(sessions), [sessions]);
  const overview = useMemo(
    () => summaryQuery.data ?? buildOverview(sessions),
    [summaryQuery.data, sessions],
  );
  const loadMoreGuardRef = useRef(false);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);

  const loadNextPage = useCallback(() => {
    if (!sessionsQuery.hasNextPage || sessionsQuery.isFetchingNextPage) {
      return;
    }

    if (loadMoreGuardRef.current) {
      return;
    }

    loadMoreGuardRef.current = true;
    void sessionsQuery.fetchNextPage().finally(() => {
      loadMoreGuardRef.current = false;
    });
  }, [
    sessionsQuery.fetchNextPage,
    sessionsQuery.hasNextPage,
    sessionsQuery.isFetchingNextPage,
  ]);

  const maybeLoadNextPage = useCallback(
    (contentOffsetY = 0) => {
      const distanceFromEnd =
        contentHeightRef.current -
        (layoutHeightRef.current + contentOffsetY);

      if (distanceFromEnd < 520) {
        loadNextPage();
      }
    },
    [loadNextPage],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      layoutHeightRef.current = event.nativeEvent.layout.height;
      maybeLoadNextPage();
    },
    [maybeLoadNextPage],
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeightRef.current = height;
      maybeLoadNextPage();
    },
    [maybeLoadNextPage],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      maybeLoadNextPage(event.nativeEvent.contentOffset.y);
    },
    [maybeLoadNextPage],
  );

  const handleViewDetails = (sessionId: string) => {
    router.push(`/(patient)/sessions/${sessionId}`);
  };

  const handleContinuePayment = (sessionId: string) => {
    router.push(`/(patient)/sessions/${sessionId}/pay`);
  };

  const handleJoinSession = async (session: SessionListItem) => {
    if (!isSessionJoinableNow(session)) {
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
        refreshControl={
          <RefreshControl
            refreshing={sessionsQuery.isRefetching}
            onRefresh={() => void sessionsQuery.refetch()}
          />
        }
        onScroll={handleScroll}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
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
            direction={direction}
            joiningSessionId={joiningSessionId}
            onJoin={handleJoinSession}
            onContinuePayment={handleContinuePayment}
            onViewDetails={handleViewDetails}
          />
              ))}
            </View>
          </View>
        ))}

        {renderSessionsFooter({
          hasNextPage: sessionsQuery.hasNextPage,
          isFetchingNextPage: sessionsQuery.isFetchingNextPage,
          isFetchNextPageError: sessionsQuery.isFetchNextPageError,
          onRetryNextPage: () => void sessionsQuery.fetchNextPage(),
          theme,
          t,
        })}
      </ScrollView>
    </ListPageScaffold>
  );
}

function renderSessionsFooter({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onRetryNextPage,
  theme,
  t,
}: {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onRetryNextPage: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (isFetchingNextPage) {
    return (
      <Card variant="flat" padding="md" style={styles.paginationCard}>
        <Text color={theme.colors.textSecondary}>
          {t("patientSessionsFlow.list.workspace.loadingMore")}
        </Text>
      </Card>
    );
  }

  if (isFetchNextPageError) {
    return (
      <Card variant="flat" padding="md" style={styles.paginationCard}>
        <Text weight="600" color={theme.colors.textPrimary}>
          {t("patientSessionsFlow.list.workspace.loadMoreErrorTitle")}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.paginationBody}>
          {t("patientSessionsFlow.list.workspace.loadMoreErrorSubtitle")}
        </Text>
        <View style={styles.paginationAction}>
          <Button
            title={t("patientSessionsFlow.common.retry")}
            onPress={onRetryNextPage}
            variant="secondary"
          />
        </View>
      </Card>
    );
  }

  if (hasNextPage === false) {
    return (
      <Card variant="flat" padding="md" style={styles.paginationCard}>
        <Text color={theme.colors.textSecondary}>
          {t("patientSessionsFlow.list.workspace.endOfList")}
        </Text>
      </Card>
    );
  }

  return null;
}

function SessionCard({
  session,
  locale,
  direction,
  joiningSessionId,
  onJoin,
  onContinuePayment,
  onViewDetails,
}: {
  session: SessionListItem;
  locale: string;
  direction: "rtl" | "ltr";
  joiningSessionId: string | null;
  onJoin: (session: SessionListItem) => void;
  onContinuePayment: (sessionId: string) => void;
  onViewDetails: (sessionId: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const tone = mapSessionPresentationTone(session.presentationStatus);
  const isJoinable = isSessionJoinableNow(session);
  const isJoining = joiningSessionId === session.id;
  const practitionerName =
    session.practitioner.displayName ??
    t("patientSessionsFlow.common.practitionerFallback");

  return (
    <Card
      variant="outlined"
      padding="lg"
      onPress={() => onViewDetails(session.id)}
      accessibilityRole="button"
      accessibilityLabel={t(
        "patientSessionsFlow.list.workspace.viewDetailsWithName",
        { name: practitionerName },
      )}
      style={styles.sessionCard}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardTextWrap}>
          <Text weight="600" style={styles.sessionTitle} color={theme.colors.textPrimary}>
            {practitionerName}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.sessionCode}>
            {session.sessionCode}
          </Text>
        </View>

        <StatusChip
          label={t(
            `patientSessionsFlow.presentationStatus.${session.presentationStatus}`,
          )}
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

        <View
          style={[
            styles.detailsRow,
            direction === "rtl" ? styles.detailsRowRtl : styles.detailsRowLtr,
          ]}
          accessible={false}
        >
          <Text color={theme.colors.textBrand} style={styles.detailsHint}>
            {t("patientSessionsFlow.list.workspace.viewDetails")}
          </Text>
          <Ionicons
            name={direction === "rtl" ? "chevron-back" : "chevron-forward"}
            size={16}
            color={theme.colors.primary}
          />
        </View>
      </View>
    </Card>
  );
}

function buildWorkspaceSections(sessions: SessionListItem[]) {
  const upcoming: SessionListItem[] = [];
  const active: SessionListItem[] = [];
  const recent: SessionListItem[] = [];

  for (const session of sessions) {
    if (session.presentationStatus === "JOINABLE" || session.presentationStatus === "IN_PROGRESS") {
      active.push(session);
      continue;
    }

    if (session.presentationStatus === "UPCOMING" || session.presentationStatus === "UNAVAILABLE") {
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
  const actionRequired = sessions.filter(
    (session) => session.presentationStatus === "JOINABLE",
  ).length;
  const active = sessions.filter(
    (session) =>
      session.presentationStatus === "JOINABLE" ||
      session.presentationStatus === "IN_PROGRESS",
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

function isSessionJoinableNow(session: SessionListItem) {
  return session.joinAvailability?.canJoin === true;
}

function mapSessionPresentationTone(status: SessionPresentationStatus) {
  switch (status) {
    case "JOINABLE":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
    case "UNAVAILABLE":
    case "UNDER_REVIEW":
      return "warning" as const;
    case "COMPLETED":
      return "default" as const;
    case "CANCELLED":
    case "ENDED":
    case "NO_SHOW":
      return "error" as const;
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
  detailsRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 2,
    minHeight: 44,
    paddingHorizontal: 2,
  },
  detailsRowLtr: {
    flexDirection: "row",
  },
  detailsRowRtl: {
    flexDirection: "row-reverse",
  },
  detailsHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  paginationCard: {
    alignItems: "center",
    gap: 8,
  },
  paginationBody: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },
  paginationAction: {
    width: "100%",
  },
});
