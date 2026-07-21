import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  StatusBadge,
  StatusChip,
  SummaryRow,
  Text,
} from "../../src/components/ui";
import {
  usePractitionerApplicationStatus,
  usePractitionerProfile,
  usePractitionerReadiness,
} from "../../src/features/practitioner/profile/hooks";
import { useMyPresence } from "../../src/features/practitioner/presence/hooks";
import { usePractitionerSessions } from "../../src/features/practitioner/sessions/hooks";
import type { SessionStatus } from "../../src/features/practitioner/sessions/types";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  CompactActionLink,
  CompactSectionHeader,
  resolvePractitionerTone,
  type PractitionerTone,
} from "../../src/features/practitioner/ui/compact";
import {
  formatPractitionerDateTime,
  formatViewerDateTime,
} from "../../src/lib/time-formatting";
import { practitionerMissingRequirementLabel } from "../../src/features/practitioner/profile/utils";
import { useGeneralChatUnreadSummary } from "../../src/features/messages/hooks";
import { usePractitionerUnreadNotificationCount } from "../../src/features/practitioner/notifications/hooks";

export default function PractitionerHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();

  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const applicationQuery = usePractitionerApplicationStatus();
  const presenceQuery = useMyPresence();
  const sessionsQuery = usePractitionerSessions({ limit: 3 });

  // Unread badge queries
  const unreadCountQuery = usePractitionerUnreadNotificationCount({
    enabled: !!user,
  });
  const messagesSummaryQuery = useGeneralChatUnreadSummary("practitioner");

  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const isArabic = i18n.language?.startsWith("ar");
  const textAlign = isArabic ? "right" : "left";
  const rowDirection = isArabic ? "row-reverse" : "row";
  const profileTimeZone = profileQuery.data?.profile?.timezone ?? null;

  const unreadMessages = messagesSummaryQuery.data?.item?.totalUnreadMessages ?? 0;
  const unreadNotifications = unreadCountQuery.data?.item?.unreadCount ?? 0;

  const upcomingItems = useMemo(() => {
    return (sessionsQuery.data?.items ?? []).filter((item) =>
      ["UPCOMING", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
        item.status,
      ),
    );
  }, [sessionsQuery.data?.items]);

  const upcomingSession = useMemo(() => {
    return [...upcomingItems].sort((left, right) => {
      const leftTime = left.scheduledStartAt
        ? new Date(left.scheduledStartAt).getTime()
        : Number.POSITIVE_INFINITY;
      const rightTime = right.scheduledStartAt
        ? new Date(right.scheduledStartAt).getTime()
        : Number.POSITIVE_INFINITY;

      return leftTime - rightTime;
    })[0] ?? null;
  }, [upcomingItems]);

  const presence = presenceQuery.data?.presence;
  const todaySnapshot = useMemo(() => {
    const totalUpcoming = upcomingItems.length;
    const nextStart = upcomingSession?.scheduledStartAt
      ? formatPractitionerDateTime(
          upcomingSession.scheduledStartAt,
          profileTimeZone,
          { locale, fallbackText: "" },
        ) || formatViewerDateTime(upcomingSession.scheduledStartAt, {
          locale,
          fallbackText: "-",
        })
      : t("practitioner.home.noSessions", isArabic ? "لا توجد جلسات" : "No sessions");

    return [
      {
        key: "todaySessions",
        label: t("practitioner.home.metrics.todaySessions", "جلسات اليوم"),
        value: String(totalUpcoming),
        icon: "calendar-outline" as const,
      },
      {
        key: "nextSession",
        label: t("practitioner.home.metrics.nextSession", "الجلسة القادمة"),
        value: upcomingSession ? nextStart : t("common.none", "لا يوجد"),
        icon: "time-outline" as const,
      },
      {
        key: "availability",
        label: t("practitioner.home.metrics.presence", "حضورك"),
        value: presence
          ? t(`practitioner.presence.status.${presence.status}`)
          : t("common.notAvailable", "غير متصل"),
        icon: "eye-outline" as const,
      },
      {
        key: "instantBooking",
        label: t("practitioner.home.metrics.instantBooking", "الحجز الفوري"),
        value: presence?.isInstantBookingEnabled
          ? t("common.enabled", isArabic ? "مفعّل" : "Enabled")
          : t("common.disabled", isArabic ? "معطّل" : "Disabled"),
        icon: "flash-outline" as const,
      },
    ];
  }, [
    locale,
    t,
    upcomingItems.length,
    upcomingSession,
    presence,
    profileTimeZone,
    isArabic,
  ]);

  if (profileQuery.isLoading) {
    return (
      <Screen bg="background" safeArea edges={["top", "left", "right"]}>
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data?.profile) {
    return (
      <Screen bg="background" safeArea edges={["top", "left", "right"]}>
        <ErrorState fullScreen onRetry={profileQuery.refetch} />
      </Screen>
    );
  }

  const profile = profileQuery.data.profile;
  const readiness = readinessQuery.data?.readiness ?? null;
  const application = applicationQuery.data?.application ?? null;
  const approvalBlocked = profile.profileStatus !== "APPROVED";
  const applicationStatus =
    application?.status ?? profile.applicationStatusSummary?.status ?? null;
  const verificationLabel = readiness
    ? readiness.checks.isAccountActive
      ? readiness.checks.isPractitionerOtpVerified
        ? t("practitioner.account.otpVerified", isArabic ? "مؤكد" : "Verified")
        : t("practitioner.account.otpNotVerified", isArabic ? "غير مؤكد" : "Not Verified")
      : t("practitioner.account.accountInactive", isArabic ? "غير نشط" : "Inactive")
    : null;
  const verificationTone = readiness
    ? readiness.checks.isAccountActive
      ? readiness.checks.isPractitionerOtpVerified
        ? "success"
        : "warning"
      : "error"
    : "default";
  const missingRequirements = readiness?.missingRequirements ?? [];
  const isProfileComplete = readiness?.isProfileCompleted ?? profile.isProfileCompleted;
  const workspaceState = readinessQuery.isLoading || applicationQuery.isLoading
    ? "loading"
    : readinessQuery.isError || applicationQuery.isError
      ? "error"
      : "ready";
  const upcomingSessionActionLabel = isJoinableSessionStatus(upcomingSession?.status)
    ? isArabic
      ? "انضم الآن"
      : "Join now"
    : isArabic
      ? "عرض التفاصيل"
      : "View details";
  const todaySnapshotItems = todaySnapshot.map((item) => ({
    ...item,
    tone: snapshotToneForMetric(item.key),
  }));

  return (
    <Screen bg="background" safeArea edges={["left", "right", "bottom"]}>
      {/* Premium Compact Top Header with Brand Logo & Actions */}
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
          {/* Logo on the right (RTL) or left (LTR) */}
          <View style={styles.headerLogoGroup}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          {/* Action icons group: messages, notifications, logout on the opposite side */}
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title & Profile Greeting Row */}
        <View style={styles.titleWrapper}>
          <Text weight="700" style={[styles.mainScrollTitle, { textAlign }]}>
            {isArabic ? "لوحة المختص" : "Practitioner Dashboard"}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.mainScrollSubtitle, { textAlign }]}>
            {isArabic ? "تابع مواعيدك وحالة عملك من مكان واحد" : "Track your appointments and workspace status from one place"}
          </Text>
        </View>

        {/* Borderless Profile Greeting Wrapper */}
        <View style={[styles.greetingWrapper, { flexDirection: rowDirection }]}>
          <View style={styles.greetingTextWrap}>
            <Text color={theme.colors.textSecondary} style={[styles.greetingEyebrow, { textAlign }]}>
              {profile.professionalTitle ?? t("practitioner.home.fallbackTitle", isArabic ? "مختص طبي" : "Medical Specialist")}
            </Text>
            <Text weight="700" style={[styles.greetingName, { textAlign }]} numberOfLines={1}>
              {profile.displayName ?? t("practitioner.home.fallbackName")}
            </Text>
          </View>
          <StatusBadge
            label={t(`practitioner.profileStatus.${profile.profileStatus}`)}
            status={mapProfileBadge(profile.profileStatus)}
          />
        </View>
        {/* Today Snapshot Card - Clean 2x2 Layout */}
        <Card variant="outlined" padding="md" style={styles.snapshotCard}>
          <CompactSectionHeader
            title={t("practitioner.home.todaySnapshot", "لوحة اليوم")}
            subtitle={t("practitioner.home.todaySnapshotSub", "ملخص سريع لحالتك ومواعيدك اليوم")}
          />
          <View style={styles.snapshotGrid}>
            {todaySnapshotItems.map((item) => (
              <MetricChip
                key={item.key}
                label={item.label}
                value={item.value}
                textAlign={textAlign}
                tone={item.tone}
                icon={item.icon}
              />
            ))}
          </View>
        </Card>

        {/* Primary Actionable Next Session Card */}
        <Card variant="outlined" padding="md" style={styles.nextSessionCard}>
          <CompactSectionHeader
            title={t("practitioner.home.upcomingSession.title", "الجلسة القادمة")}
            subtitle={t("practitioner.home.upcomingSession.subtitle", "موعد الجلسة التالي الذي يتطلب انتباهك")}
            action={
              <CompactActionLink
                label={t("practitioner.home.viewAll", isArabic ? "عرض الكل" : "View all")}
                onPress={() => router.push("/(practitioner)/sessions")}
              />
            }
          />

          {upcomingSession ? (
            <View style={styles.nextSessionBody}>
              <View style={[styles.nextSessionInfoRow, { flexDirection: rowDirection }]}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.nextSessionPatientGroup}>
                  <Text weight="700" style={[styles.nextSessionPatient, { textAlign }]}>
                    {upcomingSession.patient?.displayName ??
                      t("practitioner.sessions.unknownPatient", isArabic ? "مريض غير معروف" : "Unknown Patient")}
                  </Text>
                  <View style={[styles.timeRow, { flexDirection: rowDirection }]}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                    <Text color={theme.colors.textSecondary} style={styles.nextSessionTime}>
                      {upcomingSession.scheduledStartAt
                        ? formatPractitionerDateTime(
                            upcomingSession.scheduledStartAt,
                            profileTimeZone,
                            { locale, fallbackText: "" },
                          ) || formatViewerDateTime(upcomingSession.scheduledStartAt, {
                            locale,
                            fallbackText: "-",
                          })
                        : t("practitioner.sessions.noSchedule")}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.nextSessionFooterRow, { flexDirection: rowDirection }]}>
                <StatusChip
                  label={t(`practitioner.sessionStatus.${upcomingSession.status}`)}
                  tone={mapSessionBadge(upcomingSession.status)}
                  showDot={false}
                />
                <Button
                  title={upcomingSessionActionLabel}
                  onPress={() =>
                    router.push(`/(practitioner)/sessions/${upcomingSession.id}`)
                  }
                  variant={isJoinableSessionStatus(upcomingSession.status) ? "primary" : "secondary"}
                  style={styles.sessionActionButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.nextSessionEmpty}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <Ionicons name="calendar-clear-outline" size={28} color={theme.colors.textMuted} />
              </View>
              <Text style={[styles.nextSessionEmptyTitle, { textAlign }]} weight="700">
                {t("practitioner.home.noUpcomingTitle", "لا توجد جلسات قادمة")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.nextSessionEmptyBody, { textAlign }]}>
                {t("practitioner.home.noUpcomingBody", "مواعيدك الحالية فارغة. يمكنك فتح خانات جديدة في جدول التوفر.")}
              </Text>
              <Button
                title={t("practitioner.tab.availability", isArabic ? "تعديل جدول التوفر" : "Update Availability")}
                variant="secondary"
                onPress={() => router.push("/(practitioner)/availability")}
                style={styles.compactButton}
              />
            </View>
          )}
        </Card>

        {/* Shorter Workspace Status Checklist Card */}
        <Card variant="outlined" padding="md" style={styles.workspaceCard}>
          <CompactSectionHeader
            title={t("practitioner.home.workspaceStatus.title", "جاهزية العيادة")}
            subtitle={t("practitioner.home.workspaceStatus.subtitle", "حالة طلب الانضمام والمستندات المطلوبة")}
            action={
              <CompactActionLink
                label={t("practitioner.home.workspaceStatus.openAccount", isArabic ? "التفاصيل" : "Details")}
                onPress={() => router.push("/(practitioner)/account")}
              />
            }
          />
          {workspaceState === "loading" ? (
            <LoadingState />
          ) : workspaceState === "error" ? (
            <ErrorState
              onRetry={() => {
                readinessQuery.refetch();
                applicationQuery.refetch();
              }}
            />
          ) : (
            <View style={styles.workspaceBody}>
              <View style={styles.workspaceRows}>
                <SummaryRow
                  label={t("practitioner.home.workspaceStatus.application", isArabic ? "حالة طلب الانضمام" : "Application Status")}
                  value={
                    <StatusChip
                      label={
                        applicationStatus
                          ? t(`practitioner.account.applicationStatuses.${applicationStatus}`, applicationStatus)
                          : t("practitioner.account.applicationStatuses.NONE", isArabic ? "لا يوجد" : "None")
                      }
                      tone={mapApplicationSummaryTone(applicationStatus)}
                      showDot={false}
                    />
                  }
                />
                {verificationLabel ? (
                  <SummaryRow
                    label={t("practitioner.home.workspaceStatus.verification", isArabic ? "التحقق من رقم الهاتف" : "Phone Verification")}
                    value={<StatusChip label={verificationLabel} tone={verificationTone} showDot={false} />}
                  />
                ) : null}
                <SummaryRow
                  label={t("practitioner.home.workspaceStatus.profileCompleteness", isArabic ? "اكتمال الملف التعريفي" : "Profile Completeness")}
                  value={
                    <StatusChip
                      label={
                        isProfileComplete
                          ? t("practitioner.account.readiness.complete", isArabic ? "مكتمل" : "Complete")
                          : t("practitioner.account.readiness.incomplete", isArabic ? "غير مكتمل" : "Incomplete")
                      }
                      tone={isProfileComplete ? "success" : "warning"}
                      showDot={false}
                    />
                  }
                />
              </View>
              {missingRequirements.length ? (
                <View style={styles.missingBlock}>
                  <Text weight="700" style={[styles.missingTitle, { textAlign }]} color={theme.colors.textSecondary}>
                    {t("practitioner.home.workspaceStatus.missingSteps", isArabic ? "الخطوات المطلوبة للتفعيل:" : "Steps required for activation:")}
                  </Text>
                  <View style={styles.missingList}>
                    {missingRequirements.slice(0, 4).map((item) => (
                      <View key={item} style={[styles.requirementRow, { flexDirection: rowDirection }]}>
                        <Ionicons name="alert-circle-outline" size={15} color={theme.colors.warning} />
                        <Text color={theme.colors.textSecondary} style={styles.requirementText}>
                          {practitionerMissingRequirementLabel(item, t) || formatRequirementLabel(item)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </Card>

        {/* Visually Calmer Instant Booking Card */}
        <Card variant="outlined" padding="md" style={styles.instantBookingCard}>
          <View style={[styles.instantBookingHeader, { flexDirection: rowDirection }]}>
            <View style={styles.instantBookingTitleGroup}>
              <Text weight="700" style={[styles.instantBookingTitle, { textAlign }]}>
                {t("instantBooking.practitioner.home.title", isArabic ? "الحجز الفوري" : "Instant Booking")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.instantBookingSubtitle, { textAlign }]}>
                {t("instantBooking.practitioner.home.subtitle", isArabic ? "استقبال الحجوزات دون موافقة مسبقة" : "Receive client bookings automatically")}
              </Text>
            </View>
            <StatusChip
              label={
                presence?.isInstantBookingEnabled
                  ? t("instantBooking.practitioner.home.enabled", isArabic ? "مفعّل" : "Active")
                  : t("instantBooking.practitioner.home.disabled", isArabic ? "معطّل" : "Inactive")
              }
              tone={presence?.isInstantBookingEnabled ? "success" : "warning"}
              showDot={false}
            />
          </View>

          <View style={styles.instantBookingBody}>
            <View style={[styles.instantBookingNote, { flexDirection: rowDirection }]}>
              <Ionicons
                name={presence?.isInstantBookingEnabled ? "flash-outline" : "flash-off-outline"}
                size={16}
                color={presence?.isInstantBookingEnabled ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text color={theme.colors.textSecondary} style={[styles.instantBookingText, { textAlign }]}>
                {presence?.isInstantBookingEnabled
                  ? t("instantBooking.practitioner.home.enabledNote", isArabic ? "يتم تأكيد حجوزات المرضى المباشرة فوراً." : "Patient appointments are confirmed instantly.")
                  : t("instantBooking.practitioner.home.disabledNote", isArabic ? "يجب تأكيد الحجوزات يدوياً من قائمة طلبات الحجز." : "Appointments require manual approval.")}
              </Text>
            </View>

            <Button
              title={t("instantBooking.practitioner.home.cta", isArabic ? "إدارة إعدادات الحجز" : "Manage Settings")}
              variant="secondary"
              onPress={() => router.push("/(practitioner)/instant-booking")}
              style={styles.instantBookingAction}
            />
          </View>
        </Card>

        {approvalBlocked ? (
          <Card variant="flat" padding="md" style={[styles.noticeCard, { backgroundColor: theme.colors.statusWarningBg }]}>
            <View style={[styles.noticeHeader, { flexDirection: rowDirection }]}>
              <Ionicons name="information-circle" size={18} color={theme.colors.statusWarningText} />
              <Text weight="700" style={[styles.noticeTitle, { color: theme.colors.statusWarningText, textAlign }]}>
                {t("practitioner.home.approvalNotice.title", isArabic ? "حسابك قيد المراجعة" : "Account Under Review")}
              </Text>
            </View>
            <Text color={theme.colors.statusWarningText} style={[styles.noticeBody, { textAlign }]}>
              {t("practitioner.home.approvalNotice.body", isArabic ? "طلبك قيد الدراسة حالياً من قبل فريق المراجعة الطبي. سنقوم بإبلاغك بمجرد التنشيط." : "Your application is currently being audited by our medical board. We will notify you once active.")}
            </Text>
          </Card>
        ) : null}

        {/* Quick Access Tools Grid */}
        <Card variant="outlined" padding="md" style={styles.quickAccessCard}>
          <CompactSectionHeader
            title={t("practitioner.home.quickAccess", isArabic ? "الوصول السريع" : "Quick Access")}
          />
          <View style={styles.quickGridContainer}>
            <View style={styles.quickGridRow}>
              <QuickAccessCard
                icon="calendar-outline"
                label={t("practitioner.tab.sessions")}
                tone="daily"
                onPress={() => router.push("/(practitioner)/sessions")}
              />
              <QuickAccessCard
                icon="time-outline"
                label={t("practitioner.tab.availability")}
                tone="info"
                onPress={() => router.push("/(practitioner)/availability")}
              />
            </View>
            <View style={styles.quickGridRow}>
              <QuickAccessCard
                icon="chatbubbles-outline"
                label={t("messages.inbox.title")}
                tone="messages"
                onPress={() => router.push("/(practitioner)/messages")}
              />
              <QuickAccessCard
                icon="headset-outline"
                label={t("practitioner.support.quickAccess", isArabic ? "الدعم الفني" : "Help & Support")}
                tone="support"
                onPress={() =>
                  router.push({
                    pathname: "/(practitioner)/support",
                    params: { returnTo: pathname },
                  } as any)
                }
              />
            </View>
            <View style={styles.quickGridRow}>
              <QuickAccessCard
                icon="person-outline"
                label={t("practitioner.account.quickAccess", isArabic ? "الملف الشخصي" : "Profile")}
                tone="account"
                onPress={() => router.push("/(practitioner)/account")}
              />
              <QuickAccessCard
                icon="cash-outline"
                label={t("practitioner.finance.quickAccess", isArabic ? "المالية والجريدة" : "Wallet & Ledger")}
                tone="finance"
                onPress={() => router.push("/(practitioner)/finance")}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function MetricChip({
  label,
  value,
  textAlign,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  textAlign: "left" | "right";
  tone?: PractitionerTone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <View
      style={[
        styles.metricChip,
        {
          backgroundColor: palette.iconBackground,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={[styles.metricHeaderRow, { flexDirection: textAlign === "right" ? "row-reverse" : "row" }]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={14}
            color={palette.iconColor}
            style={textAlign === "right" ? { marginLeft: 4 } : { marginRight: 4 }}
          />
        ) : null}
        <Text color={theme.colors.textSecondary} style={[styles.metricLabel, { textAlign }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text weight="700" style={[styles.metricValue, { textAlign, color: theme.colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function QuickAccessCard({
  icon,
  label,
  tone = "neutral",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: PractitionerTone;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <TouchableOpacity
      style={[
        styles.quickCard,
        { borderColor: palette.border, backgroundColor: palette.surface },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: palette.iconBackground }]}>
        <Ionicons name={icon} size={18} color={palette.iconColor} />
      </View>
      <Text weight="600" style={styles.quickCardLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function snapshotToneForMetric(key: string): PractitionerTone {
  switch (key) {
    case "todaySessions":
      return "daily";
    case "nextSession":
      return "info";
    case "availability":
      return "success";
    case "instantBooking":
      return "warning";
    default:
      return "neutral";
  }
}

function mapProfileBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return "success" as const;
    case "PENDING_REVIEW":
      return "warning" as const;
    case "REJECTED":
    case "SUSPENDED":
    case "INACTIVE":
      return "error" as const;
    default:
      return "default" as const;
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

function isJoinableSessionStatus(status: SessionStatus | null | undefined) {
  return status === "READY_TO_JOIN" || status === "IN_PROGRESS";
}

function mapApplicationSummaryTone(status: string | null | undefined) {
  switch (status) {
    case "APPROVED":
      return "success" as const;
    case "SUBMITTED":
    case "PENDING_REVIEW":
    case "UNDER_REVIEW":
    case "CHANGES_REQUESTED":
      return "warning" as const;
    case "REJECTED":
    case "ARCHIVED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function formatRequirementLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  greetingWrapper: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 4,
    width: "100%",
  },
  greetingTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  greetingEyebrow: {
    fontSize: 12,
    lineHeight: 16,
  },
  greetingName: {
    fontSize: 22,
    lineHeight: 28,
  },
  snapshotCard: {
    gap: 12,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  metricChip: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 64,
    justifyContent: "center",
    borderWidth: 1,
  },
  metricHeaderRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  metricIcon: {},
  metricLabel: {
    fontSize: 11,
    flex: 1,
  },
  metricValue: {
    fontSize: 13,
  },
  nextSessionCard: {
    gap: 12,
  },
  nextSessionBody: {
    gap: 12,
    paddingTop: 4,
  },
  nextSessionInfoRow: {
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  nextSessionPatientGroup: {
    flex: 1,
    gap: 2,
  },
  nextSessionPatient: {
    fontSize: 16,
  },
  timeRow: {
    alignItems: "center",
    gap: 4,
  },
  nextSessionTime: {
    fontSize: 12,
    lineHeight: 16,
  },
  nextSessionFooterRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  sessionActionButton: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 10,
  },
  nextSessionEmpty: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  nextSessionEmptyTitle: {
    fontSize: 14,
  },
  nextSessionEmptyBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  compactButton: {
    width: "100%",
    minHeight: 42,
    borderRadius: 10,
  },
  workspaceCard: {
    gap: 12,
  },
  workspaceBody: {
    gap: 12,
  },
  workspaceRows: {
    gap: 4,
  },
  missingBlock: {
    gap: 8,
    borderTopWidth: 1,
    borderColor: "#E8DED0",
    paddingTop: 12,
    marginTop: 4,
  },
  missingTitle: {
    fontSize: 12,
  },
  missingList: {
    gap: 6,
  },
  requirementRow: {
    alignItems: "center",
    gap: 6,
  },
  requirementText: {
    fontSize: 12,
    flex: 1,
  },
  instantBookingCard: {
    gap: 12,
  },
  instantBookingHeader: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  instantBookingTitleGroup: {
    flex: 1,
    gap: 2,
  },
  instantBookingTitle: {
    fontSize: 15,
  },
  instantBookingSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  instantBookingBody: {
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#E8DED0",
    paddingTop: 12,
  },
  instantBookingNote: {
    alignItems: "flex-start",
    gap: 6,
  },
  instantBookingText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  instantBookingAction: {
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 10,
  },
  noticeCard: {
    flexDirection: "column",
    borderRadius: 14,
    gap: 6,
  },
  noticeHeader: {
    alignItems: "center",
    gap: 6,
  },
  noticeTitle: {
    fontSize: 13,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  quickAccessCard: {
    gap: 12,
  },
  quickGridContainer: {
    gap: 8,
    paddingTop: 4,
  },
  quickGridRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 74,
  },
  quickCardLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
