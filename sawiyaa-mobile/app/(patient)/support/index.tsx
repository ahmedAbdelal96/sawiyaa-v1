import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  Card,
  EmptyState,
  LoadingState,
  ErrorState,
  FilterChip,
  StatusBadge,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { usePatientSupportTickets } from "../../../src/features/patient/support/hooks";
import type {
  SupportTicketItemDto,
  SupportTicketStatus,
} from "../../../src/features/patient/support/types";

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
      return theme.colors.info ?? "#6366f1";
    case "ESCALATED":
      return theme.colors.error;
    case "RESOLVED":
      return theme.colors.success ?? "#22c55e";
    case "CLOSED":
      return theme.colors.textMuted;
    default:
      return theme.colors.textMuted;
  }
}

export default function SupportListScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabFilter>("active");
  const returnToRoute =
    typeof returnTo === "string" && returnTo.trim().length > 0
      ? returnTo
      : null;

  const query = usePatientSupportTickets({ page: 1, limit: 20 });
  const allTickets = query.data?.items ?? [];

  const filtered = allTickets.filter((ticket) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(ticket.status);
    return RESOLVED_STATUSES.includes(ticket.status);
  });

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  }

  function renderTicket(ticket: SupportTicketItemDto) {
    return (
      <TouchableOpacity
        key={ticket.id}
        onPress={() =>
          router.push(
            {
              pathname: "/(patient)/support/[id]",
              params: {
                id: ticket.id,
                returnTo: returnToRoute ?? "",
              },
            } as any,
          )
        }
        activeOpacity={0.8}
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
                { backgroundColor: statusColor(ticket.status, theme) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: statusColor(ticket.status, theme) },
                ]}
              >
                {t(`support.statuses.${ticket.status}`, ticket.status)}
              </Text>
            </View>
            <Text color={theme.colors.textMuted} style={styles.categoryLabel}>
              {t(`support.categories.${ticket.category}`, ticket.category)}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("support.title")}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() =>
              router.push(
                {
                  pathname: "/(patient)/support/new",
                  params: { returnTo: returnToRoute ?? "" },
                } as any,
              )
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={26} color={theme.colors.primary} />
          </TouchableOpacity>
        }
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
          {/* Filters */}
          <View style={styles.filters}>
            <FilterChip
              label={t("support.tabs.active")}
              selected={tab === "active"}
              onPress={() => setTab("active")}
            />
            <FilterChip
              label={t("support.tabs.resolved")}
              selected={tab === "resolved"}
              onPress={() => setTab("resolved")}
            />
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              title={t("support.empty.title")}
              description={
                tab === "active"
                  ? t("support.empty.activeSubtitle")
                  : t("support.empty.resolvedSubtitle")
              }
            />
          ) : (
            <View style={styles.list}>{filtered.map(renderTicket)}</View>
          )}

          {/* CTA if no tickets at all */}
          {allTickets.length === 0 ? (
            <TouchableOpacity
              style={[
                styles.newTicketCta,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() =>
                router.push(
                  {
                    pathname: "/(patient)/support/new",
                    params: { returnTo: returnToRoute ?? "" },
                  } as any,
                )
              }
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text weight="600" style={styles.newTicketCtaText}>
                {t("support.newTicket")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  list: {
    gap: 10,
  },
  ticketCard: {
    padding: 18,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  ticketMeta: {
    flex: 1,
    marginEnd: 8,
  },
  ticketSubject: {
    fontSize: 15,
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
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryLabel: {
    fontSize: 12,
  },
  newTicketCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  newTicketCtaText: {
    color: "#fff",
    fontSize: 16,
  },
});

