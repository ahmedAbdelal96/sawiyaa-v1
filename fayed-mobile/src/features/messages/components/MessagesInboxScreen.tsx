import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Header, Screen, Text } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import {
  buildCareInboxItem,
  buildSessionInboxItem,
  buildSupportInboxItem,
  sortInboxItemsByActivity,
  type NormalizedInboxItem,
} from "../inbox-types";
import { formatMessageTimestamp } from "../utils";
import type { MessagesRole } from "../types";
import {
  useInfiniteGeneralChatConversations,
  useGeneralChatResumeRefresh,
} from "../hooks";
import {
  usePatientSupportTickets,
} from "../../patient/support/hooks";
import {
  useMyCareChatRequests,
} from "../../patient/care-chat/hooks";
import {
  usePractitionerSupportTickets,
} from "../../practitioner/support/hooks";
import {
  usePractitionerCareChatRequests,
} from "../../practitioner/care-chat/hooks";

type InboxTab = "all" | "sessions" | "support" | "followup";

const TAB_ORDER: InboxTab[] = ["all", "sessions", "support", "followup"];

function statusColor(status: string, theme: any): string {
  if (status === "OPEN" || status === "PENDING" || status === "APPROVED")
    return theme.colors.success ?? "#22c55e";
  if (status === "IN_PROGRESS" || status === "WAITING_FOR_USER")
    return theme.colors.warning ?? "#f59e0b";
  if (status === "ESCALATED" || status === "REJECTED")
    return theme.colors.error;
  return theme.colors.textMuted;
}

type SourceType = "session" | "support" | "care";

function getInboxStatusLabel(
  sourceType: SourceType,
  status: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (sourceType === "support") {
    const key = `support.statuses.${status}`;
    const translated = t(key);
    return translated !== key ? translated : status;
  }
  if (sourceType === "care") {
    const key = `careChat.requestStatus.${status}`;
    const translated = t(key);
    return translated !== key ? translated : status;
  }
  // session
  const key = `messages.inbox.statuses.session.${status}`;
  const translated = t(key);
  return translated !== key ? translated : t("messages.inbox.statuses.session.OPEN");
}

