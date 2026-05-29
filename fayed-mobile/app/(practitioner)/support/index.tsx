import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { usePractitionerSupportTickets } from "../../../src/features/practitioner/support/hooks";
import type {
  SupportTicketItemDto,
  SupportTicketStatus,
} from "../../../src/features/practitioner/support/types";

type TabFilter = "active" | "resolved";

const ACTIVE_STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "ESCALATED",
];
const RESOLVED_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

function statusColor(
  status: SupportTicketStatus,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (status) {
    case "OPEN":
      return theme.colors.primary;
    case "IN_PROGRESS":
      return theme.colors.warning ?? "#f59e0b";
    case "WAITING_FOR_USER":
      return theme.colors.info ?? "#0284c7";
    case "ESCALATED":
      return theme.colors.error;
    case "RESOLVED":
      return theme.colors.success ?? "#16a34a";
    case "CLOSED":
    default:
      return theme.colors.textMuted;
  }
}

function shortReference(value: string | null) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export default function PractitionerSupportListScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabFilter>("active");
  const returnToRoute =
    typeof returnTo === "string" && returnTo.trim().length > 0
      ? returnTo
      : null;

  const query = usePractitionerSupportTickets({ page: 1, limit: 20 });
  const allTickets = query.data?.items ?? [];

  const filtered = allTickets.filter((ticket) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(ticket.status);
    return RESOLVED_STATUSES.includes(ticket.status);
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      {
        day: "numeric",
        month: "short",
      },
    );
  }

  function renderTicket(ticket: SupportTicketItemDto) {
    const color = statusColor(ticket.status, theme);
    const reference =
      shortReference(ticket.relatedSessionId) ??
      shortReference(ticket.relatedPaymentId) ??
      shortReference(ticket.relatedMatchingSessionId) ??
      shortReference(ticket.relatedInstantBookingRequestId) ??
      shortReference(ticket.relatedAssessmentSubmissionId);

    return (
      <TouchableOpacity
        key={ticket.id}
        onPress={() =>
          router.push(
            {
              pathname: "/(practitioner)/support/[id]",
              params: {
                id: ticket.id,
                returnTo: returnToRoute ?? "",
              },
            } as never,
          )
        }
        activeOpacity={0.85}
      >
        <Card style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketMeta}>
              <Text weight="600" style={styles.ticketSubject} numberOfLines={1}>
                {ticket.subject}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.ticketDate}>
                {formatDate(ticket.createdAt)}
              </Text>
            </View>
            <View style={styles.ticketRight}>
              {ticket.hasUnread && (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.ticketFooter}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: `${color}20` },
              ]}
            >
              <Text style={[styles.statusPillText, { color }]}>
                {t(`practitioner.support.statuses.${ticket.status}`, ticket.status)}
              </Text>
            </View>

            <Text color={theme.colors.textMuted} style={styles.metaText}>
              {t(`practitioner.support.categories.${ticket.category}`, ticket.category)}
            </Text>
          </View>

          <View style={styles.ticketFooterSecondary}>
            <Text color={theme.colors.textMuted} style={styles.metaText}>
              {t(`practitioner.support.priorities.${ticket.priority}`, ticket.priority)}
            </Text>
            {reference ? (
              <Text color={theme.colors.textMuted} style={styles.metaText}>
                {t("practitioner.support.reference", { value: reference })}
              </Text>
            ) : null}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.support.title")}
        showBack
      />

      {query.isLoading ? <LoadingState fullScreen /> : null}
      {query.isError && !query.isLoading ? (
        <ErrorState fullScreen onRetry={query.refetch} />
      ) : null}

      {!query.isLoading && !query.isError ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerCard}>
            <Text weight="600" style={styles.headerTitle}>
              {t("practitioner.support.heading")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.headerBody}>
              {t("practitioner.support.subtitle")}
            </Text>
          </View>

          <View style={styles.filters}>
            <TouchableOpacity
              onPress={() => setTab("active")}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    tab === "active"
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor:
                    tab === "active"
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                },
              ]}
            >
              <Text
                color={tab === "active" ? "#fff" : theme.colors.textSecondary}
                weight="600"
              >
                {t("practitioner.support.tabs.active")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab("resolved")}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    tab === "resolved"
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor:
                    tab === "resolved"
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                },
              ]}
            >
              <Text
                color={tab === "resolved" ? "#fff" : theme.colors.textSecondary}
                weight="600"
              >
                {t("practitioner.support.tabs.resolved")}
              </Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              title={t("practitioner.support.empty.title")}
              description={
                tab === "active"
                  ? t("practitioner.support.empty.activeSubtitle")
                  : t("practitioner.support.empty.resolvedSubtitle")
              }
              icon={
                <Ionicons
                  name="headset-outline"
                  size={48}
                  color={theme.colors.textMuted}
                />
              }
            />
          ) : (
            <View style={styles.list}>{filtered.map(renderTicket)}</View>
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
    paddingBottom: 36,
    flexGrow: 1,
    gap: 14,
  },
  headerCard: {
    padding: 2,
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  headerBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  filters: {
    flexDirection: "row",
    gap: 10,
  },
  filterChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: 12,
  },
  ticketCard: {
    gap: 10,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  ticketMeta: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    marginBottom: 2,
  },
  ticketDate: {
    fontSize: 12,
  },
  ticketRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ticketFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  ticketFooterSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaText: {
    fontSize: 12,
  },
});

