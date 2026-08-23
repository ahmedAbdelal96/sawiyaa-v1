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
import { useMyPresence } from "../../src/features/practitioner/presence/hooks";
import { usePractitionerWalletSummary } from "../../src/features/practitioner/finance/hooks";
import { useMyAvailabilityWeeks } from "../../src/features/practitioner/availability/hooks";
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
  shouldShowPractitionerHomeAccountAttention,
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
  const { chevronForward } = useAppDirection();

  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const sessionsQuery = usePractitionerSessions({ limit: 20 });
  const presenceQuery = useMyPresence();
  const walletQuery = usePractitionerWalletSummary();
  const availabilityQuery = useMyAvailabilityWeeks();

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
  const missingRequirements = readiness?.publicationMissingRequirements ?? [];
  const profileNeedsAttention = shouldShowPractitionerHomeAccountAttention({
    profileStatus: profile.profileStatus,
    canPublish: readiness?.canPublish,
  });
  const displayName = profile.displayName?.trim() || t("practitioner.home.fallbackName");
  const todayLabel = formatPractitionerDate(new Date(), timeZone, {
    locale,
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const presenceStatus = presenceQuery.data?.presence?.status ?? "OFFLINE";
  const isInstantBookingOn = presenceQuery.data?.presence?.isInstantBookingEnabled ?? false;
  const walletSummary = walletQuery.data?.summary;
  const availableBalance = walletSummary
    ? `${walletSummary.availableBalance.toFixed(0)} ${walletSummary.currency === "USD" ? "$" : "ج.م"}`
    : `0 ${isArabic ? "ج.م" : "EGP"}`;

  const currentWeek = availabilityQuery.data?.weeks?.find((w) => w.isCurrentWeek);
  const totalSlotsThisWeek =
    (currentWeek?.slotCount30Minutes ?? 0) + (currentWeek?.slotCount60Minutes ?? 0);

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
        {/* 1. Hero Greeting & Readiness Badge */}
        <View style={styles.heroSection}>
          <View style={[styles.greetingRow, { flexDirection: rowDirection }]}>
            <View style={styles.greetingCopy}>
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

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/instant-booking")}
              style={[
                styles.presencePill,
                {
                  flexDirection: rowDirection,
                  backgroundColor:
                    presenceStatus === "ONLINE"
                      ? theme.colors.surfaceSecondary
                      : theme.colors.surfaceSecondary,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.presenceDot,
                  {
                    backgroundColor:
                      presenceStatus === "ONLINE"
                        ? theme.colors.success
                        : presenceStatus === "AWAY"
                          ? theme.colors.warning
                          : presenceStatus === "BUSY"
                            ? theme.colors.error
                            : theme.colors.textMuted,
                  },
                ]}
              />
              <Text weight="600" style={styles.presenceText}>
                {presenceStatus === "ONLINE"
                  ? t("practitioner.home.presenceStatus.online")
                  : presenceStatus === "AWAY"
                    ? t("practitioner.home.presenceStatus.away")
                    : presenceStatus === "BUSY"
                      ? t("practitioner.home.presenceStatus.busy")
                      : t("practitioner.home.presenceStatus.offline")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Urgent Attention Alert if needed */}
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

        {urgentSession && urgentSession.id !== nextSession?.id ? (
          <UrgentActionRow
            session={urgentSession}
            textAlign={textAlign}
            rowDirection={rowDirection}
            t={t}
            onOpen={() => router.push(`/(practitioner)/sessions/${urgentSession.id}`)}
          />
        ) : null}

        {/* 3. Daily Pulse & Quick KPI Metrics Grid (2x2) */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Today's Sessions */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(practitioner)/sessions")}
            style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
          >
            <View style={[styles.metricTopRow, { flexDirection: rowDirection }]}>
              <View style={[styles.metricIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={17} color={theme.colors.primary} />
              </View>
              <Text weight="700" style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                {todaySessionCount}
              </Text>
            </View>
            <Text weight="700" style={[styles.metricTitle, { textAlign }]}>
              {t("practitioner.home.stats.today")}
            </Text>
            <Text color={theme.colors.textMuted} style={[styles.metricSubtitle, { textAlign }]}>
              {todaySessionCount > 0
                ? t("practitioner.home.todaySummary", { count: todaySessionCount })
                : t("practitioner.home.stats.todaySubtitle")}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Upcoming Bookings */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(practitioner)/sessions")}
            style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
          >
            <View style={[styles.metricTopRow, { flexDirection: rowDirection }]}>
              <View style={[styles.metricIconBox, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="time-outline" size={17} color="#0284C7" />
              </View>
              <Text weight="700" style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                {upcomingSessions.length}
              </Text>
            </View>
            <Text weight="700" style={[styles.metricTitle, { textAlign }]}>
              {t("practitioner.home.stats.upcoming")}
            </Text>
            <Text color={theme.colors.textMuted} style={[styles.metricSubtitle, { textAlign }]}>
              {t("practitioner.home.stats.upcomingSubtitle")}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Wallet & Earnings */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(practitioner)/finance")}
            style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
          >
            <View style={[styles.metricTopRow, { flexDirection: rowDirection }]}>
              <View style={[styles.metricIconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="wallet-outline" size={17} color="#16A34A" />
              </View>
              <Text weight="700" style={[styles.metricValueSm, { color: theme.colors.textPrimary }]}>
                {availableBalance}
              </Text>
            </View>
            <Text weight="700" style={[styles.metricTitle, { textAlign }]}>
              {t("practitioner.home.stats.wallet")}
            </Text>
            <Text color={theme.colors.textMuted} style={[styles.metricSubtitle, { textAlign }]}>
              {t("practitioner.home.stats.walletSubtitle")}
            </Text>
          </TouchableOpacity>

          {/* Card 4: Schedule / Slots */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(practitioner)/availability")}
            style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
          >
            <View style={[styles.metricTopRow, { flexDirection: rowDirection }]}>
              <View style={[styles.metricIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="layers-outline" size={17} color="#D97706" />
              </View>
              <Text weight="700" style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                {totalSlotsThisWeek}
              </Text>
            </View>
            <Text weight="700" style={[styles.metricTitle, { textAlign }]}>
              {t("practitioner.home.stats.schedule")}
            </Text>
            <Text color={theme.colors.textMuted} style={[styles.metricSubtitle, { textAlign }]}>
              {totalSlotsThisWeek > 0
                ? `${totalSlotsThisWeek} ${isArabic ? "موعد نشط" : "active slots"}`
                : t("practitioner.home.stats.scheduleSubtitle")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Primary Highlight Session / Actionable Empty State */}
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
          <EmptyScheduleHeroCard
            textAlign={textAlign}
            rowDirection={rowDirection}
            t={t}
            isInstantBookingOn={isInstantBookingOn}
            onManageSchedule={() => router.push("/(practitioner)/availability")}
            onInstantSettings={() => router.push("/(practitioner)/instant-booking")}
          />
        )}

        {/* 5. Quick Shortcuts & Control Center */}
        <View style={styles.shortcutsSection}>
          <Text weight="700" style={[styles.sectionTitle, { textAlign }]}>
            {t("practitioner.home.shortcuts.title")}
          </Text>

          <View style={styles.shortcutsGrid}>
            {/* Shortcut 1: Schedule Management */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/availability")}
              style={[styles.shortcutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={19} color={theme.colors.primary} />
              </View>
              <View style={styles.shortcutCopy}>
                <Text weight="700" style={[styles.shortcutName, { textAlign }]}>
                  {t("practitioner.home.shortcuts.schedule")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.shortcutDesc, { textAlign }]}>
                  {t("practitioner.home.shortcuts.scheduleSub")}
                </Text>
              </View>
              <Ionicons name={chevronForward} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Shortcut 2: Messages */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/messages")}
              style={[styles.shortcutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="chatbubbles-outline" size={19} color="#0284C7" />
              </View>
              <View style={styles.shortcutCopy}>
                <Text weight="700" style={[styles.shortcutName, { textAlign }]}>
                  {t("practitioner.home.shortcuts.messages")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.shortcutDesc, { textAlign }]}>
                  {t("practitioner.home.shortcuts.messagesSub")}
                </Text>
              </View>
              <Ionicons name={chevronForward} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Shortcut 3: Instant Booking */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/instant-booking")}
              style={[styles.shortcutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="flash-outline" size={19} color="#D97706" />
              </View>
              <View style={styles.shortcutCopy}>
                <Text weight="700" style={[styles.shortcutName, { textAlign }]}>
                  {t("practitioner.home.shortcuts.instant")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.shortcutDesc, { textAlign }]}>
                  {t("practitioner.home.shortcuts.instantSub")}
                </Text>
              </View>
              <Ionicons name={chevronForward} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Shortcut 4: Finance */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/finance")}
              style={[styles.shortcutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="cash-outline" size={19} color="#16A34A" />
              </View>
              <View style={styles.shortcutCopy}>
                <Text weight="700" style={[styles.shortcutName, { textAlign }]}>
                  {t("practitioner.home.shortcuts.finance")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.shortcutDesc, { textAlign }]}>
                  {t("practitioner.home.shortcuts.financeSub")}
                </Text>
              </View>
              <Ionicons name={chevronForward} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Shortcut 5: Promo Codes */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/promo-codes")}
              style={[styles.shortcutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#F3E8FF" }]}>
                <Ionicons name="pricetag-outline" size={19} color="#9333EA" />
              </View>
              <View style={styles.shortcutCopy}>
                <Text weight="700" style={[styles.shortcutName, { textAlign }]}>
                  {t("practitioner.home.shortcuts.promoCodes")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.shortcutDesc, { textAlign }]}>
                  {t("practitioner.home.shortcuts.promoCodesSub")}
                </Text>
              </View>
              <Ionicons name={chevronForward} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Shortcut 6: Support & Help */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(practitioner)/support")}
              style={[styles.shortcutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: "#F1F5F9" }]}>
                <Ionicons name="headset-outline" size={19} color="#475569" />
              </View>
              <View style={styles.shortcutCopy}>
                <Text weight="700" style={[styles.shortcutName, { textAlign }]}>
                  {t("practitioner.home.shortcuts.support")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.shortcutDesc, { textAlign }]}>
                  {t("practitioner.home.shortcuts.supportSub")}
                </Text>
              </View>
              <Ionicons name={chevronForward} size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
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

function EmptyScheduleHeroCard({
  textAlign,
  rowDirection,
  t,
  isInstantBookingOn,
  onManageSchedule,
  onInstantSettings,
}: {
  textAlign: "left" | "right";
  rowDirection: "row" | "row-reverse";
  t: TFunction;
  isInstantBookingOn: boolean;
  onManageSchedule: () => void;
  onInstantSettings: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.emptyHeroCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
      ]}
      testID="practitioner-home-empty-state"
    >
      <View style={[styles.emptyHeroHeader, { flexDirection: rowDirection }]}>
        <View style={[styles.emptyHeroIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="calendar" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.emptyHeroCopy}>
          <Text weight="700" style={[styles.emptyHeroTitle, { textAlign }]}>
            {t("practitioner.home.noUpcomingTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.emptyHeroBody, { textAlign }]}>
            {t("practitioner.home.emptyState.title", {
              defaultValue: t("practitioner.home.noUpcomingBody"),
            })}
          </Text>
        </View>
      </View>

      <View style={styles.emptyHeroActions}>
        <Button
          title={t("practitioner.home.emptyState.action")}
          onPress={onManageSchedule}
          variant="primary"
          style={styles.heroButton}
          icon={<Ionicons name="add-circle-outline" size={17} color="#FFFFFF" />}
        />
      </View>
    </View>
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
    paddingTop: 16,
    gap: 16,
  },
  heroSection: {
    gap: 4,
  },
  greetingRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  greetingCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 20,
    lineHeight: 26,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
  presencePill: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  presenceText: {
    fontSize: 11,
    lineHeight: 15,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48.3%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  metricTopRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 19,
    lineHeight: 24,
  },
  metricValueSm: {
    fontSize: 15,
    lineHeight: 20,
  },
  metricTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  primarySession: {
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 18,
  },
  sessionHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sessionHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
  },
  sessionTime: {
    fontSize: 24,
    lineHeight: 30,
  },
  sessionDetails: {
    alignItems: "center",
    gap: 10,
  },
  patientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCopy: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 15,
    lineHeight: 20,
  },
  duration: {
    fontSize: 12,
    lineHeight: 16,
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: 12,
  },
  emptyHeroCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  emptyHeroHeader: {
    alignItems: "center",
    gap: 12,
  },
  emptyHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHeroCopy: {
    flex: 1,
    gap: 2,
  },
  emptyHeroTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  emptyHeroBody: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  emptyHeroActions: {
    gap: 8,
  },
  heroButton: {
    minHeight: 42,
    borderRadius: 12,
  },
  shortcutsSection: {
    gap: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  shortcutsGrid: {
    gap: 8,
  },
  shortcutCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutCopy: {
    flex: 1,
    gap: 1,
  },
  shortcutName: {
    fontSize: 13,
    lineHeight: 17,
  },
  shortcutDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  urgentRow: {
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  urgentCopy: {
    flex: 1,
    gap: 2,
  },
  urgentTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  urgentBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  attention: {
    gap: 9,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  attentionHeader: {
    alignItems: "center",
    gap: 7,
  },
  attentionTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  attentionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  attentionAction: {
    minHeight: 42,
    borderRadius: 11,
  },
  inlineState: {
    marginHorizontal: -12,
  },
  loadingState: {
    gap: 14,
    paddingTop: 24,
  },
  loadingLine: {
    height: 14,
    width: "54%",
    borderRadius: 7,
  },
  loadingLineWide: {
    width: "78%",
    height: 24,
    borderRadius: 8,
  },
  loadingBlock: {
    height: 190,
    borderRadius: 18,
    borderWidth: 1,
  },
});
