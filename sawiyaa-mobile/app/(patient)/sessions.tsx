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
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Button,
  Card,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
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

  const [activeTab, setActiveTab] = useState<"upcoming" | "previous" | "cancelled">("upcoming");

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === "rtl";
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

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const pStatus = session.presentationStatus;
      const status = session.status;
      if (activeTab === "upcoming") {
        return (
          pStatus === "JOINABLE" ||
          pStatus === "IN_PROGRESS" ||
          pStatus === "UPCOMING" ||
          pStatus === "UNAVAILABLE" ||
          status === "PENDING_PAYMENT"
        );
      } else if (activeTab === "previous") {
        return (
          (pStatus === "COMPLETED" ||
          pStatus === "ENDED" ||
          pStatus === "UNDER_REVIEW") &&
          status !== "PENDING_PAYMENT"
        );
      } else {
        return pStatus === "CANCELLED" || pStatus === "NO_SHOW";
      }
    });
  }, [sessions, activeTab]);

  const sections = useMemo(() => {
    if (activeTab === "upcoming") {
      const active = filteredSessions.filter(
        (s) =>
          s.presentationStatus === "JOINABLE" ||
          s.presentationStatus === "IN_PROGRESS" ||
          s.status === "PENDING_PAYMENT"
      );
      const upcoming = filteredSessions.filter(
        (s) =>
          s.presentationStatus === "UPCOMING" ||
          s.presentationStatus === "UNAVAILABLE"
      );

      return [
        {
          key: "active",
          titleKey: "patientSessionsFlow.list.workspace.sections.active.title",
          subtitleKey: "patientSessionsFlow.list.workspace.sections.active.subtitle",
          items: sortBySchedule(active, "asc"),
        },
        {
          key: "upcoming",
          titleKey: "patientSessionsFlow.list.workspace.sections.upcoming.title",
          subtitleKey: "patientSessionsFlow.list.workspace.sections.upcoming.subtitle",
          items: sortBySchedule(upcoming, "asc"),
        },
      ].filter((sec) => sec.items.length > 0);
    } else if (activeTab === "previous") {
      return [
        {
          key: "recent",
          titleKey: "patientSessionsFlow.list.workspace.sections.recent.title",
          subtitleKey: "patientSessionsFlow.list.workspace.sections.recent.subtitle",
          items: sortBySchedule(filteredSessions, "desc"),
        },
      ].filter((sec) => sec.items.length > 0);
    } else {
      return [
        {
          key: "cancelled",
          titleKey: "patientSessionsFlow.statuses.CANCELLED",
          subtitleKey: "",
          items: sortBySchedule(filteredSessions, "desc"),
        },
      ].filter((sec) => sec.items.length > 0);
    }
  }, [filteredSessions, activeTab]);

  const overview = useMemo(
    () => summaryQuery.data ?? buildOverview(sessions),
    [summaryQuery.data, sessions],
  );

  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = sessionsQuery;

  const loadMoreGuardRef = useRef(false);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);

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
        {/* Compact Summary Strip */}
        <View style={styles.summaryContainer}>
          <View style={styles.heroCopy}>
            <Text
              variant="caption"
              weight="700"
              color={theme.colors.textBrand}
              style={styles.heroEyebrow}
            >
              {t("patientSessionsFlow.list.workspace.title")}
            </Text>
            <Text variant="title" weight="700" color={theme.colors.textPrimary}>
              {t("patientSessionsFlow.list.workspace.subtitle")}
            </Text>
          </View>

          <View style={styles.overviewGrid}>
            {[
              {
                label: t("patientSessionsFlow.list.workspace.overview.total"),
                value: overview.total,
                tone: "neutral" as const,
                icon: "calendar-outline" as const,
              },
              {
                label: t("patientSessionsFlow.list.workspace.overview.action"),
                value: overview.actionRequired,
                tone: "warning" as const,
                icon: "alert-circle-outline" as const,
              },
              {
                label: t("patientSessionsFlow.list.workspace.overview.active"),
                value: overview.active,
                tone: "success" as const,
                icon: "checkmark-circle-outline" as const,
              },
            ].map((tile) => (
              <View
                key={tile.label}
                style={[
                  styles.overviewTile,
                  tile.tone === "warning" ? styles.overviewTileWarning : null,
                  tile.tone === "success" ? styles.overviewTileSuccess : null,
                ]}
              >
                <View
                  style={[
                    styles.overviewIconWrap,
                    tile.tone === "warning" ? styles.overviewIconWrapWarning : null,
                    tile.tone === "success" ? styles.overviewIconWrapSuccess : null,
                  ]}
                >
                  <Ionicons
                    name={tile.icon}
                    size={16}
                    color={
                      tile.tone === "warning"
                        ? theme.colors.warning
                        : tile.tone === "success"
                          ? theme.colors.success
                          : theme.colors.primary
                    }
                  />
                </View>

                <Text
                  variant="caption"
                  weight="700"
                  color={theme.colors.textSecondary}
                  style={styles.overviewLabel}
                >
                  {tile.label}
                </Text>
                <Text
                  variant="h2"
                  weight="700"
                  color={theme.colors.textPrimary}
                  style={styles.overviewValue}
                >
                  {String(tile.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {feedback ? (
          <Card variant="flat" padding="md" style={styles.feedbackCard}>
            <Text color={theme.colors.textSecondary}>{feedback}</Text>
          </Card>
        ) : null}

        {/* Local Tab Segmented Filters */}
        <View style={[styles.filterTabsRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
          {[
            { key: "upcoming", label: t("patientSessionsFlow.list.filters.upcoming") },
            { key: "previous", label: t("patientSessionsFlow.list.filters.previous") },
            { key: "cancelled", label: t("patientSessionsFlow.list.filters.cancelled") },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key as any)}
                style={[
                  styles.filterTabButton,
                  isSelected ? styles.filterTabButtonSelected : null,
                ]}
              >
                <Text
                  variant="bodySmall"
                  weight="700"
                  color={isSelected ? theme.colors.inverseOnSurface : theme.colors.textSecondary}
                  style={styles.filterTabText}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sections listing */}
        {sections.map((section) => (
          <View key={section.key} style={styles.sectionBlock}>
            {activeTab === "upcoming" ? (
              <SectionHeader
                title={t(section.titleKey)}
                subtitle={t(section.subtitleKey)}
              />
            ) : null}

            <View style={styles.sectionCards}>
              {section.items.map((session) => (
                activeTab === "upcoming" ? (
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
                ) : (
                  <SessionTimelineItem
                    key={session.id}
                    session={session}
                    locale={locale}
                    direction={direction}
                    onViewDetails={handleViewDetails}
                  />
                )
              ))}
            </View>
          </View>
        ))}

        {renderSessionsFooter({
          hasNextPage,
          isFetchingNextPage,
          isFetchNextPageError,
          onRetryNextPage: () => void fetchNextPage(),
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

// Redesigned Session Card for Upcoming/Active: compact details box, no nested card, icons only
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

  const showMode = session.sessionMode && (session.sessionMode as string) !== "UNKNOWN";
  
  const sessionModeLabel = t(
    `patientSessionsFlow.sessionModes.${session.sessionMode}` as any,
    {
      defaultValue: t("patientSessionsFlow.sessionModes.UNKNOWN"),
    }
  );

  const isRTL = direction === "rtl";

  return (
    <Card
      variant="outlined"
      padding="none"
      onPress={() => onViewDetails(session.id)}
      accessibilityRole="button"
      accessibilityLabel={t(
        "patientSessionsFlow.list.workspace.viewDetailsWithName",
        { name: practitionerName },
      )}
      style={styles.sessionCard}
    >
      {/* Top Row: Info */}
      <View style={[styles.cardTopRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
        <View style={[styles.cardIdentity, isRTL ? styles.rowRtl : styles.rowLtr]}>
          <Avatar name={practitionerName} size={44} label={practitionerName} />
          <View style={styles.cardTextWrap}>
            <Text
              weight="700"
              style={styles.sessionTitle}
              color={theme.colors.textPrimary}
            >
              {practitionerName}
            </Text>
            {session.sessionCode ? (
              <Text color={theme.colors.textMuted} style={styles.sessionSubtitle}>
                {session.sessionCode}
              </Text>
            ) : null}
          </View>
        </View>

        <StatusChip
          label={t(
            `patientSessionsFlow.presentationStatus.${session.presentationStatus}`,
          )}
          tone={tone}
          showDot={false}
        />
      </View>

      {/* Details Box: Clean unified styling, no repeated labels */}
      <View style={styles.sessionDetailsBox}>
        <View style={[styles.detailsRowIcon, isRTL ? styles.rowRtl : styles.rowLtr]}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
          <Text weight="600" color={theme.colors.textPrimary} style={styles.detailsValue}>
            {session.scheduledStartAt
              ? formatDateTime(session.scheduledStartAt, locale)
              : t("patientSessionsFlow.common.notAvailable")}
          </Text>
        </View>

        <View style={[styles.detailsRowIcon, isRTL ? styles.rowRtl : styles.rowLtr]}>
          <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
          <Text color={theme.colors.textSecondary} style={styles.detailsValue}>
            {t("patientSessionsFlow.list.durationValue", {
              minutes: session.durationMinutes,
            })}
          </Text>
        </View>

        {showMode ? (
          <View style={[styles.detailsRowIcon, isRTL ? styles.rowRtl : styles.rowLtr]}>
            <Ionicons name="videocam-outline" size={16} color={theme.colors.primary} />
            <Text color={theme.colors.textSecondary} style={styles.detailsValue}>
              {sessionModeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Actions Block */}
      <View style={styles.actionsBlock}>
        {isJoinable ? (
          <Button
            title={isJoining ? t("patientSessionsFlow.detail.joining") : t("patientSessionsFlow.detail.join")}
            onPress={() => void onJoin(session)}
            disabled={isJoining}
            style={styles.ctaButton}
          />
        ) : session.status === "PENDING_PAYMENT" ? (
          <Button
            title={t("patientSessionsFlow.detail.payNow")}
            onPress={() => onContinuePayment(session.id)}
            style={styles.ctaButton}
          />
        ) : null}

        <View
          style={[
            styles.detailsRow,
            isRTL ? styles.detailsRowRtl : styles.detailsRowLtr,
          ]}
          accessible={false}
        >
          <Text color={theme.colors.textBrand} style={styles.detailsHint}>
            {t("patientSessionsFlow.list.workspace.viewDetails")}
          </Text>
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={14}
            color={theme.colors.primary}
          />
        </View>
      </View>
    </Card>
  );
}

// Compact Timeline Item for History / Cancelled Tab
function SessionTimelineItem({
  session,
  locale,
  direction,
  onViewDetails,
}: {
  session: SessionListItem;
  locale: string;
  direction: "rtl" | "ltr";
  onViewDetails: (sessionId: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const practitionerName =
    session.practitioner.displayName ??
    t("patientSessionsFlow.common.practitionerFallback");

  const isCompleted = session.presentationStatus === "COMPLETED";
  const isCancelled = session.presentationStatus === "CANCELLED" || session.presentationStatus === "NO_SHOW";
  
  let dotBg = theme.colors.surfaceContainer;
  let iconName: keyof typeof Ionicons.glyphMap = "help-circle-outline";
  let iconColor = theme.colors.textMuted;
  
  if (isCompleted) {
    dotBg = theme.colors.statusSuccessBg;
    iconName = "checkmark";
    iconColor = theme.colors.statusSuccessText;
  } else if (isCancelled) {
    dotBg = theme.colors.statusErrorBg;
    iconName = "close";
    iconColor = theme.colors.statusErrorText;
  } else {
    dotBg = theme.colors.statusWarningBg;
    iconName = "alert-circle";
    iconColor = theme.colors.statusWarningText;
  }

  const isRTL = direction === "rtl";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onViewDetails(session.id)}
      style={[
        styles.timelineRow,
        isRTL ? styles.rowRtl : styles.rowLtr,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${practitionerName}, ${session.scheduledStartAt ? formatDateTime(session.scheduledStartAt, locale) : ""}`}
    >
      {/* Timeline Indicator Column */}
      <View style={styles.timelineIndicatorColumn}>
        <View style={styles.timelineVerticalLine} />
        <View style={[styles.timelineNodeDot, { backgroundColor: dotBg }]}>
          <Ionicons name={iconName} size={12} color={iconColor} />
        </View>
      </View>

      {/* Content Card */}
      <Card
        variant="flat"
        padding="none"
        style={styles.timelineCard}
      >
        <View style={[styles.timelineCardHeader, isRTL ? styles.rowRtl : styles.rowLtr]}>
          <Text variant="caption" weight="700" color={theme.colors.textPrimary}>
            {session.scheduledStartAt
              ? formatDateTime(session.scheduledStartAt, locale)
              : t("patientSessionsFlow.common.notAvailable")}
          </Text>
          <StatusChip
            label={t(`patientSessionsFlow.presentationStatus.${session.presentationStatus}`)}
            tone={mapSessionPresentationTone(session.presentationStatus)}
            showDot={false}
          />
        </View>

        <View style={[styles.timelineCardBody, isRTL ? styles.rowRtl : styles.rowLtr]}>
          <Avatar name={practitionerName} size={32} label={practitionerName} />
          <View style={styles.timelineIdentityWrap}>
            <Text variant="bodySmall" weight="700" color={theme.colors.textPrimary}>
              {practitionerName}
            </Text>
            {session.sessionCode ? (
              <Text variant="caption" color={theme.colors.textMuted}>
                {session.sessionCode}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={14}
            color={theme.colors.textMuted}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
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
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  summaryContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  heroCopy: {
    gap: 2,
  },
  heroEyebrow: {
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 11,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  overviewTile: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 90,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
  },
  overviewTileWarning: {
    backgroundColor: "#FCFAF6",
  },
  overviewTileSuccess: {
    backgroundColor: "#EEF4EF",
  },
  overviewIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4EF",
  },
  overviewIconWrapWarning: {
    backgroundColor: "#F5EBDD",
  },
  overviewIconWrapSuccess: {
    backgroundColor: "#E8F1EA",
  },
  overviewLabel: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  overviewValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  feedbackCard: {
    gap: 8,
  },
  filterTabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  rowLtr: {
    flexDirection: "row",
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  filterTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
  },
  filterTabButtonSelected: {
    backgroundColor: "#24564F",
    borderColor: "#24564F",
  },
  filterTabText: {
    fontSize: 12,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionCards: {
    gap: 12,
  },
  sessionCard: {
    padding: 16,
    gap: 12,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTextWrap: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  sessionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
  sessionDetailsBox: {
    backgroundColor: "#FCFAF6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DED0",
    padding: 12,
    gap: 8,
  },
  detailsRowIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsBlock: {
    gap: 8,
    marginTop: 2,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 12,
  },
  detailsRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    minHeight: 32,
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
  // Timeline styles
  timelineRow: {
    flexDirection: "row",
    gap: 10,
  },
  timelineIndicatorColumn: {
    width: 26,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
  },
  timelineVerticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#E8DED0",
    alignSelf: "center",
  },
  timelineNodeDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#F7F4EE",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DED0",
    padding: 12,
    gap: 8,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  timelineCardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  timelineIdentityWrap: {
    flex: 1,
  },
});
