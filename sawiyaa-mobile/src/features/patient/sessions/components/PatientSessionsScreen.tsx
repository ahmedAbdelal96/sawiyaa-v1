import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Button,
  Card,
  ListPageScaffold,
  StatusChip,
  Text,
  formatDateTime,
} from "../../../../components/ui";
import {
  useInfinitePatientSessions,
  useResolvePatientSessionJoinContract,
} from "../hooks";
import type { SessionJoinContract, SessionListItem } from "../types";
import { getAppDirection } from "../../../../i18n/direction";
import { useTheme } from "../../../../providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../../lib/external-url";
import { trackAnalyticsEvent } from "../../../../lib/analytics";
import {
  getPatientSessionPrimaryAction,
  getPatientSessionStatusKey,
  splitPatientSessions,
} from "../view-model";

type SessionsTab = "upcoming" | "history";

export default function PatientSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const direction = getAppDirection(i18n.language);
  const locale = direction === "rtl" ? "ar-SA" : "en-US";
  const sessionsQuery = useInfinitePatientSessions({ limit: 20 });
  const joinMutation = useResolvePatientSessionJoinContract();
  const [activeTab, setActiveTab] = useState<SessionsTab>("upcoming");
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const loadMoreGuardRef = useRef(false);

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

  const groupedSessions = useMemo(() => splitPatientSessions(sessions), [sessions]);
  const visibleSessions = groupedSessions[activeTab];

  const loadNextPage = useCallback(() => {
    if (
      !sessionsQuery.hasNextPage ||
      sessionsQuery.isFetchingNextPage ||
      loadMoreGuardRef.current
    ) {
      return;
    }

    loadMoreGuardRef.current = true;
    void sessionsQuery.fetchNextPage().finally(() => {
      loadMoreGuardRef.current = false;
    });
  }, [sessionsQuery]);

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      if (contentSize.height - (contentOffset.y + layoutMeasurement.height) < 520) {
        loadNextPage();
      }
    },
    [loadNextPage],
  );

  const handleViewSession = (sessionId: string) => {
    router.push(`/(patient)/sessions/${sessionId}`);
  };

  const handlePayment = (sessionId: string) => {
    router.push(`/(patient)/sessions/${sessionId}/pay`);
  };

  const handleJoin = async (session: SessionListItem) => {
    setJoiningSessionId(session.id);
    setFeedback(null);

    try {
      const payload = await joinMutation.mutateAsync(session.id);
      const contract = payload.item;
      if (!contract.canJoin || !contract.roomUrl) {
        setFeedback(t("patientSessionsFlow.detail.joinError"));
        return;
      }

      const joinUrl = buildJoinUrl(contract);
      const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
      if (!safeJoinUrl) {
        setFeedback(t("patientSessionsFlow.detail.joinError"));
        return;
      }

      await Linking.openURL(safeJoinUrl);
      trackAnalyticsEvent("session_joined", {
        role: "patient",
        sessionId: session.id,
        sessionStatus: session.operational.state,
        provider: contract.provider,
        source: "sessions_workspace",
      });
    } catch {
      setFeedback(t("patientSessionsFlow.detail.joinError"));
    } finally {
      setJoiningSessionId(null);
    }
  };

  const emptyTitle = t(
    activeTab === "upcoming"
      ? "patientSessionsFlow.list.empty.upcoming.title"
      : "patientSessionsFlow.list.empty.history.title",
  );
  const emptyBody = t(
    activeTab === "upcoming"
      ? "patientSessionsFlow.list.empty.upcoming.body"
      : "patientSessionsFlow.list.empty.history.body",
  );

  return (
    <ListPageScaffold
      title={t("patientSessionsFlow.list.title")}
      loading={sessionsQuery.isLoading}
      loadingMessage={t("patientSessionsFlow.common.loading")}
      error={sessionsQuery.isError}
      errorTitle={t("patientSessionsFlow.common.loadError")}
      errorMessage={t("patientSessionsFlow.common.loadError")}
      onRetry={() => void sessionsQuery.refetch()}
      retryText={t("patientSessionsFlow.common.retry")}
      contentContainerStyle={styles.scaffoldContent}
    >
      <ScrollView
        testID="patient-sessions-screen"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={sessionsQuery.isRefetching}
            onRefresh={() => void sessionsQuery.refetch()}
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View
          style={[styles.tabs, direction === "rtl" ? styles.rowRtl : styles.rowLtr]}
          accessibilityRole="tablist"
        >
          {(["upcoming", "history"] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                testID={`patient-sessions-tab-${tab}`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={t(
                  tab === "upcoming"
                    ? "patientSessionsFlow.list.sections.upcoming"
                    : "patientSessionsFlow.list.sections.history",
                )}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, selected && { backgroundColor: theme.colors.primary }]}
              >
                <Text
                  weight="700"
                  color={selected ? theme.colors.inverseOnSurface : theme.colors.textSecondary}
                >
                  {t(
                    tab === "upcoming"
                      ? "patientSessionsFlow.list.sections.upcoming"
                      : "patientSessionsFlow.list.sections.history",
                  )}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {feedback ? (
          <Card variant="flat" padding="sm" style={styles.feedbackCard}>
            <Text color={theme.colors.error}>{feedback}</Text>
          </Card>
        ) : null}

        {visibleSessions.length > 0 ? (
          <View style={styles.cards}>
            {visibleSessions.map((session) => (
              <PatientSessionCard
                key={session.id}
                session={session}
                locale={locale}
                direction={direction}
                joiningSessionId={joiningSessionId}
                onJoin={handleJoin}
                onPay={handlePayment}
                onView={handleViewSession}
              />
            ))}
          </View>
        ) : (
          <PatientSessionsEmpty
            title={emptyTitle}
            body={emptyBody}
            actionLabel={
              activeTab === "upcoming" && sessions.length === 0
                ? t("patientSessionsFlow.list.empty.upcoming.action")
                : null
            }
            onAction={
              activeTab === "upcoming" && sessions.length === 0
                ? () => router.push("/(patient)/discovery")
                : undefined
            }
          />
        )}

        {sessionsQuery.isFetchingNextPage ? (
          <Text color={theme.colors.textSecondary} style={styles.footerText}>
            {t("patientSessionsFlow.list.workspace.loadingMore")}
          </Text>
        ) : null}
        {sessionsQuery.isFetchNextPageError ? (
          <Button
            title={t("patientSessionsFlow.common.retry")}
            variant="secondary"
            onPress={() => void sessionsQuery.fetchNextPage()}
          />
        ) : null}
      </ScrollView>
    </ListPageScaffold>
  );
}

