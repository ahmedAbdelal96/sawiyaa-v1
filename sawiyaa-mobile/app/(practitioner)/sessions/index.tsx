import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  StatusChip,
  Text,
  LoadingState,
  ErrorState,
  Screen,
} from "../../../src/components/ui";
import {
  useInfinitePractitionerSessions,
  usePractitionerSessionSummary,
  usePreparePractitionerSessionRuntime,
  useResolvePractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/hooks";
import { useGeneralChatUnreadSummary } from "../../../src/features/messages/hooks";
import { usePractitionerUnreadNotificationCount } from "../../../src/features/practitioner/notifications/hooks";
import type {
  PractitionerSessionJoinContract,
  PractitionerSessionListItem,
  SessionPresentationFilter,
  SessionPresentationStatus,
} from "../../../src/features/practitioner/sessions/types";
import { getAppDirection } from "../../../src/i18n/direction";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAuth } from "../../../src/providers/AuthProvider";
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
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();

  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] =
    useState<SessionFilterKey>("all");
  const loadMoreGuardRef = useRef(false);

  // Unread badge queries
  const unreadCountQuery = usePractitionerUnreadNotificationCount({
    enabled: !!user,
  });
  const messagesSummaryQuery = useGeneralChatUnreadSummary("practitioner");
  const unreadMessages = messagesSummaryQuery.data?.item?.totalUnreadMessages ?? 0;
  const unreadNotifications = unreadCountQuery.data?.item?.unreadCount ?? 0;

  const isArabic = i18n.language?.startsWith("ar");
  const textAlign = isArabic ? "right" : "left";
  const rowDirection = isArabic ? "row-reverse" : "row";

  const locale = isArabic ? "ar-EG" : "en-US";
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

  const getFilterCount = (key: SessionFilterKey) => {
    switch (key) {
      case "upcoming":
        return summary.upcoming;
      case "ready":
        return summary.ready;
      case "live":
        return summary.live;
      case "closed":
        return summary.closed;
      case "all":
      default:
        return sessions.length;
    }
  };

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

  const renderCustomHeader = () => (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.colors.surfaceRaised,
          paddingTop: insets.top + 8,
          borderBottomColor: theme.colors.borderLight,
          ...theme.shadows.sm,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={[styles.headerTopBar, { flexDirection: rowDirection }]}>
        {/* Logo */}
        <View style={styles.headerLogoGroup}>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Action icons group: messages, notifications, logout */}
        <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
          {/* Messages Quick Button */}
          <TouchableOpacity
            onPress={() => router.push("/(practitioner)/messages")}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
            activeOpacity={0.82}
            accessibilityLabel="app-header-messages-button"
          >
            <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
            {unreadMessages > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: theme.colors.error }]}>
                <Text weight="700" style={[styles.unreadBadgeText, { color: theme.colors.onError }]}>
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Notifications Quick Button */}
          <TouchableOpacity
            onPress={() => router.push("/(practitioner)/notifications")}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
            activeOpacity={0.82}
            accessibilityLabel="app-header-notifications-button"
          >
            <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
            {unreadNotifications > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: theme.colors.error }]}>
                <Text weight="700" style={[styles.unreadBadgeText, { color: theme.colors.onError }]}>
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={signOut}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
            activeOpacity={0.82}
            accessibilityLabel="logout-button"
          >
            <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const listEmpty =
    !sessionsQuery.isLoading &&
    !sessionsQuery.isError &&
    sessions.length > 0 &&
    listSessions.length === 0;

  if (sessionsQuery.isLoading) {
    return (
      <Screen safeArea={false} bg="background">
        {renderCustomHeader()}
        <LoadingState message={t("practitioner.sessions.workspace.loading", "Loading sessions...")} fullScreen={false} />
      </Screen>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <Screen safeArea={false} bg="background">
        {renderCustomHeader()}
        <ErrorState
          title={t("practitioner.sessions.workspace.title", "Sessions")}
          message={t("practitioner.common.loadError")}
          onRetry={() => void sessionsQuery.refetch()}
          retryText={t("practitioner.sessions.workspace.retry")}
          fullScreen={false}
        />
      </Screen>
    );
  }

  if (sessions.length === 0) {
    return (
      <Screen safeArea={false} bg="background">
        {renderCustomHeader()}
        <View style={styles.emptyContainer}>
          <EmptyState
            title={t("practitioner.sessions.emptyTitle", { defaultValue: isArabic ? "لا توجد جلسات مجدولة" : "No sessions scheduled" })}
            description={t("practitioner.sessions.emptyBody", { defaultValue: isArabic ? "ليس لديك أي جلسات بعد. قم بتعديل جدول التوفر الخاص بك لاستقبال الحجوزات." : "You do not have any sessions yet. Manage your availability to receive bookings." })}
            actionLabel={t("practitioner.sessions.workspace.emptyAction", { defaultValue: isArabic ? "تعديل جدول التوفر" : "Manage availability" })}
            onAction={() => router.push("/(practitioner)/availability")}
            icon={
              <Ionicons
                name="calendar-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            }
          />
        </View>
      </Screen>
    );
  }

  const headerNode = (
    <View style={styles.headerStack}>
      {/* Page Title & Scroll Greeting Row */}
      <View style={styles.paddedHeaderSection}>
        <View style={styles.titleWrapper}>
          <Text weight="700" style={[styles.mainScrollTitle, { textAlign }]}>
            {t("practitioner.sessions.workspace.titleShort", isArabic ? "الجلسات" : "Sessions")}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.mainScrollSubtitle, { textAlign }]}>
            {t("practitioner.sessions.workspace.listSubtitle")}
          </Text>
        </View>
      </View>

      {/* Filter Toolbar Chip Row */}
      <View style={styles.filterToolbar}>
        {filterOptions.map((item) => (
          <FilterChip
            key={item.key}
            label={`${item.label} (${getFilterCount(item.key)})`}
            selected={selectedFilter === item.key}
            onPress={() => setSelectedFilter(item.key)}
          />
        ))}
      </View>

      {feedback ? (
        <View style={styles.paddedHeaderSection}>
          <Card variant="flat" padding="md" style={styles.feedbackCard}>
            <Text color={theme.colors.textSecondary}>{feedback}</Text>
          </Card>
        </View>
      ) : null}

      {prioritySession ? (
        <View style={styles.paddedHeaderSection}>
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
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen safeArea={false} bg="background" style={styles.screenContainer}>
      {renderCustomHeader()}
      <FlatList
        data={listSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardPadding}>
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
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListHeaderComponent={headerNode}
        ListEmptyComponent={
          listEmpty && !prioritySession ? (
            <View style={styles.cardPadding}>
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
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.cardPadding}>
            {renderSessionsFooter({
              hasNextPage,
              isFetchingNextPage,
              isFetchNextPageError,
              onRetryNextPage: loadNextPage,
              theme,
              t,
            })}
          </View>
        }
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
    </Screen>
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
  const rowDirection = direction === "rtl" ? "row-reverse" : "row";
  const textAlign = direction === "rtl" ? "right" : "left";
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
      <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
        <View style={styles.patientInfoGroup}>
          <View style={[styles.patientNameBadgeRow, { flexDirection: rowDirection }]}>
            <Text
              weight="700"
              style={styles.patientName}
              color={theme.colors.textPrimary}
              numberOfLines={1}
            >
              {patientName}
            </Text>
            <StatusChip
              label={t(`practitioner.presentationStatus.${session.presentationStatus}`)}
              tone={statusTone}
            />
          </View>
          <Text color={theme.colors.textMuted} style={[styles.sessionCode, { textAlign }]}>
            {session.sessionCode}
          </Text>
        </View>

        <Ionicons
          name={direction === "rtl" ? "chevron-back" : "chevron-forward"}
          size={16}
          color={theme.colors.textMuted}
          style={styles.cardChevron}
        />
      </View>

      {/* Meta Row: Calendar date, Mode, Duration */}
      <View style={[styles.cardMetaRow, { flexDirection: rowDirection }]}>
        <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
          <Text color={theme.colors.textSecondary} style={styles.metaTextValue}>
            {session.scheduledStartAt
              ? formatViewerDateTime(session.scheduledStartAt, {
                  locale,
                  fallbackText: "-",
                })
              : t("practitioner.sessions.noSchedule")}
          </Text>
        </View>

        <View style={[styles.metaInlineRow, { flexDirection: rowDirection }]}>
          <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
              {t("practitioner.sessions.duration", {
                minutes: session.durationMinutes,
              })}
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
              {t(`practitioner.detail.modeValue.${session.sessionMode}`)}
            </Text>
          </View>
        </View>
      </View>

      {isJoinable ? (
        <View style={styles.joinActionWrapper}>
          <Button
            title={
              isJoining
                ? t("practitioner.detail.joining")
                : t("practitioner.detail.join")
            }
            onPress={() => void onJoin(session)}
            disabled={isJoining}
            style={styles.joinButton}
          />
        </View>
      ) : null}
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
  const rowDirection = direction === "rtl" ? "row-reverse" : "row";
  const textAlign = direction === "rtl" ? "right" : "left";
  const isJoinable = isSessionJoinableNow(session);
  const isJoining = joiningSessionId === session.id;
  const patientName =
    session.patient?.displayName ?? t("practitioner.sessions.unknownPatient");
  const statusTone = mapSessionPresentationTone(session.presentationStatus);

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
            backgroundColor: theme.colors.primaryLight + "15",
            borderColor: theme.colors.primary + "30",
          },
        ]}
      >
        <View style={[styles.priorityHeader, { flexDirection: rowDirection }]}>
          <View style={[styles.priorityIndicator, { flexDirection: rowDirection }]}>
            <Ionicons
              name={isJoinable ? "flash" : "time"}
              size={14}
              color={theme.colors.primary}
            />
            <Text weight="700" style={styles.priorityLabel} color={theme.colors.primary}>
              {isJoinable
                ? t("practitioner.sessions.workspace.priorityHeading", { defaultValue: direction === "rtl" ? "جلسة نشطة الآن" : "Live Session Now" })
                : t("practitioner.sessions.workspace.nextSession", { defaultValue: direction === "rtl" ? "الجلسة التالية" : "Next Session" })}
            </Text>
          </View>
        </View>

        <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
          <View style={styles.patientInfoGroup}>
            <View style={[styles.patientNameBadgeRow, { flexDirection: rowDirection }]}>
              <Text
                weight="700"
                style={styles.patientName}
                color={theme.colors.textPrimary}
                numberOfLines={1}
              >
                {patientName}
              </Text>
              <StatusChip
                label={t(`practitioner.presentationStatus.${session.presentationStatus}`)}
                tone={statusTone}
              />
            </View>
            <Text color={theme.colors.textMuted} style={[styles.sessionCode, { textAlign }]}>
              {session.sessionCode}
            </Text>
          </View>

          <Ionicons
            name={direction === "rtl" ? "chevron-back" : "chevron-forward"}
            size={16}
            color={theme.colors.primary}
            style={styles.cardChevron}
          />
        </View>

        <View style={[styles.cardMetaRow, { flexDirection: rowDirection }]}>
          <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
            <Text color={theme.colors.textSecondary} style={styles.metaTextValue}>
              {session.scheduledStartAt
                ? formatViewerDateTime(session.scheduledStartAt, {
                    locale,
                    fallbackText: "-",
                  })
                : t("practitioner.sessions.noSchedule")}
            </Text>
          </View>

          <View style={[styles.metaInlineRow, { flexDirection: rowDirection }]}>
            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
                {t("practitioner.sessions.duration", {
                  minutes: session.durationMinutes,
                })}
              </Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
                {t(`practitioner.detail.modeValue.${session.sessionMode}`)}
              </Text>
            </View>
          </View>
        </View>

        {isJoinable ? (
          <View style={styles.joinActionWrapper}>
            <Button
              title={
                isJoining
                  ? t("practitioner.detail.joining")
                  : t("practitioner.detail.join")
              }
              onPress={() => void onJoin(session)}
              disabled={isJoining}
              style={styles.joinButton}
            />
          </View>
        ) : null}
      </Card>
    </View>
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
  headerContainer: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerTopBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogoGroup: {
    justifyContent: "center",
  },
  brandLogo: {
    width: 90,
    height: 28,
  },
  headerActions: {
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    fontSize: 8,
    lineHeight: 10,
  },
  screenContainer: {
    paddingHorizontal: 0,
  },
  cardPadding: {
    paddingHorizontal: 16,
  },
  paddedHeaderSection: {
    paddingHorizontal: 16,
  },
  scaffoldContent: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  itemSeparator: {
    height: 12,
  },
  headerStack: {
    gap: 16,
    marginBottom: 16,
  },
  titleWrapper: {
    paddingVertical: 4,
    gap: 2,
  },
  mainScrollTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  mainScrollSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  filterToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
    alignItems: "center",
  },
  feedbackCard: {
    gap: 8,
  },
  priorityWrap: {
    gap: 8,
    marginBottom: 8,
  },
  priorityCard: {
    gap: 12,
    borderRadius: 14,
  },
  priorityHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityIndicator: {
    alignItems: "center",
    gap: 6,
  },
  priorityLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  sessionCard: {
    gap: 12,
    borderRadius: 14,
  },
  cardHeaderRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  patientInfoGroup: {
    flex: 1,
    gap: 2,
  },
  patientNameBadgeRow: {
    alignItems: "center",
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  sessionCode: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardChevron: {
    padding: 2,
  },
  cardMetaRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metaItem: {
    alignItems: "center",
    gap: 6,
  },
  metaTextValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaInlineRow: {
    alignItems: "center",
    gap: 6,
  },
  metaBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaTiny: {
    fontSize: 11,
    lineHeight: 15,
  },
  joinActionWrapper: {
    marginTop: 4,
  },
  joinButton: {
    width: "100%",
    borderRadius: 10,
    minHeight: 40,
  },
  footerCard: {
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
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
    height: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});
