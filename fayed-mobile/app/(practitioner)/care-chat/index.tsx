import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { usePractitionerCareChatRequests } from "../../../src/features/practitioner/care-chat/hooks";
import type {
  CareChatRequestItemDto,
  CareChatRequestStatus,
} from "../../../src/features/practitioner/care-chat/types";

type TabFilter = "active" | "history";

const ACTIVE_STATUSES: CareChatRequestStatus[] = ["PENDING", "APPROVED"];
const HISTORY_STATUSES: CareChatRequestStatus[] = [
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "REVOKED",
];

function requestColor(
  status: CareChatRequestStatus,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (status) {
    case "PENDING":
      return theme.colors.warning ?? "#f59e0b";
    case "APPROVED":
      return theme.colors.success ?? "#16a34a";
    case "REJECTED":
      return theme.colors.error;
    case "EXPIRED":
    case "CANCELLED":
    case "REVOKED":
    default:
      return theme.colors.textMuted;
  }
}

function shortReference(value: string | null) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export default function PractitionerCareChatListScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabFilter>("active");

  const query = usePractitionerCareChatRequests({ page: 1, limit: 50 });
  const allItems = query.data?.items ?? [];

  const filtered = allItems.filter((item) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(item.status);
    return HISTORY_STATUSES.includes(item.status);
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

  function openItem(item: CareChatRequestItemDto) {
    if (item.status === "APPROVED" && item.linkedConversationId) {
      router.push(`/(practitioner)/care-chat/${item.linkedConversationId}` as never);
      return;
    }

    router.push(`/(practitioner)/care-chat/request/${item.id}` as never);
  }

  function renderItem(item: CareChatRequestItemDto) {
    const color = requestColor(item.status, theme);
    const reference = shortReference(item.relatedSessionId);

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => openItem(item)}
        activeOpacity={0.85}
      >
        <Card style={styles.itemCard}>
          <View style={styles.cardHeader}>
            <View style={styles.patientRow}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={30}
                color={theme.colors.primary}
              />
              <View style={styles.patientInfo}>
                <Text weight="600" style={styles.patientName}>
                  {item.patient.displayName ?? t("practitioner.careChat.fallbackPatient")}
                </Text>
                <Text color={theme.colors.textMuted} style={styles.requestDate}>
                  {formatDate(item.requestedAt)}
                </Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              {item.hasUnread && (
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

          {item.reason ? (
            <Text color={theme.colors.textSecondary} style={styles.reason} numberOfLines={2}>
              {item.reason}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: `${color}20` },
              ]}
            >
              <Text style={[styles.statusText, { color }]}>
                {t(`practitioner.careChat.requestStatus.${item.status}`, item.status)}
              </Text>
            </View>
            {reference ? (
              <Text color={theme.colors.textMuted} style={styles.metaText}>
                {t("practitioner.careChat.sessionReference", { value: reference })}
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
        title={t("practitioner.careChat.title")}
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
              {t("practitioner.careChat.heading")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.headerBody}>
              {t("practitioner.careChat.subtitle")}
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
                {t("practitioner.careChat.tabs.active")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab("history")}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    tab === "history"
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor:
                    tab === "history"
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                },
              ]}
            >
              <Text
                color={tab === "history" ? "#fff" : theme.colors.textSecondary}
                weight="600"
              >
                {t("practitioner.careChat.tabs.history")}
              </Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              title={t("practitioner.careChat.empty.title")}
              description={
                tab === "active"
                  ? t("practitioner.careChat.empty.activeSubtitle")
                  : t("practitioner.careChat.empty.historySubtitle")
              }
              icon={
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={48}
                  color={theme.colors.textMuted}
                />
              }
            />
          ) : (
            <View style={styles.list}>{filtered.map(renderItem)}</View>
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
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: 12,
  },
  itemCard: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
  },
  requestDate: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reason: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaText: {
    fontSize: 12,
  },
});

