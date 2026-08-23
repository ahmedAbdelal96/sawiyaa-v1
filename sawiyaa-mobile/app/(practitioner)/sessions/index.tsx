import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
} from "../../../src/components/ui";
import {
  useInfinitePractitionerSessions,
  usePreparePractitionerSessionRuntime,
  useResolvePractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/hooks";
import type {
  PractitionerSessionJoinContract,
  PractitionerSessionListItem,
} from "../../../src/features/practitioner/sessions/types";
import {
  getPractitionerSessionAction,
  getPractitionerSessionStatusKey,
  selectPractitionerSessionPriority,
  sortPractitionerSessions,
  splitPractitionerSessions,
  type PractitionerSessionAction,
  type PractitionerSessionStatusKey,
  type PractitionerSessionsSection,
} from "../../../src/features/practitioner/sessions/view-model";
import { getAppDirection, getDirectionalIcon } from "../../../src/i18n/direction";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { formatViewerDateTime } from "../../../src/lib/time-formatting";

export default function PractitionerSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === "rtl";
  const locale = isRTL ? "ar-SA" : "en-US";
  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const [section, setSection] = useState<PractitionerSessionsSection>("upcoming");
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const loadMoreGuardRef = useRef(false);

  const sessionsQuery = useInfinitePractitionerSessions({ limit: 20 });
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();

  const sessions = useMemo(() => {
    const seen = new Set<string>();
    return (sessionsQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
      (session) => {
        if (seen.has(session.id)) return false;
        seen.add(session.id);
        return true;
      },
    );
  }, [sessionsQuery.data?.pages]);

  const groupedSessions = useMemo(() => splitPractitionerSessions(sessions), [sessions]);
  const visibleSessions = useMemo(
    () => sortPractitionerSessions(groupedSessions[section], section),
    [groupedSessions, section],
  );
  const prioritySession = useMemo(
    () => selectPractitionerSessionPriority(groupedSessions.upcoming),
    [groupedSessions.upcoming],
  );

  const handleViewDetails = useCallback(
    (sessionId: string) => {
      router.push(`/(practitioner)/sessions/${sessionId}`);
    },
    [router],
  );

  const handleJoinSession = useCallback(
    async (session: PractitionerSessionListItem) => {
      if (session.operational?.join.allowed !== true) {
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
          session.operational?.join.canPrepareRuntime
        ) {
          await prepareMutation.mutateAsync(session.id);
          contract = (await joinMutation.mutateAsync(session.id)).item;
        }

        const joinUrl = buildJoinUrl(contract);
        if (!joinUrl) {
          setFeedback(
            t("practitioner.sessions.joinBlocked", {
              reason: t(
                `practitioner.sessions.blocked.${contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"}`,
              ),
            }),
          );
          return;
        }

        const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
        if (!safeJoinUrl) {
          setFeedback(t("practitioner.sessions.joinError"));
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
      } catch {
        setFeedback(t("practitioner.sessions.joinError"));
      } finally {
        setJoiningSessionId(null);
      }
    },
    [handleViewDetails, joinMutation, prepareMutation, t],
  );

  const loadNextPage = useCallback(() => {
    if (!sessionsQuery.hasNextPage || sessionsQuery.isFetchingNextPage || loadMoreGuardRef.current) {
      return;
    }
    loadMoreGuardRef.current = true;
    void sessionsQuery.fetchNextPage().finally(() => {
      loadMoreGuardRef.current = false;
    });
  }, [sessionsQuery]);

  if (sessionsQuery.isLoading && sessions.length === 0) {
    return (
      <Screen safeArea={false} bg="background">
        <Header title={t("practitioner.sessions.title")} />
        <SessionsLoadingSkeleton />
      </Screen>
    );
  }

  if (sessionsQuery.isError && sessions.length === 0) {
    return (
      <Screen safeArea={false} bg="background">
        <Header title={t("practitioner.sessions.title")} />
        <ErrorState
          title={t("practitioner.sessions.loadErrorTitle")}
          message={t("practitioner.sessions.loadErrorBody")}
          onRetry={() => void sessionsQuery.refetch()}
          retryText={t("practitioner.sessions.retry")}
          fullScreen={false}
        />
      </Screen>
    );
  }

  const isEmpty = !sessionsQuery.isLoading && visibleSessions.length === 0;

  return (
    <Screen safeArea={false} bg="background" style={styles.screen}>
      <Header title={t("practitioner.sessions.title")} />
      <FlatList
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            isPriority={section === "upcoming" && prioritySession?.id === item.id}
            locale={locale}
            direction={direction}
            t={t}
            theme={theme}
            joiningSessionId={joiningSessionId}
            onJoin={handleJoinSession}
            onViewDetails={handleViewDetails}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={[styles.sectionSwitch, { flexDirection: rowDirection }]} accessibilityRole="tablist">
              {(["upcoming", "history"] as PractitionerSessionsSection[]).map((item) => (
                <FilterChip
                  key={item}
                  label={t(`practitioner.sessions.sections.${item}`)}
                  selected={section === item}
                  onPress={() => setSection(item)}
                />
              ))}
            </View>
            {feedback ? (
              <Text color={theme.colors.textSecondary} style={[styles.feedback, { textAlign }]}>
                {feedback}
              </Text>
            ) : null}
            {sessionsQuery.isError && sessions.length > 0 ? (
              <TouchableOpacity onPress={() => void sessionsQuery.refetch()} style={styles.staleNotice}>
                <Text color={theme.colors.textSecondary} style={{ textAlign }}>
                  {t("practitioner.sessions.refreshError")}
                </Text>
              </TouchableOpacity>
            ) : null}
            <Text weight="700" style={[styles.sectionTitle, { textAlign }]}>
              {t(`practitioner.sessions.sections.${section}`)}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isEmpty ? (
            <EmptyState
              title={t(`practitioner.sessions.empty.${section}.title`)}
              description={t(`practitioner.sessions.empty.${section}.body`)}
              actionLabel={section === "upcoming" ? t("practitioner.sessions.empty.upcoming.action") : undefined}
              onAction={section === "upcoming" ? () => router.push("/(practitioner)/availability") : undefined}
              icon={<Ionicons name="calendar-outline" size={42} color={theme.colors.textMuted} />}
            />
          ) : null
        }
        ListFooterComponent={
          <SessionsFooter
            hasNextPage={sessionsQuery.hasNextPage}
            isFetchingNextPage={sessionsQuery.isFetchingNextPage}
            isFetchNextPageError={sessionsQuery.isFetchNextPageError}
            onRetry={loadNextPage}
            t={t}
            theme={theme}
          />
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
      />
    </Screen>
  );
}

