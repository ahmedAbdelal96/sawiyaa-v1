import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  Screen,
  Header,
  Text,
  EmptyState,
  Card,
  FilterChip,
  LoadingState,
  ErrorState,
} from "../../src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { usePatientSessions } from "../../src/features/patient/sessions/hooks";
import type {
  SessionListItem,
  SessionStatus,
} from "../../src/features/patient/sessions/types";
import { formatLocalizedDateTime } from "../../src/features/patient/sessions/slot-utils";

export default function PatientSessionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const sessionsQuery = usePatientSessions({ page: 1, limit: 50 });

  const filteredSessions = useMemo(() => {
    const upcomingStatuses = new Set<SessionStatus>([
      "DRAFT",
      "PENDING_PAYMENT",
      "PENDING_PRACTITIONER_RESPONSE",
      "CONFIRMED",
      "UPCOMING",
      "READY_TO_JOIN",
      "IN_PROGRESS",
    ]);

    const allItems = sessionsQuery.data?.items ?? [];
    const picked = allItems.filter((item) => {
      const isUpcoming = upcomingStatuses.has(item.status);
      return activeTab === "upcoming" ? isUpcoming : !isUpcoming;
    });

    return picked.sort((a, b) => {
      const left = a.scheduledStartAt
        ? new Date(a.scheduledStartAt).getTime()
        : 0;
      const right = b.scheduledStartAt
        ? new Date(b.scheduledStartAt).getTime()
        : 0;
      return activeTab === "upcoming" ? left - right : right - left;
    });
  }, [activeTab, sessionsQuery.data?.items]);

  return (
    <Screen bg="background">
      <Header title={t("sessions")} />

      {sessionsQuery.isLoading ? <LoadingState fullScreen /> : null}
      {sessionsQuery.isError ? (
        <ErrorState fullScreen onRetry={sessionsQuery.refetch} />
      ) : null}

      {!sessionsQuery.isLoading && !sessionsQuery.isError ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroBlock}>
            <Text weight="bold" style={styles.heroTitle}>
              {t("sessions")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.heroSubtitle}
            >
              {t("patientSessionsFlow.list.subtitle")}
            </Text>
          </View>

          <View
            style={[
              styles.segmentedWrap,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.segmentedInner,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <FilterChip
                label={t("patientSessionsFlow.list.upcoming")}
                selected={activeTab === "upcoming"}
                onPress={() => setActiveTab("upcoming")}
              />
              <FilterChip
                label={t("patientSessionsFlow.list.past")}
                selected={activeTab === "past"}
                onPress={() => setActiveTab("past")}
              />
            </View>
          </View>

          {filteredSessions.length === 0 ? (
            <Card
              variant="elevated"
              style={[
                styles.emptyCard,
                {
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  ...(isRtl
                    ? {
                        borderLeftWidth: 4,
                        borderLeftColor: theme.colors.primary,
                        borderRightWidth: 1,
                      }
                    : { borderRightColor: theme.colors.primary }),
                },
              ]}
            >
              <Text
                color={theme.colors.textSecondary}
                style={styles.emptyDateHint}
              >
                {activeTab === "upcoming"
                  ? t("patientSessionsFlow.list.noUpcoming")
                  : t("patientSessionsFlow.list.noPast")}
              </Text>
              <EmptyState
                title={t("patientSessionsFlow.list.emptyTitle")}
                description={t("patientSessionsFlow.list.emptyDescription")}
                icon={
                  <Ionicons
                    name="calendar-outline"
                    size={58}
                    color={theme.colors.textMuted}
                  />
                }
                actionLabel={t("patientSessionsFlow.list.findTherapist")}
                onAction={() => router.push("/discovery")}
              />
            </Card>
          ) : (
            <View style={styles.sessionsListWrap}>
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  item={session}
                  locale={locale}
                  isRtl={isRtl}
                  onPress={() => router.push(`/sessions/${session.id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function SessionCard({
  item,
  locale,
  isRtl,
  onPress,
}: {
  item: SessionListItem;
  locale: string;
  isRtl: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Card variant="elevated" padding="md" style={styles.sessionCard}>
        <View style={styles.sessionRowTop}>
          <View>
            <Text weight="600" style={styles.sessionTitle}>
              {item.practitioner.displayName ??
                t("patientSessionsFlow.common.practitionerFallback")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.sessionSubtitle}
            >
              {item.sessionCode}
            </Text>
          </View>
          <Ionicons
            name={isRtl ? "chevron-back" : "chevron-forward"}
            size={18}
            color={theme.colors.textMuted}
          />
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Text
              color={theme.colors.primary}
              weight="600"
              style={styles.statusText}
            >
              {formatStatusLabel(t, item.status)}
            </Text>
          </View>
        </View>

        <Text color={theme.colors.textSecondary} style={styles.metaRow}>
          {item.scheduledStartAt
            ? formatLocalizedDateTime(item.scheduledStartAt, locale)
            : t("patientSessionsFlow.common.notAvailable")}
        </Text>

        <Text color={theme.colors.textMuted} style={styles.metaRow}>
          {t("patientSessionsFlow.list.durationValue", {
            minutes: item.durationMinutes,
          })}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

function formatStatusLabel(
  t: ReturnType<typeof useTranslation>["t"],
  status: SessionStatus,
) {
  const map: Record<SessionStatus, string> = {
    DRAFT: t("patientSessionsFlow.statuses.DRAFT"),
    PENDING_PAYMENT: t("patientSessionsFlow.statuses.PENDING_PAYMENT"),
    PENDING_PRACTITIONER_RESPONSE: t(
      "patientSessionsFlow.statuses.PENDING_PRACTITIONER_RESPONSE",
    ),
    CONFIRMED: t("patientSessionsFlow.statuses.CONFIRMED"),
    UPCOMING: t("patientSessionsFlow.statuses.UPCOMING"),
    READY_TO_JOIN: t("patientSessionsFlow.statuses.READY_TO_JOIN"),
    IN_PROGRESS: t("patientSessionsFlow.statuses.IN_PROGRESS"),
    COMPLETED: t("patientSessionsFlow.statuses.COMPLETED"),
    CANCELLED: t("patientSessionsFlow.statuses.CANCELLED"),
    NO_SHOW: t("patientSessionsFlow.statuses.NO_SHOW"),
    EXPIRED: t("patientSessionsFlow.statuses.EXPIRED"),
    REFUND_PENDING: t("patientSessionsFlow.statuses.REFUND_PENDING"),
    REFUNDED: t("patientSessionsFlow.statuses.REFUNDED"),
  };

  return map[status] ?? status;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 128,
  },
  heroBlock: {
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 42,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  segmentedWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    marginBottom: 14,
  },
  segmentedInner: {
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  emptyCard: {
    borderRightWidth: 4,
    borderRightColor: "#3f7dcf",
  },
  emptyDateHint: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: "right",
  },
  sessionsListWrap: {
    gap: 10,
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: "#e7ecf2",
  },
  sessionRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  sessionSubtitle: {
    fontSize: 12,
  },
  badgeRow: {
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
  },
  metaRow: {
    fontSize: 13,
    marginBottom: 2,
  },
});
