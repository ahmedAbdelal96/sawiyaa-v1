import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  CompactActionRow,
  Screen,
  StatusBadge,
  StatusChip,
  SectionHeader,
  SummaryRow,
  formatDateTime,
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
  const presence = presenceQuery.data?.presence;
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
    ? "Join"
    : "View";

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
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.heroTitle}>
                {profile.displayName ?? t("practitioner.home.fallbackName")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.heroSubtitle}
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

          <View style={styles.metaRow}>
            <MetricCard
              label={t("practitioner.home.metrics.presence")}
              value={
                presence
                  ? t(`practitioner.presence.status.${presence.status}`)
                  : "-"
              }
            />
            <MetricCard
              label={t("practitioner.home.metrics.instantBooking")}
              value={
                presence?.isInstantBookingEnabled
                  ? t("common.enabled")
                  : t("common.disabled")
              }
            />
          </View>
          <View style={styles.metaRow}>
            <MetricCard
              label={t("practitioner.home.metrics.specialties")}
              value={String(profile.specialties.length)}
            />
            <MetricCard
              label={t("practitioner.home.metrics.credentials")}
              value={String(profile.credentialSummary.totalCredentials)}
            />
          </View>
        </Card>

        {upcomingSession ? (
          <Card
            variant="outlined"
            padding="md"
            style={[
              styles.upcomingSessionCard,
              {
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <SectionHeader
              title={t("practitioner.home.upcomingSession.title", "Upcoming Session")}
              subtitle={
                upcomingSession.patient?.displayName ??
                t("practitioner.sessions.unknownPatient")
              }
              action={
                <TouchableOpacity
                  onPress={() => router.push("/(practitioner)/sessions")}
                >
                  <Text color={theme.colors.textBrand} weight="600">
                    {t("practitioner.home.viewAll")}
                  </Text>
                </TouchableOpacity>
              }
            />

            <Text color={theme.colors.textSecondary} style={styles.upcomingSessionTime}>
              {upcomingSession.scheduledStartAt
                ? formatDateTime(upcomingSession.scheduledStartAt, locale)
                : t("practitioner.sessions.noSchedule")}
            </Text>

            <View style={styles.upcomingSessionStatusRow}>
              <StatusChip
                label={t(`sessionStatus.${upcomingSession.status}`)}
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
              style={styles.upcomingSessionCta}
            />
          </Card>
        ) : null}

        <Card variant="outlined" padding="lg" style={styles.workspaceCard}>
          <SectionHeader
            title={t("practitioner.home.workspaceStatus.title")}
            subtitle={t("practitioner.home.workspaceStatus.subtitle")}
            action={
              <TouchableOpacity onPress={() => router.push("/(practitioner)/account")}>
                <Text color={theme.colors.textBrand} weight="600">
                  {t("practitioner.home.workspaceStatus.openAccount")}
                </Text>
              </TouchableOpacity>
            }
          />

          {workspaceState === "loading" ? (
            <LoadingState message="Loading workspace status..." />
          ) : workspaceState === "error" ? (
            <ErrorState
              title="Could not load workspace status"
              message="Please try again in a moment."
              onRetry={() => {
                readinessQuery.refetch();
                applicationQuery.refetch();
              }}
              retryText="Try again"
            />
          ) : (
            <>
              <View style={styles.workspaceRows}>
                <SummaryRow
                  label={t("practitioner.home.workspaceStatus.application")}
                  value={
                    <StatusChip
                      label={
                        applicationStatus
                          ? t(
                              `practitioner.account.applicationStatuses.${applicationStatus}`,
                              applicationStatus,
                            )
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
                  <Text weight="600" style={styles.missingTitle} color={theme.colors.textSecondary}>
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

        {approvalBlocked ? (
          <Card variant="flat" padding="lg" style={styles.noticeCard}>
            <Text weight="600" style={styles.noticeTitle}>
              {t("practitioner.home.approvalNotice.title")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.noticeBody}>
              {t("practitioner.home.approvalNotice.body")}
            </Text>
            <StatusBadge
              label={t(`practitioner.profileStatus.${profile.profileStatus}`)}
              status={mapProfileBadge(profile.profileStatus)}
            />
          </Card>
        ) : null}

        <Card variant="outlined" padding="lg">
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.home.nextSessions")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(practitioner)/sessions")}
            >
              <Text color={theme.colors.textBrand} weight="600">
                {t("practitioner.home.viewAll")}
              </Text>
            </TouchableOpacity>
          </View>

          {sessionsQuery.isLoading ? (
            <LoadingState />
          ) : sessionsQuery.isError ? (
            <Text color={theme.colors.error}>
              {t("practitioner.common.loadError")}
            </Text>
          ) : upcomingItems.length ? (
            <View style={styles.listWrap}>
              {upcomingItems.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.sessionRow,
                    { borderBottomColor: theme.colors.borderLight },
                  ]}
                  onPress={() =>
                    router.push(`/(practitioner)/sessions/${session.id}`)
                  }
                >
                  <View style={styles.sessionRowText}>
                    <Text weight="600">
                      {session.patient?.displayName ??
                        t("practitioner.sessions.unknownPatient")}
                    </Text>
                    <Text
                      color={theme.colors.textSecondary}
                      style={styles.sessionMeta}
                    >
                      {session.scheduledStartAt
                        ? new Date(session.scheduledStartAt).toLocaleString(
                            locale,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: !locale.startsWith("ar"),
                            },
                          )
                        : t("practitioner.sessions.noSchedule")}
                    </Text>
                  </View>
                  <StatusBadge
                    label={t(`practitioner.sessionStatus.${session.status}`)}
                    status={mapSessionBadge(session.status)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textSecondary}>
              {t("practitioner.home.noSessions")}
            </Text>
          )}
        </Card>

        <Card variant="outlined" padding="lg">
          <Text weight="600" style={styles.sectionTitle}>
            {t("practitioner.home.quickAccess")}
          </Text>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="calendar-outline"
              label={t("practitioner.tab.sessions")}
              onPress={() => router.push("/(practitioner)/sessions")}
            />
            <QuickAccessCard
              icon="pulse-outline"
              label={t("practitioner.tab.availability")}
              onPress={() => router.push("/(practitioner)/availability")}
            />
          </View>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="headset-outline"
              label={t("practitioner.support.quickAccess")}
              onPress={() =>
                router.push(
                  {
                    pathname: "/(practitioner)/support",
                    params: { returnTo: pathname },
                  } as any,
                )
              }
            />
            <QuickAccessCard
              icon="chatbubble-ellipses-outline"
              label={t("practitioner.careChat.quickAccess")}
              onPress={() => router.push("/(practitioner)/care-chat")}
            />
          </View>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="person-circle-outline"
              label={t("practitioner.account.quickAccess")}
              onPress={() => router.push("/(practitioner)/account")}
            />
            <QuickAccessCard
              icon="cash-outline"
              label={t("practitioner.finance.quickAccess")}
              onPress={() => router.push("/(practitioner)/finance")}
            />
          </View>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="wallet-outline"
              label={t("practitioner.finance.wallet.title")}
              onPress={() => router.push("/(practitioner)/finance/wallet")}
            />
            <QuickAccessCard
              icon="shield-checkmark-outline"
              label={t("practitioner.home.onboarding")}
              onPress={() => router.push("/(practitioner)/onboarding")}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <Text color={theme.colors.textMuted} style={styles.metricLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function QuickAccessCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.quickCard, { borderColor: theme.colors.borderLight }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={theme.colors.primary} />
      <Text weight="600" style={styles.quickCardLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    gap: 16,
  },
  upcomingSessionCard: {
    gap: 12,
    marginTop: 14,
  },
  upcomingSessionTime: {
    fontSize: 14,
    lineHeight: 22,
  },
  upcomingSessionStatusRow: {
    alignItems: "flex-start",
  },
  upcomingSessionCta: {
    marginTop: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
  },
  noticeCard: {
    gap: 10,
  },
  noticeTitle: {
    fontSize: 16,
  },
  noticeBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  workspaceCard: {
    gap: 14,
  },
  workspaceRows: {
    gap: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  listWrap: {
    gap: 2,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sessionRowText: {
    flex: 1,
  },
  sessionMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  quickCardLabel: {
    fontSize: 15,
  },
  missingBlock: {
    gap: 10,
    paddingTop: 2,
  },
  missingTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  missingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