function SessionCard({
  session,
  isPriority,
  locale,
  direction,
  t,
  theme,
  joiningSessionId,
  onJoin,
  onViewDetails,
}: {
  session: PractitionerSessionListItem;
  isPriority: boolean;
  locale: string;
  direction: "rtl" | "ltr";
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: ReturnType<typeof useTheme>["theme"];
  joiningSessionId: string | null;
  onJoin: (session: PractitionerSessionListItem) => void;
  onViewDetails: (sessionId: string) => void;
}) {
  const isRTL = direction === "rtl";
  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const action = getPractitionerSessionAction(session);
  const statusKey = getPractitionerSessionStatusKey(session);
  const statusTone = getStatusTone(statusKey);
  const patientName = session.patient?.displayName ?? t("practitioner.sessions.unknownPatient");
  const isJoining = joiningSessionId === session.id;
  const actionTitle = getActionTitle(action, isJoining, t);

  return (
    <Card
      variant="outlined"
      padding="md"
      style={[
        styles.sessionCard,
        isPriority && { borderColor: theme.colors.primary, borderWidth: 1.5 },
      ]}
    >
      <TouchableOpacity
        onPress={() => onViewDetails(session.id)}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={t("practitioner.sessions.viewDetailsWithName", { name: patientName })}
      >
        <View style={[styles.cardTop, { flexDirection: rowDirection }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="person-outline" size={19} color={theme.colors.primary} />
          </View>
          <View style={styles.identity}>
            <Text weight="700" style={[styles.patientName, { textAlign }]} numberOfLines={1}>
              {patientName}
            </Text>
            <StatusChip
              label={t(`practitioner.sessions.status.${statusKey}`)}
              tone={statusTone}
            />
          </View>
          <Ionicons
            name={getDirectionalIcon("disclosure", isRTL)}
            size={17}
            color={theme.colors.textMuted}
          />
        </View>
        <View style={[styles.detailRow, { flexDirection: rowDirection }]}>
          <View style={[styles.detailItem, { flexDirection: rowDirection }]}>
            <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} />
            <Text color={theme.colors.textSecondary} style={[styles.detailText, { textAlign }]}>
              {session.scheduledStartAt
                ? formatViewerDateTime(session.scheduledStartAt, { locale, fallbackText: "-" })
                : t("practitioner.sessions.noSchedule")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.duration}>
            {t("practitioner.sessions.duration", { minutes: session.durationMinutes })}
          </Text>
        </View>
      </TouchableOpacity>
      <Button
        title={actionTitle}
        onPress={() => {
          if (action === "join") {
            void onJoin(session);
          } else {
            onViewDetails(session.id);
          }
        }}
        disabled={isJoining}
        variant={action === "view" ? "secondary" : "primary"}
        style={styles.cardAction}
      />
    </Card>
  );
}

function SessionsFooter({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onRetry,
  t,
  theme,
}: {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onRetry: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  if (isFetchingNextPage) {
    return <Text color={theme.colors.textMuted} style={styles.footerText}>{t("practitioner.sessions.loadingMore")}</Text>;
  }
  if (isFetchNextPageError) {
    return (
      <View style={styles.footerError}>
        <Text color={theme.colors.textSecondary}>{t("practitioner.sessions.loadMoreError")}</Text>
        <Button title={t("practitioner.sessions.retry")} onPress={onRetry} variant="secondary" />
      </View>
    );
  }
  return hasNextPage === false ? (
    <Text color={theme.colors.textMuted} style={styles.footerText}>{t("practitioner.sessions.endOfList")}</Text>
  ) : <View style={styles.footerSpacer} />;
}

function SessionsLoadingSkeleton() {
  return (
    <View style={styles.loadingContent}>
      <LoadingState fullScreen={false} />
      <Card variant="outlined" padding="md" style={styles.loadingCard} />
      <Card variant="outlined" padding="md" style={styles.loadingCard} />
    </View>
  );
}

function getActionTitle(
  action: PractitionerSessionAction,
  isJoining: boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (isJoining) return t("practitioner.sessions.joining");
  return t(`practitioner.sessions.actions.${action}`);
}

function getStatusTone(status: PractitionerSessionStatusKey) {
  switch (status) {
    case "readyToJoin":
    case "inProgress":
      return "success" as const;
    case "upcoming":
      return "warning" as const;
    case "actionRequired":
    case "underReview":
      return "warning" as const;
    case "completed":
      return "default" as const;
    case "cancelled":
    case "noShow":
    case "unavailable":
      return "error" as const;
  }
}

function buildJoinUrl(contract: PractitionerSessionJoinContract): string | null {
  if (!contract.canJoin || !contract.roomUrl) return null;
  if (contract.joinToken && contract.provider === "DAILY") {
    return `${contract.roomUrl}${contract.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(contract.joinToken)}`;
  }
  return contract.roomUrl;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 },
  headerContent: { gap: 12, paddingBottom: 8 },
  sectionSwitch: { gap: 8 },
  sectionTitle: { fontSize: 17, lineHeight: 22, marginTop: 2 },
  feedback: { fontSize: 12, lineHeight: 17 },
  staleNotice: { paddingVertical: 8 },
  itemSeparator: { height: 10 },
  sessionCard: { gap: 12, borderRadius: 14 },
  cardTop: { alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  identity: { flex: 1, gap: 5, minWidth: 0 },
  patientName: { fontSize: 15, lineHeight: 20 },
  detailRow: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  detailItem: { alignItems: "center", gap: 6, flexShrink: 1 },
  detailText: { fontSize: 12.5, lineHeight: 17, flexShrink: 1 },
  duration: { fontSize: 12.5, lineHeight: 17 },
  cardAction: { width: "100%", minHeight: 42 },
  footerText: { textAlign: "center", paddingVertical: 18, fontSize: 12 },
  footerError: { gap: 10, paddingVertical: 16 },
  footerSpacer: { height: 18 },
  loadingContent: { padding: 16, gap: 12 },
  loadingCard: { minHeight: 130 },
});
