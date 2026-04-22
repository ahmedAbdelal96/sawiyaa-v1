import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../src/components/ui";
import { usePractitionerProfile } from "../../src/features/practitioner/profile/hooks";
import { useMyPresence } from "../../src/features/practitioner/presence/hooks";
import { usePractitionerSessions } from "../../src/features/practitioner/sessions/hooks";
import type { SessionStatus } from "../../src/features/practitioner/sessions/types";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function PractitionerHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { signOut } = useAuth();

  const profileQuery = usePractitionerProfile();
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
  const presence = presenceQuery.data?.presence;
  const approvalBlocked = profile.profileStatus !== "APPROVED";

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
});
