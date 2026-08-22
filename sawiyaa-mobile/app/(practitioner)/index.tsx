import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
} from "../../src/components/ui";
import {
  usePractitionerProfile,
  usePractitionerReadiness,
} from "../../src/features/practitioner/profile/hooks";
import { usePractitionerSessions } from "../../src/features/practitioner/sessions/hooks";
import type {
  PractitionerSessionListItem,
  SessionStatus,
} from "../../src/features/practitioner/sessions/types";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  countPractitionerSessionsToday,
  getPractitionerHomeAction,
  selectPractitionerHomeNextSession,
  selectPractitionerHomeSessions,
  selectPractitionerHomeUrgentSession,
  shouldShowPractitionerHomeTodaySummary,
  type PractitionerHomeAction,
} from "../../src/features/practitioner/home/view-model";
import {
  formatPractitionerDate,
  formatPractitionerTime,
} from "../../src/lib/time-formatting";
import { practitionerMissingRequirementLabel } from "../../src/features/practitioner/profile/utils";
import { useAppDirection } from "../../src/i18n/direction";

export default function PractitionerHomeScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const sessionsQuery = usePractitionerSessions({ limit: 20 });

  const isArabic = i18n.language?.startsWith("ar") ?? false;
  const locale = isArabic ? "ar-EG" : "en-US";
  const textAlign = isArabic ? "right" : "left";
  const rowDirection = isArabic ? "row-reverse" : "row";
  const sessions = useMemo(
    () => (sessionsQuery.data?.items ?? []) as PractitionerSessionListItem[],
    [sessionsQuery.data?.items],
  );
  const timeZone = profileQuery.data?.profile?.timezone ?? null;
  const nextSession = useMemo(
    () => selectPractitionerHomeNextSession(sessions),
    [sessions],
  );
  const upcomingSessions = useMemo(
    () => selectPractitionerHomeSessions(sessions),
    [sessions],
  );
  const urgentSession = useMemo(
    () => selectPractitionerHomeUrgentSession(sessions),
    [sessions],
  );
  const todaySessionCount = countPractitionerSessionsToday(
    sessions,
    new Date(),
    timeZone,
  );

  if (profileQuery.isLoading) {
    return (
      <Screen
        bg="background"
        testID="practitioner-home-screen"
        safeArea
        edges={["top", "left", "right"]}
      >
        <Header variant="home" hideMessages />
        <HomeLoadingState message={t("practitioner.home.loading")} />
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data?.profile) {
    return (
      <Screen
        bg="background"
        testID="practitioner-home-screen"
        safeArea
        edges={["top", "left", "right"]}
      >
        <Header variant="home" hideMessages />
        <ErrorState
          title={t("practitioner.home.errorTitle")}
          message={t("practitioner.home.errorBody")}
          retryText={t("common.retry")}
          onRetry={() => void profileQuery.refetch()}
        />
      </Screen>
    );
  }

  const profile = profileQuery.data.profile;
  const readiness = readinessQuery.data?.readiness ?? null;
  const missingRequirements = readiness?.missingRequirements ?? [];
  const profileNeedsAttention =
    profile.profileStatus !== "APPROVED" ||
    readiness?.isProfileCompleted === false ||
    missingRequirements.length > 0;
  const displayName = profile.displayName?.trim() || t("practitioner.home.fallbackName");
  const todayLabel = formatPractitionerDate(new Date(), timeZone, {
    locale,
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Screen
      bg="background"
      testID="practitioner-home-screen"
      safeArea
      edges={["top", "left", "right"]}
    >
      <Header variant="home" hideMessages />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.greetingBlock}>
          <Text
            weight="700"
            style={[styles.greeting, { textAlign }]}
            accessibilityRole="header"
          >
            {t("practitioner.home.greeting", { name: displayName })}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.date, { textAlign }]}>
            {todayLabel}
          </Text>
        </View>

        {profileNeedsAttention ? (
          <AccountAttention
            isArabic={isArabic}
            missingRequirements={missingRequirements}
            profileStatus={profile.profileStatus}
            textAlign={textAlign}
            rowDirection={rowDirection}
            onOpenAccount={() => router.push("/(practitioner)/account")}
          />
        ) : null}

        {sessionsQuery.isError ? (
          <View style={styles.inlineState}>
            <ErrorState
              title={t("practitioner.home.sessionsErrorTitle")}
              message={t("practitioner.home.sessionsErrorBody")}
              retryText={t("common.retry")}
              onRetry={() => void sessionsQuery.refetch()}
            />
          </View>
        ) : nextSession ? (
          <PrimarySessionCard
            session={nextSession}
            isUrgent={urgentSession?.id === nextSession.id}
            locale={locale}
            timeZone={timeZone}
            textAlign={textAlign}
            rowDirection={rowDirection}
            t={t}
            onOpen={() => router.push(`/(practitioner)/sessions/${nextSession.id}`)}
          />
        ) : (
          <NoUpcomingState
            textAlign={textAlign}
            t={t}
          />
        )}

        {urgentSession && urgentSession.id !== nextSession?.id ? (
          <UrgentActionRow
            session={urgentSession}
            textAlign={textAlign}
            rowDirection={rowDirection}
            t={t}
            onOpen={() => router.push(`/(practitioner)/sessions/${urgentSession.id}`)}
          />
        ) : null}

        {shouldShowPractitionerHomeTodaySummary(todaySessionCount, upcomingSessions.length) ? (
          <TodaySummary
            count={todaySessionCount}
            upcomingCount={upcomingSessions.length}
            textAlign={textAlign}
            t={t}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function PrimarySessionCard({
  session,
  isUrgent,
  locale,
  timeZone,
  textAlign,
  rowDirection,
  t,
  onOpen,
}: {
  session: PractitionerSessionListItem;
  isUrgent: boolean;
  locale: string;
  timeZone: string | null;
  textAlign: "left" | "right";
  rowDirection: "row" | "row-reverse";
  t: TFunction;
  onOpen: () => void;
}) {
  const { theme } = useTheme();
  const action = getPractitionerHomeAction(session);
  const actionLabel = getActionLabel(action, t);
  const status = session.operational?.state ?? session.status;
  const statusLabel = t(`practitioner.sessionStatus.${status}`, {
    defaultValue: t("practitioner.home.sessionStatusFallback"),
  });
  const sessionTime = session.scheduledStartAt
    ? formatPractitionerTime(session.scheduledStartAt, timeZone, {
        locale,
        hour: "numeric",
        minute: "2-digit",
      })
    : t("common.notAvailable");
  const duration = t("practitioner.home.duration", { count: session.durationMinutes });

  return (
    <Card
      variant="elevated"
      padding="sm"
      style={[
        styles.primarySession,
        { borderColor: isUrgent ? theme.colors.warning : theme.colors.primary },
      ]}
      testID="practitioner-home-primary-session"
    >
      <View style={[styles.sessionHeader, { flexDirection: rowDirection }]}>
        <View style={styles.sessionHeaderCopy}>
          <Text
            color={theme.colors.primary}
            weight="700"
            style={[styles.eyebrow, { textAlign }]}
          >
            {isUrgent
              ? t("practitioner.home.actionRequired")
              : t("practitioner.home.nextSession")}
          </Text>
          <Text weight="700" style={[styles.sessionTime, { textAlign }]}>
            {sessionTime}
          </Text>
        </View>
        <StatusChip
          label={statusLabel}
          tone={mapSessionBadge(status)}
          showDot={false}
        />
      </View>

      <View style={[styles.sessionDetails, { flexDirection: rowDirection }]}>
        <View style={[styles.patientIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="person-outline" size={19} color={theme.colors.primary} />
        </View>
        <View style={styles.sessionCopy}>
          <Text weight="700" style={[styles.patientName, { textAlign }]} numberOfLines={1}>
            {session.patient?.displayName ?? t("practitioner.home.unknownPatient")}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.duration, { textAlign }]}>
            {duration}
          </Text>
        </View>
      </View>

      <Button
        title={actionLabel}
        onPress={onOpen}
        variant="primary"
        style={styles.primaryAction}
        accessibilityLabel={actionLabel}
      />
    </Card>
  );
}

function UrgentActionRow({
  session,
  textAlign,
  rowDirection,
  t,
  onOpen,
}: {
  session: PractitionerSessionListItem;
  textAlign: "left" | "right";
  rowDirection: "row" | "row-reverse";
  t: TFunction;
  onOpen: () => void;
}) {
  const { theme } = useTheme();
  const { chevronForward } = useAppDirection();
  const action = getPractitionerHomeAction(session);

  return (
    <TouchableOpacity
      style={[styles.urgentRow, { flexDirection: rowDirection, borderColor: theme.colors.warning }]}
      onPress={onOpen}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={t("practitioner.home.actionRequired")}
    >
      <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
      <View style={styles.urgentCopy}>
        <Text weight="700" style={[styles.urgentTitle, { textAlign }]}>
          {t("practitioner.home.actionRequired")}
        </Text>
        <Text color={theme.colors.textSecondary} style={[styles.urgentBody, { textAlign }]}>
          {getActionLabel(action, t)}
        </Text>
      </View>
      <Ionicons
        name={chevronForward}
        size={17}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );
}

function AccountAttention({
  isArabic,
  missingRequirements,
  profileStatus,
  textAlign,
  rowDirection,
  onOpenAccount,
}: {
  isArabic: boolean;
  missingRequirements: string[];
  profileStatus: string;
  textAlign: "left" | "right";
  rowDirection: "row" | "row-reverse";
  onOpenAccount: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const title =
    profileStatus === "APPROVED"
      ? t("practitioner.home.accountActionTitle")
      : t("practitioner.home.accountBlockedTitle");

  return (
    <View style={[styles.attention, { borderColor: theme.colors.warning }]}>
      <View style={[styles.attentionHeader, { flexDirection: rowDirection }]}>
        <Ionicons name="information-circle-outline" size={19} color={theme.colors.warning} />
        <Text weight="700" style={[styles.attentionTitle, { textAlign }]}>
          {title}
        </Text>
      </View>
      {missingRequirements.length > 0 ? (
        <Text color={theme.colors.textSecondary} style={[styles.attentionBody, { textAlign }]}>
          {missingRequirements
            .map((item) => practitionerMissingRequirementLabel(item, t) || item)
            .join(isArabic ? "، " : ", ")}
        </Text>
      ) : null}
      <Button
        title={t("practitioner.home.openAccount")}
        onPress={onOpenAccount}
        variant="secondary"
        style={styles.attentionAction}
      />
    </View>
  );
}

function NoUpcomingState({
  textAlign,
  t,
}: {
  textAlign: "left" | "right";
  t: TFunction;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.noUpcoming, { borderColor: theme.colors.borderLight }]} testID="practitioner-home-empty-state">
      <Ionicons name="calendar-clear-outline" size={22} color={theme.colors.textMuted} />
      <Text weight="700" style={[styles.noUpcomingTitle, { textAlign }]}>
        {t("practitioner.home.noUpcomingTitle")}
      </Text>
      <Text color={theme.colors.textSecondary} style={[styles.noUpcomingBody, { textAlign }]}>
        {t("practitioner.home.noUpcomingBody")}
      </Text>
    </View>
  );
}

function TodaySummary({
  count,
  upcomingCount,
  textAlign,
  t,
}: {
  count: number;
  upcomingCount: number;
  textAlign: "left" | "right";
  t: TFunction;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.todaySummary, { borderTopColor: theme.colors.borderLight }]} testID="practitioner-home-today-summary">
      <Text weight="700" style={[styles.todayTitle, { textAlign }]}>
        {t("practitioner.home.today")}
      </Text>
      <Text color={theme.colors.textSecondary} style={[styles.todayBody, { textAlign }]}>
        {t("practitioner.home.todaySummary", { count })}
      </Text>
      {count === 0 && upcomingCount > 0 ? (
        <Text color={theme.colors.textMuted} style={[styles.todayHint, { textAlign }]}>
          {t("practitioner.home.upcomingCount", { count: upcomingCount })}
        </Text>
      ) : null}
    </View>
  );
}

