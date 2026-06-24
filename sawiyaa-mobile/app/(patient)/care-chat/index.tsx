import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useMyCareChatRequests } from "../../../src/features/patient/care-chat/hooks";
import type {
  CareChatRequestItemDto,
  ChatApprovalStatus,
} from "../../../src/features/patient/care-chat/types";

type TabFilter = "active" | "history";

const ACTIVE_STATUSES: ChatApprovalStatus[] = ["PENDING", "APPROVED"];
const HISTORY_STATUSES: ChatApprovalStatus[] = [
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "REVOKED",
];

function approvalStatusColor(
  status: ChatApprovalStatus,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (status) {
    case "PENDING":
      return theme.colors.warning ?? "#f59e0b";
    case "APPROVED":
      return theme.colors.success ?? "#22c55e";
    case "REJECTED":
      return theme.colors.error;
    case "EXPIRED":
    case "CANCELLED":
    case "REVOKED":
      return theme.colors.textMuted;
    default:
      return theme.colors.textMuted;
  }
}

export default function CareChatListScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabFilter>("active");

  const query = useMyCareChatRequests({ page: 1, limit: 20 });
  const allItems = query.data?.items ?? [];

  const filtered = allItems.filter((req) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(req.status);
    return HISTORY_STATUSES.includes(req.status);
  });

  function formatDate(dateStr: string) {
    const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  }

  function renderRequest(req: CareChatRequestItemDto) {
    const color = approvalStatusColor(req.status, theme);
    const isApproved = req.status === "APPROVED";

    return (
      <TouchableOpacity
        key={req.id}
        onPress={() => {
          if (isApproved && req.linkedConversationId) {
            router.push(
              `/(patient)/care-chat/${req.linkedConversationId}` as any,
            );
          } else {
            router.push(`/(patient)/care-chat/request/${req.id}` as any);
          }
        }}
        activeOpacity={0.8}
      >
        <Card style={styles.requestCard}>
          <View style={styles.cardHeader}>
            <View style={styles.practitionerRow}>
              <Ionicons
                name="person-circle-outline"
                size={32}
                color={theme.colors.primary}
              />
              <View style={styles.practitionerInfo}>
                <Text weight="600" style={styles.practitionerName}>
                  {req.practitioner.displayName ??
                    t("careChat.unknownPractitioner")}
                </Text>
                <Text color={theme.colors.textMuted} style={styles.requestDate}>
                  {formatDate(req.requestedAt)}
                </Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              {req.hasUnread && (
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

          {req.reason ? (
            <Text
              color={theme.colors.textSecondary}
              style={styles.reason}
              numberOfLines={2}
            >
              {req.reason}
            </Text>
          ) : null}

          <View style={[styles.statusPill, { backgroundColor: color + "18" }]}>
            <Text style={[styles.statusText, { color }]}>
              {t(`careChat.requestStatus.${req.status}`, req.status)}
            </Text>
            {isApproved && req.expiresAt ? (
              <Text
                style={[styles.expiresText, { color: theme.colors.textMuted }]}
              >
                {" · "}
                {t("careChat.expiresOn", {
                  date: new Date(req.expiresAt).toLocaleDateString(
                    i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                    {
                    day: "numeric",
                    month: "short",
                    },
                  ),
                })}
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
        title={t("careChat.title")}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(patient)/care-chat/new" as any)}
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
          <View style={styles.filters}>
            <FilterChip
              label={t("careChat.tabs.active")}
              selected={tab === "active"}
              onPress={() => setTab("active")}
            />
            <FilterChip
              label={t("careChat.tabs.history")}
              selected={tab === "history"}
              onPress={() => setTab("history")}
            />
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              title={t("careChat.empty.title")}
              description={
                tab === "active"
                  ? t("careChat.empty.activeSubtitle")
                  : t("careChat.empty.historySubtitle")
              }
            />
          ) : (
            <View style={styles.list}>{filtered.map(renderRequest)}</View>
          )}

          {allItems.length === 0 ? (
            <TouchableOpacity
              style={[styles.newCta, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push("/(patient)/care-chat/new" as any)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="#fff"
              />
              <Text weight="600" style={styles.newCtaText}>
                {t("careChat.newRequest")}
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
  },
  list: {
    gap: 10,
  },
  requestCard: {
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  practitionerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  practitionerInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 15,
  },
  requestDate: {
    fontSize: 12,
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
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expiresText: {
    fontSize: 12,
  },
  newCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  newCtaText: {
    color: "#fff",
    fontSize: 16,
  },
});

