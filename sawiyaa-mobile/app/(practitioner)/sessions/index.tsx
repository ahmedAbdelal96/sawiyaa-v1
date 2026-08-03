import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
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
      { key: "all" as const, label: t("practitioner.sessions.filters.all", { defaultValue: isArabic ? "الكل" : "All" }) },
      {
        key: "ready" as const,
        label: t("practitioner.sessions.filters.ready", { defaultValue: isArabic ? "جاهزة للانضمام" : "Ready to Join" }),
      },
      {
        key: "upcoming" as const,
        label: t("practitioner.sessions.filters.upcoming", { defaultValue: isArabic ? "القادمة" : "Upcoming" }),
      },
      { key: "live" as const, label: t("practitioner.sessions.filters.live", { defaultValue: isArabic ? "الجارية" : "Live" }) },
      { key: "closed" as const, label: t("practitioner.sessions.filters.closed", { defaultValue: isArabic ? "المكتملة" : "Closed" }) },
    ],
    [t, isArabic],
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

        {/* Action icons group */}
        <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
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
          <Text weight="bold" style={[styles.mainScrollTitle, { textAlign }]}>
            {isArabic ? "الجلسات المجدولة" : "Scheduled Sessions"}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.mainScrollSubtitle, { textAlign }]}>
            {isArabic
              ? "تابع مواعيد الجلسات، انضم للجلسات المباشرة، واستعرض السجل كاملاً"
              : "Track session schedules, join live sessions, and view your complete record"}
          </Text>
        </View>
      </View>

      {/* Horizontal Scrollable Filter Toolbar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterScrollContent, { flexDirection: rowDirection }]}
      >
        {filterOptions.map((item) => (
          <FilterChip
            key={item.key}
            label={`${item.label} (${getFilterCount(item.key)})`}
            selected={selectedFilter === item.key}
            onPress={() => setSelectedFilter(item.key)}
          />
        ))}
      </ScrollView>

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
                title={t("practitioner.sessions.workspace.emptyFilteredTitle", { defaultValue: isArabic ? "لا توجد جلسات تطابق التصفية" : "No sessions match filter" })}
                description={t("practitioner.sessions.workspace.emptyFilteredBody", { defaultValue: isArabic ? "جرب اختيار فلتر آخر أو استعرض كل الجلسات." : "Try selecting another filter." })}
                actionLabel={t("practitioner.sessions.workspace.emptyFilteredAction", { defaultValue: isArabic ? "عرض كل الجلسات" : "Show all sessions" })}
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
              isArabic,
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
  isArabic,
}: {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onRetryNextPage: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string, options?: Record<string, unknown>) => string;
  isArabic: boolean;
}) {
  if (isFetchingNextPage) {
    return (
      <Card variant="flat" padding="md" style={styles.footerCard}>
        <Text color={theme.colors.textSecondary}>
          {t("practitioner.sessions.workspace.loadingMore", { defaultValue: isArabic ? "جاري تحميل المزيد من الجلسات..." : "Loading more sessions..." })}
        </Text>
      </Card>
    );
  }

  if (isFetchNextPageError) {
    return (
      <Card variant="flat" padding="md" style={styles.footerCard}>
        <Text weight="600" color={theme.colors.textPrimary}>
          {t("practitioner.sessions.workspace.loadMoreErrorTitle", { defaultValue: isArabic ? "تعذر تحميل باقي الجلسات" : "Failed to load more sessions" })}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.footerBody}>
          {t("practitioner.sessions.workspace.loadMoreErrorSubtitle", { defaultValue: isArabic ? "يرجى المحاولة مرة أخرى." : "Please try again." })}
        </Text>
        <View style={styles.footerAction}>
          <Button
            title={t("practitioner.sessions.workspace.retry", { defaultValue: isArabic ? "إعادة المحاولة" : "Retry" })}
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
          {t("practitioner.sessions.workspace.endOfList", { defaultValue: isArabic ? "لقد وصلت إلى نهاية قائمة الجلسات." : "You have reached the end of the list." })}
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
  const isArabic = direction === "rtl";
  const patientName =
    session.patient?.displayName ??
    t("practitioner.sessions.unknownPatient", {
      defaultValue: isArabic ? "مريض غير معروف" : "Unknown Patient",
    });

  const statusLabelKey = `practitioner.presentationStatus.${session.presentationStatus}`;
  const translatedStatus = t(statusLabelKey);
  const statusLabel = translatedStatus.includes("presentationStatus.")
    ? session.presentationStatus === "READY_TO_JOIN"
      ? (isArabic ? "جاهزة للانضمام" : "Ready to Join")
      : session.presentationStatus
    : translatedStatus;

  return (
    <Card variant="outlined" padding="md" style={styles.sessionCard}>
      {/* Clickable Header & Details Section */}
      <TouchableOpacity
        onPress={() => onViewDetails(session.id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t(
          "practitioner.sessions.workspace.viewDetailsWithName",
          { name: patientName, defaultValue: `تفاصيل جلسة ${patientName}` },
        )}
        style={styles.cardHeaderArea}
      >
        <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
          {/* Patient Avatar Circle */}
          <View style={[styles.avatarCircle, { backgroundColor: "rgba(5, 63, 56, 0.08)" }]}>
            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
          </View>

          <View style={styles.patientInfoGroup}>
            <View style={[styles.patientNameBadgeRow, { flexDirection: rowDirection }]}>
              <Text
                weight="700"
                style={[styles.patientName, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {patientName}
              </Text>
              <StatusChip label={statusLabel} tone={statusTone} />
            </View>
            <Text color={theme.colors.textMuted} style={[styles.sessionCode, { textAlign }]}>
              {session.sessionCode}
            </Text>
          </View>

          <Ionicons
            name={isArabic ? "chevron-back" : "chevron-forward"}
            size={16}
            color={theme.colors.textMuted}
            style={styles.cardChevron}
          />
        </View>

        {/* Divider line */}
        <View style={styles.cardDivider} />

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
              <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
              <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
                {t("practitioner.sessions.duration", {
                  minutes: session.durationMinutes,
                  defaultValue: `${session.durationMinutes} دقيقة`,
                })}
              </Text>
            </View>

            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="videocam-outline" size={12} color={theme.colors.textSecondary} />
              <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
                {t(`practitioner.detail.modeValue.${session.sessionMode}`, {
                  defaultValue: session.sessionMode === "VIDEO" ? "فيديو" : session.sessionMode,
                })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action Button: Separated outside TouchableOpacity to avoid HTML nested button warnings */}
      {isJoinable ? (
        <View style={styles.joinActionWrapper}>
          <Button
            title={
              isJoining
                ? t("practitioner.detail.joining", {
                    defaultValue: isArabic ? "جاري الانضمام..." : "Joining...",
                  })
                : t("practitioner.detail.join", {
                    defaultValue: isArabic ? "🎥 الانضمام للجلسة الآن ➔" : "🎥 Join Session Now ➔",
                  })
            }
            onPress={() => void onJoin(session)}
            disabled={isJoining}
            style={styles.joinButton}
          />
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => onViewDetails(session.id)}
          style={[styles.secondaryDetailBtn, { flexDirection: rowDirection }]}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryDetailText} color={theme.colors.primary} weight="700">
            {isArabic ? "عرض تفاصيل الجلسة" : "View Session Details"}
          </Text>
          <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
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
  const isArabic = direction === "rtl";
  const patientName =
    session.patient?.displayName ??
    t("practitioner.sessions.unknownPatient", {
      defaultValue: isArabic ? "مريض غير معروف" : "Unknown Patient",
    });
  const statusTone = mapSessionPresentationTone(session.presentationStatus);

  const statusLabelKey = `practitioner.presentationStatus.${session.presentationStatus}`;
  const translatedStatus = t(statusLabelKey);
  const statusLabel = translatedStatus.includes("presentationStatus.")
    ? session.presentationStatus === "READY_TO_JOIN"
      ? (isArabic ? "جاهزة للانضمام" : "Ready to Join")
      : session.presentationStatus
    : translatedStatus;

  return (
    <View style={styles.priorityWrap}>
      <Card
        variant="elevated"
        padding="md"
        style={[
          styles.priorityCard,
          {
            backgroundColor: "#E6F4F1",
            borderColor: "#24564F",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => onViewDetails(session.id)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t(
            "practitioner.sessions.workspace.viewDetailsWithName",
            { name: patientName, defaultValue: `تفاصيل جلسة ${patientName}` },
          )}
          style={styles.cardHeaderArea}
        >
          {/* Top Priority Badge Bar */}
          <View style={[styles.priorityBadgeBar, { flexDirection: rowDirection }]}>
            <Ionicons name="sparkles" size={14} color="#053F38" />
            <Text weight="bold" style={styles.priorityBadgeText}>
              {isJoinable
                ? (isArabic ? "⚡ الأولوية الآن — جلسة نشطة جاهزة للانضمام" : "⚡ Priority — Live Session Ready")
                : (isArabic ? "📅 الجلسة القادمة التالية" : "📅 Next Scheduled Session")}
            </Text>
          </View>

          <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
            <View style={[styles.priorityAvatarCircle, { backgroundColor: "#053F38" }]}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>

            <View style={styles.patientInfoGroup}>
              <View style={[styles.patientNameBadgeRow, { flexDirection: rowDirection }]}>
                <Text
                  weight="bold"
                  style={[styles.priorityPatientName, { color: "#053F38" }]}
                  numberOfLines={1}
                >
                  {patientName}
                </Text>
                <StatusChip label={statusLabel} tone={statusTone} />
              </View>
              <Text style={[styles.sessionCode, { textAlign, color: "#404847" }]}>
                {session.sessionCode}
              </Text>
            </View>

            <Ionicons
              name={isArabic ? "chevron-back" : "chevron-forward"}
              size={18}
              color="#053F38"
            />
          </View>

          {/* Meta Information Bar */}
          <View style={[styles.cardMetaRow, { flexDirection: rowDirection }]}>
            <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
              <Ionicons name="calendar-outline" size={14} color="#053F38" />
              <Text style={[styles.metaTextValue, { color: "#053F38", fontWeight: "700" }]}>
                {session.scheduledStartAt
                  ? formatViewerDateTime(session.scheduledStartAt, {
                      locale,
                      fallbackText: "-",
                    })
                  : t("practitioner.sessions.noSchedule")}
              </Text>
            </View>

            <View style={[styles.metaInlineRow, { flexDirection: rowDirection }]}>
              <View style={[styles.metaBadge, { backgroundColor: "#FFFFFF" }]}>
                <Text style={[styles.metaTiny, { color: "#053F38", fontWeight: "700" }]}>
                  {t("practitioner.sessions.duration", {
                    minutes: session.durationMinutes,
                    defaultValue: `${session.durationMinutes} دقيقة`,
                  })}
                </Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: "#FFFFFF" }]}>
                <Text style={[styles.metaTiny, { color: "#053F38", fontWeight: "700" }]}>
                  {t(`practitioner.detail.modeValue.${session.sessionMode}`, {
                    defaultValue: session.sessionMode === "VIDEO" ? "فيديو" : session.sessionMode,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Primary Action Button */}
        {isJoinable ? (
          <View style={styles.priorityJoinActionWrapper}>
            <Button
              title={
                isJoining
                  ? t("practitioner.detail.joining", {
                      defaultValue: isArabic ? "جاري الانضمام للجلسة..." : "Joining...",
                    })
                  : t("practitioner.detail.join", {
                      defaultValue: isArabic ? "🎥 الانضمام للجلسة المباشرة الآن ➔" : "🎥 Join Live Session Now ➔",
                    })
              }
              onPress={() => void onJoin(session)}
              disabled={isJoining}
              style={styles.priorityJoinButton}
            />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function buildSessionSummary(sessions: PractitionerSessionListItem[]): {
  upcoming: number;
  ready: number;
  live: number;
  closed: number;
} {
  return sessions.reduce(
    (acc, item) => {
      switch (item.presentationStatus) {
        case "UPCOMING":
          acc.upcoming += 1;
          break;
        case "READY_TO_JOIN":
          acc.ready += 1;
          break;
        case "IN_PROGRESS":
          acc.live += 1;
          break;
        case "COMPLETED":
        case "CANCELLED":
        case "EXPIRED":
        case "PATIENT_NO_SHOW":
        case "PRACTITIONER_NO_SHOW":
        case "BOTH_NO_SHOW":
          acc.closed += 1;
          break;
        default:
          break;
      }
      return acc;
    },
    { upcoming: 0, ready: 0, live: 0, closed: 0 },
  );
}

function sortSessionsByStartTime(
  items: PractitionerSessionListItem[],
  direction: "asc" | "desc" = "asc",
): PractitionerSessionListItem[] {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...items].sort((left, right) => {
    const leftTime = left.scheduledStartAt
      ? new Date(left.scheduledStartAt).getTime()
      : Number.POSITIVE_INFINITY;
    const rightTime = right.scheduledStartAt
      ? new Date(right.scheduledStartAt).getTime()
      : Number.POSITIVE_INFINITY;

    if (leftTime === rightTime) {
      return 0;
    }

    return (leftTime - rightTime) * multiplier;
  });
}

function pickPrioritySession(
  items: PractitionerSessionListItem[],
): PractitionerSessionListItem | null {
  if (items.length === 0) {
    return null;
  }

  const joinable = items.find((item) => isSessionJoinableNow(item));
  if (joinable) {
    return joinable;
  }

  const upcoming = items.find(
    (item) => item.presentationStatus === "UPCOMING",
  );
  return upcoming ?? null;
}

function isSessionJoinableNow(session: PractitionerSessionListItem) {
  return (
    session.presentationStatus === "READY_TO_JOIN" ||
    session.presentationStatus === "IN_PROGRESS" ||
    !!session.joinAvailability?.canJoin
  );
}

function canAttemptPrepare(session: PractitionerSessionListItem) {
  return (
    session.status === "UPCOMING" ||
    session.status === "READY_TO_JOIN" ||
    session.status === "IN_PROGRESS"
  );
}

function buildJoinUrl(contract: PractitionerSessionJoinContract): string | null {
  if (contract.roomUrl) {
    return contract.roomUrl;
  }
  return null;
}

function mapSessionPresentationTone(status: SessionPresentationStatus) {
  switch (status) {
    case "READY_TO_JOIN":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
      return "warning" as const;
    case "COMPLETED":
      return "default" as const;
    case "CANCELLED":
    case "EXPIRED":
    case "PATIENT_NO_SHOW":
    case "PRACTITIONER_NO_SHOW":
    case "BOTH_NO_SHOW":
      return "error" as const;
    default:
      return "default" as const;
  }
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
  listContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  itemSeparator: {
    height: 10,
  },
  headerStack: {
    gap: 12,
    marginBottom: 12,
  },
  titleWrapper: {
    paddingVertical: 4,
    gap: 2,
  },
  mainScrollTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  mainScrollSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  filterScrollContent: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  feedbackCard: {
    gap: 8,
  },
  priorityWrap: {
    width: "100%",
  },
  priorityCard: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  priorityBadgeBar: {
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  priorityBadgeText: {
    fontSize: 12.5,
    color: "#053F38",
  },
  priorityAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityPatientName: {
    fontSize: 17,
    lineHeight: 22,
  },
  priorityJoinActionWrapper: {
    marginTop: 4,
    width: "100%",
  },
  priorityJoinButton: {
    width: "100%",
    backgroundColor: "#053F38",
    borderRadius: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  sessionCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderArea: {
    gap: 10,
    width: "100%",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 15.5,
    lineHeight: 20,
    flexShrink: 1,
  },
  sessionCode: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  cardChevron: {
    padding: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    width: "100%",
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
    fontSize: 12.5,
    lineHeight: 16,
  },
  metaInlineRow: {
    alignItems: "center",
    gap: 6,
  },
  metaBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaTiny: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  joinActionWrapper: {
    marginTop: 4,
    width: "100%",
  },
  joinButton: {
    width: "100%",
    borderRadius: 12,
    minHeight: 44,
  },
  secondaryDetailBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 2,
  },
  secondaryDetailText: {
    fontSize: 13,
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
