import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../../src/components/ui";
import { usePractitionerSessions } from "../../../src/features/practitioner/sessions/hooks";
import type { SessionStatus } from "../../../src/features/practitioner/sessions/types";
import { useTheme } from "../../../src/providers/ThemeProvider";

const FILTERS: Array<{ key: "ALL" | SessionStatus; labelKey: string }> = [
  { key: "ALL", labelKey: "practitioner.sessions.filters.all" },
  { key: "UPCOMING", labelKey: "practitioner.sessions.filters.upcoming" },
  { key: "READY_TO_JOIN", labelKey: "practitioner.sessions.filters.ready" },
  { key: "IN_PROGRESS", labelKey: "practitioner.sessions.filters.live" },
  { key: "COMPLETED", labelKey: "practitioner.sessions.filters.completed" },
];

export default function PractitionerSessionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"ALL" | SessionStatus>(
    "ALL",
  );

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const sessionsQuery = usePractitionerSessions({
    limit: 20,
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
  });

  return (
    <Screen bg="background">
      <Header title={t("practitioner.sessions.title")} />

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((filter) => {
            const active = filter.key === statusFilter;
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setStatusFilter(filter.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: active
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                  },
                ]}
              >
                <Text
                  color={active ? "#ffffff" : theme.colors.textSecondary}
                  weight="600"
                >
                  {t(filter.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {sessionsQuery.isLoading ? <LoadingState fullScreen /> : null}

        {sessionsQuery.isError ? (
          <ErrorState onRetry={sessionsQuery.refetch} />
        ) : null}

        {!sessionsQuery.isLoading && !sessionsQuery.isError ? (
          sessionsQuery.data?.items.length ? (
            <View style={styles.listWrap}>
              {sessionsQuery.data.items.map((session) => (
                <Card
                  key={session.id}
                  variant="outlined"
                  padding="lg"
                  onPress={() =>
                    router.push(`/(practitioner)/sessions/${session.id}`)
                  }
                  style={styles.sessionCard}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTextWrap}>
                      <Text weight="600" style={styles.patientName}>
                        {session.patient?.displayName ??
                          t("practitioner.sessions.unknownPatient")}
                      </Text>
                      <Text
                        color={theme.colors.textMuted}
                        style={styles.sessionCode}
                      >
                        {session.sessionCode}
                      </Text>
                    </View>
                    <StatusBadge
                      label={t(`practitioner.sessionStatus.${session.status}`)}
                      status={mapSessionBadge(session.status)}
                    />
                  </View>

                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.sessionMeta}
                  >
                    {session.scheduledStartAt
                      ? new Date(session.scheduledStartAt).toLocaleString(
                          locale,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: !locale.startsWith("ar"),
                          },
                        )
                      : t("practitioner.sessions.noSchedule")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.sessionMeta}
                  >
                    {t("practitioner.sessions.duration", {
                      minutes: session.durationMinutes,
                    })}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <Card variant="flat" padding="lg">
              <Text weight="600">{t("practitioner.sessions.emptyTitle")}</Text>
              <Text color={theme.colors.textSecondary} style={styles.emptyBody}>
                {t("practitioner.sessions.emptyBody")}
              </Text>
            </Card>
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  filtersRow: {
    gap: 10,
    paddingBottom: 4,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listWrap: {
    gap: 12,
  },
  sessionCard: {
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTextWrap: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    marginBottom: 4,
  },
  sessionCode: {
    fontSize: 12,
  },
  sessionMeta: {
    fontSize: 14,
  },
  emptyBody: {
    marginTop: 8,
    lineHeight: 22,
  },
});