function StatusPill({
  sourceType,
  status,
  theme,
  t,
}: {
  sourceType: SourceType;
  status: string;
  theme: any;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const color = statusColor(status, theme);
  const label = getInboxStatusLabel(sourceType, status, t);

  return (
    <View style={[stylesPill.pill, { backgroundColor: color + "18" }]}>
      <Text style={[stylesPill.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const stylesPill = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export function MessagesInboxScreen({
  role,
  initialTab,
}: {
  role: MessagesRole;
  initialTab?: InboxTab;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;
  const isPatient = role === "patient";

  const validTabs: InboxTab[] = ["all", "sessions", "support", "followup"];
  const [activeTab, setActiveTab] = useState<InboxTab>(
    initialTab && validTabs.includes(initialTab) ? initialTab : "all",
  );

  // ── Session conversations ───────────────────────────────────────────────
  const sessionsQuery = useInfiniteGeneralChatConversations(role, { pageSize: 20 }, true);
  useGeneralChatResumeRefresh(role);

  // ── Support tickets ─────────────────────────────────────────────────────
  const patientSupportQuery = usePatientSupportTickets({ page: 1, limit: 20 });
  const practitionerSupportQuery = usePractitionerSupportTickets({ page: 1, limit: 20 });
  const supportQuery = isPatient ? patientSupportQuery : practitionerSupportQuery;

  // ── Care chat requests ──────────────────────────────────────────────────
  const patientCareQuery = useMyCareChatRequests({ page: 1, limit: 20 });
  const practitionerCareQuery = usePractitionerCareChatRequests({ page: 1, limit: 20 });
  const careQuery = isPatient ? patientCareQuery : practitionerCareQuery;

  // ── Normalize all items ────────────────────────────────────────────────
  const allItems = useMemo(() => {
    const sessionItems: NormalizedInboxItem[] =
      sessionsQuery.data?.pages.flatMap((p) => p.items).map((c) =>
        buildSessionInboxItem(c, role)
      ) ?? [];

    const supportItems: NormalizedInboxItem[] = (supportQuery.data?.items ?? []).map((ticket) =>
      buildSupportInboxItem(ticket, role)
    );

    const careItems: NormalizedInboxItem[] = (careQuery.data?.items ?? [])
      .filter((req) => req.status === "APPROVED" || req.status === "PENDING")
      .map((req) => buildCareInboxItem(req, role));

    return sortInboxItemsByActivity([...sessionItems, ...supportItems, ...careItems]);
  }, [
    sessionsQuery.data?.pages,
    supportQuery.data?.items,
    careQuery.data?.items,
    role,
  ]);

  // ── Tab filtering ───────────────────────────────────────────────────────
  const tabItems = useMemo(() => {
    if (activeTab === "all") return allItems;
    if (activeTab === "sessions") return allItems.filter((i) => i.sourceType === "session");
    if (activeTab === "support") return allItems.filter((i) => i.sourceType === "support");
    if (activeTab === "followup") return allItems.filter((i) => i.sourceType === "care");
    return allItems;
  }, [allItems, activeTab]);

  // ── States ─────────────────────────────────────────────────────────────
  const isLoadingAny =
    sessionsQuery.isLoading || supportQuery.isLoading || careQuery.isLoading;
  const hasErrorAny =
    sessionsQuery.isError || supportQuery.isError || careQuery.isError;
  const isRefreshing =
    sessionsQuery.isRefetching ||
    supportQuery.isRefetching ||
    careQuery.isRefetching;

  const isInitialLoading = isLoadingAny && tabItems.length === 0;

  const handleRefresh = () => {
    void sessionsQuery.refetch();
    void supportQuery.refetch();
    void careQuery.refetch();
  };

  const handleCardPress = (item: NormalizedInboxItem) => {
    router.push(item.destinationRoute as any);
  };

  const handleStartSupport = () => {
    if (isPatient) {
      router.push("/(patient)/support/new" as any);
    } else {
      router.push("/(practitioner)/support" as any);
    }
  };

  const locale = i18n.language || "en";

  // ── Per-tab empty state ────────────────────────────────────────────────
  const emptyStateKey = useMemo(() => {
    if (activeTab === "sessions") return "messages.inbox.tabEmptySessions";
    if (activeTab === "followup") return "messages.inbox.tabEmptyFollowup";
    return "messages.inbox.tabEmpty";
  }, [activeTab]);

  return (
    <Screen bg="background">
      <Header title={t("messages.inbox.title", "Messages")} showBack />

      {/* ── Tabs (always visible) ── */}
      <View
        style={[
          styles.tabsBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        {TAB_ORDER.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              activeTab === tab
                ? { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
                : {},
            ]}
            activeOpacity={0.7}
          >
            <Text
              weight={activeTab === tab ? "700" : "400"}
              style={[
                styles.tabLabel,
                {
                  color:
                    activeTab === tab
                      ? theme.colors.primary
                      : theme.colors.textMuted,
                },
              ]}
            >
              {tab === "all"
                ? t("messages.tabs.all")
                : tab === "sessions"
                ? t("messages.tabs.sessions")
                : tab === "support"
                ? t("messages.tabs.support")
                : t("messages.tabs.followup")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content area ── */}
      <View style={styles.contentArea}>
        {/* Error banner */}
        {hasErrorAny && tabItems.length > 0 ? (
          <TouchableOpacity
            style={[
              styles.errorBanner,
              { backgroundColor: (theme.colors.error ?? "#ef4444") + "15" },
            ]}
            onPress={handleRefresh}
            activeOpacity={0.85}
          >
            <Ionicons
              name="warning"
              size={15}
              color={theme.colors.error ?? "#ef4444"}
            />
            <Text
              style={[
                styles.errorBannerText,
                { color: theme.colors.error ?? "#ef4444" },
              ]}
            >
              {t("messages.common.errorBanner")}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Loading */}
        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text
              color={theme.colors.textSecondary}
              style={styles.loadingText}
            >
              {t("messages.common.loading")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={tabItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            onScrollBeginDrag={() => {}}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              activeTab === "support" && tabItems.length === 0 ? (
                <Card
                  variant="elevated"
                  padding="md"
                  style={[
                    styles.supportCtaCard,
                    {
                      borderWidth: 1,
                      borderColor: theme.colors.borderLight,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <View style={styles.supportCtaIcon}>
                    <Ionicons
                      name="chatbubbles"
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text weight="600" style={styles.supportCtaTitle}>
                    {t("messages.inbox.supportCtaTitle")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.supportCtaDesc}
                  >
                    {t("messages.inbox.supportCtaDesc")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.supportCtaBtn,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleStartSupport}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={17}
                      color="#fff"
                    />
                    <Text weight="600" style={styles.supportCtaBtnText}>
                      {t("messages.inbox.supportCtaBtn")}
                    </Text>
                  </TouchableOpacity>
                </Card>
              ) : null
            }
            ListEmptyComponent={
              tabItems.length === 0 && !isInitialLoading ? (
                <View style={styles.tabEmptyState}>
                  <Ionicons
                    name={
                      activeTab === "sessions"
                        ? "calendar-outline"
                        : activeTab === "support"
                        ? "headset"
                        : activeTab === "followup"
                        ? "chatbubbles-outline"
                        : "chatbubbles-outline"
                    }
                    size={28}
                    color={theme.colors.textMuted}
                  />
                  <Text color={theme.colors.textMuted} style={styles.tabEmptyText}>
                    {t(emptyStateKey)}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              sessionsQuery.isFetchingNextPage ? (
                <View style={styles.paginationLoader}>
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <InboxCard
                item={item}
                locale={locale}
                onPress={() => handleCardPress(item)}
                isRTL={isRTL}
                t={t}
              />
            )}
          />
        )}
      </View>
    </Screen>
  );
}

function InboxCard({
  item,
  locale,
  onPress,
  isRTL,
  t,
}: {
  item: NormalizedInboxItem;
  locale: string;
  onPress: () => void;
  isRTL: boolean;
  t: (key: string) => string;
}) {
  const { theme } = useTheme();

  const avatarBg =
    item.sourceType === "session"
      ? theme.colors.primaryLight
      : item.sourceType === "support"
      ? ((theme.colors.warning ?? "#f59e0b") + "20")
      : ((theme.colors.info ?? "#6366f1") + "20");

  const avatarIcon =
    item.sourceType === "session"
      ? "person"
      : item.sourceType === "support"
      ? "headset"
      : "chatbubbles";

  const avatarColor =
    item.sourceType === "session"
      ? theme.colors.primary
      : item.sourceType === "support"
      ? (theme.colors.warning ?? "#f59e0b")
      : (theme.colors.info ?? "#6366f1");

  const sourceLabel =
    item.sourceType === "session"
      ? t("messages.inbox.sourceSession")
      : item.sourceType === "support"
      ? t("messages.inbox.sourceSupport")
      : t("messages.inbox.sourceFollowup");

  const activityValue = item.latestActivityAt
    ? formatMessageTimestamp(item.latestActivityAt, locale)
    : "-";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View style={[styles.cardAvatar, { backgroundColor: avatarBg }]}>
        <Ionicons name={avatarIcon as any} size={20} color={avatarColor} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.cardTitleRow, isRTL ? styles.cardTitleRowRtl : null]}>
            <Text weight="600" style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: avatarBg },
              ]}
            >
              <Text style={[styles.sourceBadgeText, { color: avatarColor }]}>
                {sourceLabel}
              </Text>
            </View>
          </View>
          {item.unreadCount > 0 ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: avatarColor + "22" },
              ]}
            >
              <Text weight="600" style={[styles.badgeText, { color: avatarColor }]}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {item.subtitle ? (
          <Text
            color={theme.colors.textMuted}
            style={[styles.cardMeta, isRTL ? styles.textRtl : null]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        ) : null}

        <View style={[styles.cardBottomRow, isRTL ? styles.cardBottomRowRtl : null]}>
          <StatusPill sourceType={item.sourceType} status={item.status} theme={theme} t={t} />
          <Text color={theme.colors.textMuted} style={styles.cardTime}>
            {activityValue}
          </Text>
        </View>
      </View>

      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={16}
        color={theme.colors.textMuted}
        style={styles.cardChevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabsBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginEnd: 4,
  },
  tabLabel: {
    fontSize: 14,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorBannerText: {
    fontSize: 13,
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 4,
  },
  tabEmptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  tabEmptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  supportCtaCard: {
    padding: 18,
    gap: 10,
    alignItems: "center",
    marginBottom: 4,
  },
  supportCtaIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(68, 161, 148, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  supportCtaTitle: {
    fontSize: 15,
    textAlign: "center",
  },
  supportCtaDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  supportCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  supportCtaBtnText: {
    color: "#fff",
    fontSize: 15,
  },
  paginationLoader: {
    paddingVertical: 12,
    alignItems: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    gap: 10,
  },
  cardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  cardTitleRowRtl: {
    flexDirection: "row-reverse",
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  badge: {
    minWidth: 24,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
  },
  cardMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  cardBottomRowRtl: {
    flexDirection: "row-reverse",
  },
  textRtl: {
    textAlign: "right",
  },
  cardTime: {
    fontSize: 11,
    flexShrink: 0,
  },
  cardChevron: {
    marginTop: 10,
  },
});
