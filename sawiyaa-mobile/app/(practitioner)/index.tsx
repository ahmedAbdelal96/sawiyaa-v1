import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  CompactActionRow,
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

export default function PractitionerHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { signOut } = useAuth();

  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const applicationQuery = usePractitionerApplicationStatus();
  const presenceQuery = useMyPresence();
  const sessionsQuery = usePractitionerSessions({ limit: 3 });

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isArabic = i18n.language?.startsWith("ar");
  const textAlign = isArabic ? "right" : "left";
  const profileTimeZone = profileQuery.data?.profile?.timezone ?? null;

  const upcomingItems = useMemo(() => {
    return (sessionsQuery.data?.items ?? []).filter((item) =>
      ["CONFIRMED", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
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
      : t("practitioner.home.noSessions");

    return [
      {
        key: "todaySessions",
        label: t("practitioner.home.metrics.todaySessions", "جلسات اليوم"),
        value: String(totalUpcoming),
      },
      {
        key: "nextSession",
        label: t("practitioner.home.metrics.nextSession", "الجلسة القادمة"),
        value: upcomingSession ? nextStart : t("common.none", "لا يوجد"),
      },
      {
        key: "availability",
        label: t("practitioner.home.metrics.presence", "حالة التوفر"),
        value: presence
          ? t(`practitioner.presence.status.${presence.status}`)
          : t("common.notAvailable", "غير متاح"),
      },
      {
        key: "instantBooking",
        label: t("practitioner.home.metrics.instantBooking", "الحجز الفوري"),
        value: presence?.isInstantBookingEnabled
          ? t("common.enabled")
          : t("common.disabled"),
      },
    ];
  }, [
    locale,
    t,
    upcomingItems.length,
    upcomingSession,
    presence,
    profileTimeZone,
  ]);

  if (profileQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.home.title")} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data?.profile) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.home.title")} />
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
        ? t("practitioner.account.otpVerified")
        : t("practitioner.account.otpNotVerified")
      : t("practitioner.account.accountInactive")
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
    <Screen bg="background">
      <Header
        title={t("practitioner.home.title")}
        rightElement={
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="sm" style={styles.welcomeCard}>
          <View style={styles.welcomeTopRow}>
            <View style={styles.welcomeTextWrap}>
              <Text
                weight="600"
                style={[styles.welcomeTitle, { textAlign }]}
                numberOfLines={1}
              >
                {profile.displayName ?? t("practitioner.home.fallbackName")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={[styles.welcomeSubtitle, { textAlign }]}
                numberOfLines={1}
              >
                {profile.professionalTitle ??
                  t("practitioner.home.fallbackTitle")}
              </Text>
            </View>
            <StatusBadge
              label={t(`practitioner.profileStatus.${profile.profileStatus}`)}
              status={mapProfileBadge(profile.profileStatus)}
            />
          </View>

          <Text color={theme.colors.textSecondary} style={[styles.welcomeHint, { textAlign }]}>
            {t(
              "practitioner.home.compactHint",
              "راجع مواعيدك وحالة العمل بسرعة من لوحة اليوم.",
            )}
          </Text>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.snapshotCard}>
          <CompactSectionHeader
            title={t("practitioner.home.todaySnapshot", "لقطة اليوم")}
            subtitle={t("practitioner.home.todaySnapshotSub", "ملخص سريع قبل بدء يومك")}
          />
          <View style={styles.snapshotGrid}>
            {todaySnapshotItems.map((item) => (
              <MetricChip
                key={item.key}
                label={item.label}
                value={item.value}
                textAlign={textAlign}
                tone={item.tone}
              />
            ))}
          </View>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.nextSessionCard}>
          <CompactSectionHeader
            title={t("practitioner.home.upcomingSession.title", "الجلسة القادمة")}
            subtitle={t("practitioner.home.upcomingSession.subtitle", "أقرب موعد يحتاج انتباهك")}
            action={
              <CompactActionLink
                label={t("practitioner.home.viewAll")}
                onPress={() => router.push("/(practitioner)/sessions")}
              />
            }
          />

          {upcomingSession ? (
            <>
              <Text weight="600" style={[styles.nextSessionPatient, { textAlign }]}>
                {upcomingSession.patient?.displayName ??
                  t("practitioner.sessions.unknownPatient")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.nextSessionTime, { textAlign }]}>
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
              <View style={styles.nextSessionMetaRow}>
                <StatusChip
                  label={t(`practitioner.sessionStatus.${upcomingSession.status}`)}
                  tone={mapSessionBadge(upcomingSession.status)}
                  showDot={false}
                />
              </View>
              <CompactActionRow
                label={upcomingSessionActionLabel}
                onPress={() =>
                  router.push(`/(practitioner)/sessions/${upcomingSession.id}`)
                }
                accessibilityLabel={upcomingSessionActionLabel}
                style={styles.nextSessionCta}
              />
            </>
          ) : (
            <View style={styles.nextSessionEmpty}>
              <Text style={[styles.nextSessionEmptyTitle, { textAlign }]} weight="600">
                {t("practitioner.home.noUpcomingTitle", "لا توجد جلسات قادمة حاليًا")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.nextSessionEmptyBody, { textAlign }]}>
                {t("practitioner.home.noUpcomingBody", "يمكنك تحديث التوفر لاستقبال حجوزات جديدة.")}
              </Text>
              <Button
                title={t("practitioner.tab.availability")}
                variant="secondary"
                onPress={() => router.push("/(practitioner)/availability")}
                style={styles.compactButton}
              />
            </View>
          )}
        </Card>

        <Card variant="outlined" padding="sm" style={styles.workspaceCard}>
          <CompactSectionHeader
            title={t("practitioner.home.workspaceStatus.title")}
            subtitle={t("practitioner.home.workspaceStatus.subtitle")}
            action={
              <CompactActionLink
                label={t("practitioner.home.workspaceStatus.openAccount")}
                onPress={() => router.push("/(practitioner)/account")}
              />
            }
          />
          {workspaceState === "loading" ? (
            <LoadingState />
          ) : workspaceState === "error" ? (
            <ErrorState onRetry={() => {
              readinessQuery.refetch();
              applicationQuery.refetch();
            }} />
          ) : (
            <>
              <View style={styles.workspaceRows}>
                <SummaryRow
                  label={t("practitioner.home.workspaceStatus.application")}
                  value={
                    <StatusChip
                      label={
                        applicationStatus
                          ? t(`practitioner.account.applicationStatuses.${applicationStatus}`, applicationStatus)
                          : t("practitioner.account.applicationStatuses.NONE")
                      }
                      tone={mapApplicationSummaryTone(applicationStatus)}
                      showDot={false}
                    />
                  }
                />
                {verificationLabel ? (
                  <SummaryRow
                    label={t("practitioner.home.workspaceStatus.verification")}
                    value={<StatusChip label={verificationLabel} tone={verificationTone} showDot={false} />}
                  />
                ) : null}
                <SummaryRow
                  label={t("practitioner.home.workspaceStatus.profileCompleteness")}
                  value={
                    <StatusChip
                      label={
                        isProfileComplete
                          ? t("practitioner.account.readiness.complete")
                          : t("practitioner.account.readiness.incomplete")
                      }
                      tone={isProfileComplete ? "success" : "warning"}
                      showDot={false}
                    />
                  }
                />
              </View>
              {missingRequirements.length ? (
                <View style={styles.missingBlock}>
                  <Text weight="600" style={[styles.missingTitle, { textAlign }]} color={theme.colors.textSecondary}>
                    {t("practitioner.home.workspaceStatus.missingSteps")}
                  </Text>
                  <View style={styles.missingChips}>
                    {missingRequirements.slice(0, 4).map((item) => (
                      <StatusChip
                        key={item}
                        label={formatRequirementLabel(item)}
                        tone="warning"
                        showDot={false}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </> 
          )}
        </Card>

        <Card variant="outlined" padding="sm" style={styles.instantBookingCard}>
          <CompactSectionHeader
            title={t("instantBooking.practitioner.home.title")}
            subtitle={t("instantBooking.practitioner.home.subtitle")}
            action={
              <StatusChip
                label={
                  presence?.isInstantBookingEnabled
                    ? t("instantBooking.practitioner.home.enabled")
                    : t("instantBooking.practitioner.home.disabled")
                }
                tone={presence?.isInstantBookingEnabled ? "success" : "warning"}
                showDot={false}
              />
            }
          />

          <View style={styles.instantBookingBody}>
            <View style={styles.instantBookingNote}>
              <Ionicons
                name={presence?.isInstantBookingEnabled ? "flash-outline" : "flash-off-outline"}
                size={18}
                color={presence?.isInstantBookingEnabled ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text color={theme.colors.textSecondary} style={[styles.instantBookingText, { textAlign }]}>
                {presence?.isInstantBookingEnabled
                  ? t("instantBooking.practitioner.home.enabledNote")
                  : t("instantBooking.practitioner.home.disabledNote")}
              </Text>
            </View>

            <CompactActionRow
              label={t("instantBooking.practitioner.home.cta")}
              onPress={() => router.push("/(practitioner)/instant-booking")}
              accessibilityLabel={t("instantBooking.practitioner.home.cta")}
              style={styles.instantBookingAction}
            />
          </View>
        </Card>

        {approvalBlocked ? (
          <Card variant="flat" padding="md" style={styles.noticeCard}>
            <Text weight="600" style={[styles.noticeTitle, { textAlign }]}>
              {t("practitioner.home.approvalNotice.title")}
            </Text>
            <Text color={theme.colors.textSecondary} style={[styles.noticeBody, { textAlign }]}>
              {t("practitioner.home.approvalNotice.body")}
            </Text>
          </Card>
        ) : null}

        <Card variant="outlined" padding="sm">
          <CompactSectionHeader title={t("practitioner.home.quickAccess")} />
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="calendar-outline"
              label={t("practitioner.tab.sessions")}
              tone="daily"
              onPress={() => router.push("/(practitioner)/sessions")}
            />
            <QuickAccessCard
              icon="pulse-outline"
              label={t("practitioner.tab.availability")}
              tone="info"
              onPress={() => router.push("/(practitioner)/availability")}
            />
          </View>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="chatbubbles-outline"
              label={t("messages.inbox.title")}
              tone="messages"
              onPress={() => router.push("/(practitioner)/messages")}
            />
            <QuickAccessCard
              icon="headset-outline"
              label={t("practitioner.support.quickAccess")}
              tone="support"
              onPress={() =>
                router.push(
                  {
                    pathname: "/(practitioner)/support",
                    params: { returnTo: pathname },
                  } as any,
                )
              }
            />
          </View>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="person-circle-outline"
              label={t("practitioner.account.quickAccess")}
              tone="account"
              onPress={() => router.push("/(practitioner)/account")}
            />
            <QuickAccessCard
              icon="cash-outline"
              label={t("practitioner.finance.quickAccess")}
              tone="finance"
              onPress={() => router.push("/(practitioner)/finance")}
            />
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
}: {
  label: string;
  value: string;
  textAlign: "left" | "right";
  tone?: PractitionerTone;
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <View
      style={[
        styles.metricChip,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text color={theme.colors.textMuted} style={[styles.metricLabel, { textAlign }]} numberOfLines={1}>
        {label}
      </Text>
      <Text weight="600" style={[styles.metricValue, { textAlign, color: palette.accent }]} numberOfLines={1}>
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
    >
      <View style={[styles.quickIconWrap, { backgroundColor: palette.iconBackground }]}>
        <Ionicons name={icon} size={20} color={palette.iconColor} />
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
    case "CONFIRMED":
    case "PENDING_PRACTITIONER_RESPONSE":
      return "warning" as const;
    case "NO_SHOW":
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

const styles = StyleSheet.create({
  logoutButton: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 8,
  },
  welcomeCard: {
    gap: 6,
  },
  welcomeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  welcomeTextWrap: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
  },
  welcomeSubtitle: {
    fontSize: 12,
  },
  welcomeHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  snapshotCard: {
    gap: 6,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricChip: {
    width: "48%",
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 9,
    minHeight: 54,
    borderWidth: 1,
  },
  nextSessionCard: {
    gap: 6,
  },
  nextSessionPatient: {
    fontSize: 14,
  },
  nextSessionTime: {
    fontSize: 12,
    lineHeight: 17,
  },
  nextSessionMetaRow: {
    alignItems: "flex-start",
  },
  nextSessionCta: {
    marginTop: 2,
  },
  nextSessionEmpty: {
    gap: 7,
  },
  nextSessionEmptyTitle: {
    fontSize: 13,
  },
  nextSessionEmptyBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  noticeCard: {
    gap: 6,
  },
  noticeTitle: {
    fontSize: 13,
  },
  noticeBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  workspaceCard: {
    gap: 8,
  },
  instantBookingCard: {
    gap: 8,
  },
  instantBookingBody: {
    gap: 8,
  },
  instantBookingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  instantBookingText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  instantBookingAction: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  workspaceRows: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  quickCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 9,
    gap: 5,
    minHeight: 60,
  },
  quickCardLabel: {
    fontSize: 12,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  compactButton: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  missingBlock: {
    gap: 6,
    paddingTop: 2,
  },
  missingTitle: {
    fontSize: 11,
  },
  missingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricLabel: {
    fontSize: 10,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 12,
  },
});

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
