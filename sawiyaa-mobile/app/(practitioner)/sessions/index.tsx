import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  Text,
} from "../../../src/components/ui";
import {
  useInfinitePractitionerSessions,
  usePractitionerSessionSummary,
  usePreparePractitionerSessionRuntime,
  useResolvePractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/hooks";
import type {
  PractitionerSessionJoinContract,
  PractitionerSessionListItem,
  SessionPresentationFilter,
  SessionPresentationStatus,
} from "../../../src/features/practitioner/sessions/types";
import { getAppDirection } from "../../../src/i18n/direction";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { formatViewerDateTime } from "../../../src/lib/time-formatting";

type SessionFilterKey = "all" | "upcoming" | "ready" | "live" | "closed";

type SessionSummary = {
  upcoming: number;
  ready: number;
  live: number;
  closed: number;
};

function mapFilterKeyToPresentationFilter(
  filter: SessionFilterKey,
): SessionPresentationFilter | undefined {
  switch (filter) {
    case "upcoming":
      return "upcoming";
    case "ready":
      return "joinable";
    case "live":
      return "live";
    case "closed":
      return "finished";
    case "all":
    default:
      return undefined;
  }
}

export default function PractitionerSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] =
    useState<SessionFilterKey>("all");
  const loadMoreGuardRef = useRef(false);

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const direction = getAppDirection(i18n.language);
  const presentationFilter = mapFilterKeyToPresentationFilter(selectedFilter);
  const sessionsQuery = useInfinitePractitionerSessions({
    limit: 20,
    presentationFilter,
  });
  const summaryQuery = usePractitionerSessionSummary();
  const hasNextPage = sessionsQuery.hasNextPage;
  const isFetchingNextPage = sessionsQuery.isFetchingNextPage;
  const isFetchNextPageError = sessionsQuery.isFetchNextPageError;
  const fetchNextPage = sessionsQuery.fetchNextPage;

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

  const summary = useMemo(() => {
    return summaryQuery.data ?? buildSessionSummary(sessions);
  }, [summaryQuery.data, sessions]);

  const sortedSessions = useMemo(
    () => sortSessionsByStartTime(sessions, "desc"),
    [sessions],
  );

  const prioritySession = useMemo(
    () => pickPrioritySession(sortedSessions),
    [sortedSessions],
  );

  const listSessions = useMemo(
    () =>
      prioritySession
        ? sortedSessions.filter((session) => session.id !== prioritySession.id)
        : sortedSessions,
    [prioritySession, sortedSessions],
  );

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: t("practitioner.sessions.filters.all") },
      {
        key: "upcoming" as const,
        label: t("practitioner.sessions.filters.upcoming"),
      },
      { key: "ready" as const, label: t("practitioner.sessions.filters.ready") },
      { key: "live" as const, label: t("practitioner.sessions.filters.live") },
      { key: "closed" as const, label: t("practitioner.sessions.filters.closed") },
    ],
    [t],
  );

  const loadNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    if (loadMoreGuardRef.current) {
      return;
    }

    loadMoreGuardRef.current = true;
    void fetchNextPage().finally(() => {
      loadMoreGuardRef.current = false;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleViewDetails = useCallback(
    (sessionId: string) => {
      router.push(`/(practitioner)/sessions/${sessionId}`);
    },
    [router],
  );

  const handleJoinSession = useCallback(
    async (session: PractitionerSessionListItem) => {
      if (!isSessionJoinableNow(session)) {
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
            setFeedback(t("practitioner.detail.joinError"));
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
          t("practitioner.detail.joinBlocked", {
            reason: t(
              `practitioner.detail.blocked.${
                contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"
              }` as const,
            ),
          }),
        );
      } catch {
        setFeedback(t("practitioner.detail.joinError"));
      } finally {
        setJoiningSessionId(null);
      }
    },
    [handleViewDetails, joinMutation, prepareMutation, t],
  );

  const listEmpty =
    !sessionsQuery.isLoading &&
    !sessionsQuery.isError &&
    sessions.length > 0 &&
    listSessions.length === 0;

  const headerNode = (
    <View style={styles.headerStack}>
      <Card variant="outlined" padding="md" style={styles.introCard}>
        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text
              weight="600"
              style={styles.introTitle}
              color={theme.colors.textPrimary}
            >
              {t("practitioner.sessions.workspace.subtitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.introBody}>
              {t("practitioner.sessions.workspace.listSubtitle")}
            </Text>
          </View>

          <View
            style={[
              styles.introIconWrap,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.primary + "22",
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme.colors.primary}
            />
          </View>
        </View>
      </Card>

        <View style={styles.summaryGrid}>
        <SessionMetricCard
          label={t("practitioner.sessions.filters.upcoming")}
          value={summary.upcoming}
          helper={t("practitioner.sessions.workspace.sections.upcomingSubtitle")}
        />
        <SessionMetricCard
          label={t("practitioner.sessions.filters.ready")}
          value={summary.ready}
          helper={t("practitioner.sessions.workspace.sections.activeSubtitle")}
        />
        <SessionMetricCard
          label={t("practitioner.sessions.filters.live")}
          value={summary.live}
          helper={t("practitioner.sessions.workspace.sections.activeSubtitle")}
        />
        <SessionMetricCard
          label={t("practitioner.sessions.filters.closed")}
          value={summary.closed}
          helper={t("practitioner.sessions.workspace.sections.recentSubtitle")}
        />
      </View>

      <View style={styles.filterToolbar}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => (
            <FilterChip
              label={item.label}
              selected={selectedFilter === item.key}
              onPress={() => setSelectedFilter(item.key)}
            />
          )}
        />
      </View>

      {feedback ? (
        <Card variant="flat" padding="md" style={styles.feedbackCard}>
          <Text color={theme.colors.textSecondary}>{feedback}</Text>
        </Card>
      ) : null}

      {prioritySession ? (
        <PrioritySessionCard
          session={prioritySession}
          locale={locale}
          direction={direction}
          theme={theme}
          t={t}
          joiningSessionId={joiningSessionId}
          onJoin={handleJoinSession}
          onViewDetails={handleViewDetails}
        />
      ) : null}

      <SectionHeader
        title={t("practitioner.sessions.workspace.listTitle")}
        subtitle={t("practitioner.sessions.workspace.listSubtitle")}
      />
    </View>
  );

  return (
    <ListPageScaffold
      title={t("practitioner.sessions.workspace.title")}
      loading={sessionsQuery.isLoading}
      error={sessionsQuery.isError}
      errorTitle={t("practitioner.sessions.workspace.title")}
      errorMessage={t("practitioner.common.loadError")}
      onRetry={() => void sessionsQuery.refetch()}
      retryText={t("practitioner.sessions.workspace.retry")}
      contentContainerStyle={styles.scaffoldContent}
      empty={
        !sessionsQuery.isLoading && !sessionsQuery.isError && sessions.length === 0
      }
      emptyTitle={t("practitioner.sessions.emptyTitle")}
      emptyDescription={t("practitioner.sessions.emptyBody")}
    >
      <FlatList
        data={listSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionWorkspaceCard
            session={item}
            locale={locale}
            direction={direction}
            theme={theme}
            t={t}
            joiningSessionId={joiningSessionId}
            onJoin={handleJoinSession}
            onViewDetails={handleViewDetails}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListHeaderComponent={headerNode}
        ListEmptyComponent={
          listEmpty && !prioritySession ? (
            <EmptyState
              title={t("practitioner.sessions.workspace.emptyFilteredTitle")}
              description={t("practitioner.sessions.workspace.emptyFilteredBody")}
              actionLabel={t("practitioner.sessions.workspace.emptyFilteredAction")}
              onAction={() => setSelectedFilter("all")}
              icon={
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={theme.colors.textMuted}
                />
              }
            />
          ) : null
        }
        ListFooterComponent={renderSessionsFooter({
          hasNextPage,
          isFetchingNextPage,
          isFetchNextPageError,
          onRetryNextPage: loadNextPage,
          theme,
          t,
        })}
        refreshControl={
          <RefreshControl
            refreshing={sessionsQuery.isRefetching}
            onRefresh={() => void sessionsQuery.refetch()}
          />
        }
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
      />
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
      <Card variant="flat" padding="md" style={styles.footerCard}>
        <Text color={theme.colors.textSecondary}>
          {t("practitioner.sessions.workspace.loadingMore")}
        </Text>
      </Card>
    );
  }

  if (isFetchNextPageError) {
    return (
      <Card variant="flat" padding="md" style={styles.footerCard}>
        <Text weight="600" color={theme.colors.textPrimary}>
          {t("practitioner.sessions.workspace.loadMoreErrorTitle")}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.footerBody}>
          {t("practitioner.sessions.workspace.loadMoreErrorSubtitle")}
        </Text>
        <View style={styles.footerAction}>
          <Button
            title={t("practitioner.sessions.workspace.retry")}
            onPress={onRetryNextPage}
            variant="secondary"
          />
        </View>
      </Card>
    );
  }

  if (hasNextPage === false) {
    return (
      <Card variant="flat" padding="md" style={styles.footerCard}>
        <Text color={theme.colors.textSecondary}>
          {t("practitioner.sessions.workspace.endOfList")}
        </Text>
      </Card>
    );
  }

  return <View style={styles.footerSpacer} />;
}

function SessionWorkspaceCard({
  session,
  locale,
  direction,
  t,
  theme,
  joiningSessionId,
  onJoin,
  onViewDetails,
}: {
  session: PractitionerSessionListItem;
  locale: string;
  direction: "rtl" | "ltr";
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: ReturnType<typeof useTheme>["theme"];
  joiningSessionId: string | null;
  onJoin: (session: PractitionerSessionListItem) => void;
  onViewDetails: (sessionId: string) => void;
}) {
  const statusTone = mapSessionPresentationTone(session.presentationStatus);
  const isJoinable = isSessionJoinableNow(session);
  const isJoining = joiningSessionId === session.id;
  const patientName =
    session.patient?.displayName ?? t("practitioner.sessions.unknownPatient");

  return (
    <Card
      variant="outlined"
      padding="md"
      onPress={() => onViewDetails(session.id)}
      accessibilityRole="button"
      accessibilityLabel={t(
        "practitioner.sessions.workspace.viewDetailsWithName",
        { name: patientName },
      )}
      style={styles.sessionCard}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardTextWrap}>
          <Text
            weight="700"
            style={styles.patientName}
            color={theme.colors.textPrimary}
            numberOfLines={1}
          >
            {patientName}
          </Text>

          <Text color={theme.colors.textMuted} style={styles.sessionCode}>
            {t("practitioner.sessions.workspace.sessionCodeLabel")}:{" "}
            {session.sessionCode}
          </Text>
        </View>

        <StatusChip
          label={t(
            `practitioner.presentationStatus.${session.presentationStatus}`,
          )}
          tone={statusTone}
        />
      </View>

      <View style={styles.metaStack}>
        <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {session.scheduledStartAt
            ? formatViewerDateTime(session.scheduledStartAt, {
                locale,
                fallbackText: "-",
              })
            : t("practitioner.sessions.noSchedule")}
        </Text>

        <View style={styles.metaInlineRow}>
          <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
            {t("practitioner.sessions.duration", {
              minutes: session.durationMinutes,
            })}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.metaDot}>
            •
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
            {t(`practitioner.detail.modeValue.${session.sessionMode}`)}
          </Text>
        </View>
      </View>

      <View style={styles.actionsBlock}>
        {isJoinable ? (
          <Button
            title={
              isJoining
                ? t("practitioner.detail.joining")
                : t("practitioner.detail.join")
            }
            onPress={() => void onJoin(session)}
            disabled={isJoining}
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
            {t("practitioner.sessions.workspace.viewDetails")}
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

function PrioritySessionCard({
  session,
  locale,
  direction,
  t,
  theme,
  joiningSessionId,
  onJoin,
  onViewDetails,
}: {
  session: PractitionerSessionListItem;
  locale: string;
  direction: "rtl" | "ltr";
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: ReturnType<typeof useTheme>["theme"];
  joiningSessionId: string | null;
  onJoin: (session: PractitionerSessionListItem) => void;
  onViewDetails: (sessionId: string) => void;
}) {
  const isJoinable = isSessionJoinableNow(session);
  const isJoining = joiningSessionId === session.id;
  const patientName =
    session.patient?.displayName ?? t("practitioner.sessions.unknownPatient");

  return (
    <View style={styles.priorityWrap}>
      <Card
        variant="outlined"
        padding="md"
        onPress={() => onViewDetails(session.id)}
        accessibilityRole="button"
        accessibilityLabel={t(
          "practitioner.sessions.workspace.viewDetailsWithName",
          { name: patientName },
        )}
        style={[
          styles.priorityCard,
          {
            backgroundColor: theme.colors.primaryLight + "26",
            borderColor: theme.colors.primary + "24",
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardTextWrap}>
            <View style={styles.priorityTitleRow}>
              <Ionicons
                name={isJoinable ? "flash-outline" : "alert-circle-outline"}
                size={15}
                color={theme.colors.primary}
              />
              <Text
                weight="700"
                style={styles.priorityLabel}
                color={theme.colors.primary}
              >
                {t("practitioner.sessions.workspace.priorityHeading")}
              </Text>
            </View>

            <Text
              weight="700"
              style={styles.patientName}
              color={theme.colors.textPrimary}
              numberOfLines={1}
            >
              {patientName}
            </Text>

            <Text color={theme.colors.textMuted} style={styles.sessionCode}>
              {t("practitioner.sessions.workspace.sessionCodeLabel")}:{" "}
              {session.sessionCode}
            </Text>
          </View>

          <StatusChip
            label={t(
              `practitioner.presentationStatus.${session.presentationStatus}`,
            )}
            tone={mapSessionPresentationTone(session.presentationStatus)}
          />
        </View>

        <View style={styles.metaStack}>
          <Text color={theme.colors.textSecondary} style={styles.metaText}>
          {session.scheduledStartAt
            ? formatViewerDateTime(session.scheduledStartAt, {
                locale,
                fallbackText: "-",
              })
            : t("practitioner.sessions.noSchedule")}
        </Text>
          <View style={styles.metaInlineRow}>
            <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
              {t("practitioner.sessions.duration", {
                minutes: session.durationMinutes,
              })}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.metaDot}>
              •
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
              {t(`practitioner.detail.modeValue.${session.sessionMode}`)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsBlock}>
          {isJoinable ? (
            <Button
              title={
                isJoining
                  ? t("practitioner.detail.joining")
                  : t("practitioner.detail.join")
              }
              onPress={() => void onJoin(session)}
              disabled={isJoining}
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
            {t("practitioner.sessions.workspace.viewDetails")}
          </Text>
          <Ionicons
            name={direction === "rtl" ? "chevron-back" : "chevron-forward"}
            size={16}
            color={theme.colors.primary}
          />
        </View>
        </View>
      </Card>
    </View>
  );
}

function SessionMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  const { theme } = useTheme();

  return (
    <Card
      variant="outlined"
      padding="sm"
      style={[
        styles.metricCard,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <Text weight="700" style={styles.metricValue} color={theme.colors.textPrimary}>
        {value}
      </Text>
      <Text weight="600" style={styles.metricLabel} color={theme.colors.textPrimary}>
        {label}
      </Text>
      <Text color={theme.colors.textMuted} style={styles.metricHelper} numberOfLines={2}>
        {helper}
      </Text>
    </Card>
  );
}

function buildSessionSummary(sessions: PractitionerSessionListItem[]): SessionSummary {
  return {
    upcoming: sessions.filter((session) =>
      ["UPCOMING", "UNAVAILABLE"].includes(session.presentationStatus),
    ).length,
    ready: sessions.filter((session) => session.presentationStatus === "JOINABLE").length,
    live: sessions.filter((session) => session.presentationStatus === "IN_PROGRESS").length,
    closed: sessions.filter((session) =>
      ["COMPLETED", "CANCELLED", "ENDED", "NO_SHOW", "UNDER_REVIEW"].includes(session.presentationStatus),
    ).length,
  };
}

function pickPrioritySession(sessions: PractitionerSessionListItem[]) {
  return (
    sessions.find((session) => isSessionJoinableNow(session)) ??
    sessions.find((session) => session.presentationStatus === "IN_PROGRESS") ??
    sessions.find((session) =>
      ["UPCOMING", "UNAVAILABLE"].includes(session.presentationStatus),
    ) ??
    null
  );
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

function isSessionJoinableNow(session: PractitionerSessionListItem) {
  return session.joinAvailability?.canJoin === true;
}

function canAttemptPrepare(session: PractitionerSessionListItem) {
  return (
    session.sessionMode === "VIDEO" &&
    ["CONFIRMED", "UPCOMING", "READY_TO_JOIN"].includes(session.status)
  );
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
    case "ENDED":
    case "CANCELLED":
    case "NO_SHOW":
      return "error" as const;
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
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  itemSeparator: {
    height: 12,
  },
  headerStack: {
    gap: 12,
    marginBottom: 4,
  },
  introCard: {
    gap: 0,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  introCopy: {
    flex: 1,
    gap: 4,
  },
  introTitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  introBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  introIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    minHeight: 92,
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricHelper: {
    fontSize: 11,
    lineHeight: 16,
  },
  filterToolbar: {
    flexDirection: "row",
    alignItems: "center",
  },
  filtersContent: {
    gap: 8,
    paddingVertical: 2,
  },
  feedbackCard: {
    gap: 8,
  },
  priorityWrap: {
    gap: 8,
  },
  priorityCard: {
    gap: 12,
  },
  priorityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priorityLabel: {
    fontSize: 12,
    lineHeight: 16,
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
    gap: 4,
  },
  patientName: {
    fontSize: 16,
    lineHeight: 22,
  },
  sessionCode: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaStack: {
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 22,
  },
  metaInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaTiny: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaDot: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionsBlock: {
    gap: 8,
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
  footerCard: {
    alignItems: "center",
    gap: 8,
  },
  footerBody: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },
  footerAction: {
    width: "100%",
  },
  footerSpacer: {
    height: 8,
  },
});