function PatientSessionCard({
  session,
  locale,
  direction,
  joiningSessionId,
  onJoin,
  onPay,
  onView,
}: {
  session: SessionListItem;
  locale: string;
  direction: "rtl" | "ltr";
  joiningSessionId: string | null;
  onJoin: (session: SessionListItem) => void;
  onPay: (sessionId: string) => void;
  onView: (sessionId: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isRtl = direction === "rtl";
  const practitionerName =
    session.practitioner.displayName ??
    t("patientSessionsFlow.common.practitionerFallback");
  const action = getPatientSessionPrimaryAction(session);
  const statusKey = getPatientSessionStatusKey(session.operational.state);
  const isJoining = joiningSessionId === session.id;

  return (
    <Card
      variant="outlined"
      padding="md"
      testID={`patient-session-card-${session.id}`}
      style={styles.sessionCard}
    >
      <View style={[styles.identityRow, isRtl ? styles.rowRtl : styles.rowLtr]}>
        <Avatar name={practitionerName} size={44} label={practitionerName} />
        <View style={styles.identityCopy}>
          <Text weight="700" style={[styles.practitionerName, isRtl && styles.textRtl]} numberOfLines={1}>
            {practitionerName}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.sessionDate, isRtl && styles.textRtl]}>
            {session.scheduledStartAt
              ? formatDateTime(session.scheduledStartAt, locale)
              : t("patientSessionsFlow.common.notAvailable")}
          </Text>
        </View>
        <StatusChip
          label={t(`patientSessionsFlow.list.status.${statusKey}`)}
          tone={statusTone(statusKey)}
          showDot={false}
        />
      </View>

      <View style={[styles.metaRow, isRtl ? styles.rowRtl : styles.rowLtr]}>
        <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
        <Text color={theme.colors.textSecondary}>
          {t("patientSessionsFlow.list.durationValue", {
            minutes: session.durationMinutes,
          })}
        </Text>
      </View>

      <Button
        title={
          action === "join"
            ? isJoining
              ? t("patientSessionsFlow.detail.joining")
              : t("patientSessionsFlow.list.actions.join")
            : action === "pay"
              ? t("patientSessionsFlow.list.actions.completePayment")
              : t("patientSessionsFlow.list.actions.view")
        }
        variant={action === "view" ? "secondary" : "primary"}
        loading={isJoining}
        disabled={isJoining}
        onPress={() => {
          if (action === "join") void onJoin(session);
          else if (action === "pay") onPay(session.id);
          else onView(session.id);
        }}
        style={styles.cardAction}
      />
    </Card>
  );
}

function PatientSessionsEmpty({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string | null;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState} testID="patient-sessions-empty-state">
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primaryLight }]}>
        <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
      </View>
      <Text variant="h2" weight="700" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text color={theme.colors.textSecondary} style={styles.emptyBody}>
        {body}
      </Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

function statusTone(statusKey: ReturnType<typeof getPatientSessionStatusKey>) {
  if (statusKey === "readyToJoin" || statusKey === "inProgress") return "success" as const;
  if (statusKey === "completed") return "default" as const;
  if (statusKey === "cancelled" || statusKey === "noShow" || statusKey === "unavailable") return "error" as const;
  return "warning" as const;
}

function buildJoinUrl(joinContract: SessionJoinContract | null) {
  if (!joinContract?.canJoin || !joinContract.roomUrl) return null;
  if (joinContract.joinToken && joinContract.provider === "DAILY") {
    return `${joinContract.roomUrl}${joinContract.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(joinContract.joinToken)}`;
  }
  return joinContract.roomUrl;
}

const styles = StyleSheet.create({
  scaffoldContent: { paddingHorizontal: 16, flex: 1 },
  scrollContent: { gap: 14, paddingBottom: 28 },
  tabs: {
    backgroundColor: "#FCFAF6",
    borderColor: "#E8DED0",
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  rowLtr: { flexDirection: "row" },
  rowRtl: { flexDirection: "row-reverse" },
  feedbackCard: { borderColor: "rgba(186,26,26,0.2)" },
  cards: { gap: 12 },
  sessionCard: { borderColor: "#E8DED0", borderRadius: 18, gap: 12 },
  identityRow: { alignItems: "center", gap: 10 },
  identityCopy: { flex: 1, gap: 2 },
  practitionerName: { fontSize: 15, lineHeight: 20 },
  sessionDate: { fontSize: 13, lineHeight: 18 },
  textRtl: { textAlign: "right" },
  metaRow: { alignItems: "center", gap: 7 },
  cardAction: { marginTop: 2 },
  emptyState: { alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 56 },
  emptyIcon: { alignItems: "center", borderRadius: 16, height: 52, justifyContent: "center", width: 52 },
  emptyTitle: { textAlign: "center" },
  emptyBody: { maxWidth: 300, textAlign: "center" },
  footerText: { paddingVertical: 8, textAlign: "center" },
});