function HomeLoadingState({ message }: { message: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.loadingState}>
      <View style={[styles.loadingLine, styles.loadingLineWide, { backgroundColor: theme.colors.surfaceSecondary }]} />
      <View style={[styles.loadingLine, { backgroundColor: theme.colors.surfaceSecondary }]} />
      <View style={[styles.loadingBlock, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.borderLight }]} />
      <LoadingState message={message} />
    </View>
  );
}

function getActionLabel(
  action: PractitionerHomeAction,
  t: TFunction,
) {
  switch (action) {
    case "join":
      return t("practitioner.home.actions.join");
    case "prepare":
      return t("practitioner.home.actions.prepare");
    case "review":
      return t("practitioner.home.actions.review");
    default:
      return t("practitioner.home.actions.view");
  }
}

function mapSessionBadge(status: SessionStatus) {
  switch (status) {
    case "READY_TO_JOIN":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
    case "PENDING_PRACTITIONER_CONFIRMATION":
      return "warning" as const;
    case "PATIENT_NO_SHOW":
    case "CANCELLED":
    case "EXPIRED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 16,
  },
  greetingBlock: { gap: 3 },
  greeting: { fontSize: 22, lineHeight: 28 },
  date: { fontSize: 13, lineHeight: 18 },
  primarySession: { gap: 12, borderWidth: 1.5 },
  sessionHeader: { alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  sessionHeaderCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 12, lineHeight: 16 },
  sessionTime: { fontSize: 25, lineHeight: 31 },
  sessionDetails: { alignItems: "center", gap: 10 },
  patientIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  sessionCopy: { flex: 1, gap: 2 },
  patientName: { fontSize: 16, lineHeight: 22 },
  duration: { fontSize: 12, lineHeight: 17 },
  primaryAction: { minHeight: 46, borderRadius: 12 },
  urgentRow: { alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 14, padding: 12 },
  urgentCopy: { flex: 1, gap: 2 },
  urgentTitle: { fontSize: 13, lineHeight: 18 },
  urgentBody: { fontSize: 12, lineHeight: 17 },
  attention: { gap: 9, borderWidth: 1, borderRadius: 14, padding: 12 },
  attentionHeader: { alignItems: "center", gap: 7 },
  attentionTitle: { flex: 1, fontSize: 13, lineHeight: 18 },
  attentionBody: { fontSize: 12, lineHeight: 18 },
  attentionAction: { minHeight: 42, borderRadius: 11 },
  noUpcoming: { alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 14, padding: 16 },
  noUpcomingTitle: { fontSize: 14, lineHeight: 19 },
  noUpcomingBody: { fontSize: 12, lineHeight: 18 },
  todaySummary: { gap: 3, borderTopWidth: 1, paddingTop: 14 },
  todayTitle: { fontSize: 15, lineHeight: 20 },
  todayBody: { fontSize: 13, lineHeight: 19 },
  todayHint: { fontSize: 11, lineHeight: 16 },
  inlineState: { marginHorizontal: -12 },
  loadingState: { gap: 14, paddingTop: 24 },
  loadingLine: { height: 14, width: "54%", borderRadius: 7 },
  loadingLineWide: { width: "78%", height: 24, borderRadius: 8 },
  loadingBlock: { height: 190, borderRadius: 18, borderWidth: 1 },
});
