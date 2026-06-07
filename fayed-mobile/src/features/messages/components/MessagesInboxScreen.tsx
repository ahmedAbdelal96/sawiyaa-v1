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
import { usePatientSupportTickets } from "../../patient/support/hooks";
import { useMyCareChatRequests } from "../../patient/care-chat/hooks";
import { usePractitionerSupportTickets } from "../../practitioner/support/hooks";
import { usePractitionerCareChatRequests } from "../../practitioner/care-chat/hooks";

type InboxTab = "all" | "sessions" | "support" | "followup";

const TAB_ORDER: InboxTab[] = ["all", "sessions", "support", "followup"];

function statusColor(status: string, theme: any): string {
  if (status === "OPEN" || status === "PENDING" || status === "APPROVED") {
    return theme.colors.success ?? "#22c55e";
  }
  if (status === "IN_PROGRESS" || status === "WAITING_FOR_USER") {
    return theme.colors.warning ?? "#f59e0b";
  }
  if (status === "ESCALATED" || status === "REJECTED") {
    return theme.colors.error;
  }
  return theme.colors.textMuted;
}

type SourceType = "session" | "support" | "care";

function getHumanStatusFallback(
  sourceType: SourceType,
  status: string,
  locale: string,
) {
  const isArabic = locale.startsWith("ar");
  const value = status.trim().toUpperCase();

  if (
    value === "OPEN" ||
    value === "PENDING" ||
    value === "ACTIVE"
  ) {
    return isArabic ? "مفتوح" : "Open";
  }

  if (
    value === "IN_PROGRESS" ||
    value === "WAITING_FOR_USER" ||
    value === "FOLLOW_UP"
  ) {
    return isArabic ? "قيد المتابعة" : "In progress";
  }

  if (value === "READ") {
    return isArabic ? "مقروء" : "Read";
  }

  if (
    value === "CLOSED" ||
    value === "RESOLVED" ||
    value === "EXPIRED" ||
    value === "SUSPENDED"
  ) {
    return isArabic ? "مغلق" : "Closed";
  }

  if (sourceType === "support") {
    return isArabic ? "محادثة الدعم" : "Support conversation";
  }

  if (sourceType === "care") {
    return isArabic ? "متابعة" : "Follow-up";
  }

  return value.replaceAll("_", " ");
}

function getInboxStatusLabel(
  sourceType: SourceType,
  status: string,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
): string {
  if (sourceType === "support") {
    const key = `support.statuses.${status}`;
    const translated = t(key);
    return translated !== key
      ? translated
      : getHumanStatusFallback(sourceType, status, locale);
  }
  if (sourceType === "care") {
    const key = `careChat.requestStatus.${status}`;
    const translated = t(key);
    return translated !== key
      ? translated
      : getHumanStatusFallback(sourceType, status, locale);
  }

  const key = `messages.inbox.statuses.session.${status}`;
  const translated = t(key);
  return translated !== key
    ? translated
    : getHumanStatusFallback(sourceType, status, locale);
}

function StatusPill({
  sourceType,
  status,
  theme,
  t,
  locale,
}: {
  sourceType: SourceType;
  status: string;
  theme: any;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}) {
  const color = statusColor(status, theme);
  const label = getInboxStatusLabel(sourceType, status, t, locale);

  return (
    <View style={[styles.statusPill, { backgroundColor: color + "18" }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

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
  const locale = i18n.language || "en";
  const isPatient = role === "patient";

  const validTabs: InboxTab[] = ["all", "sessions", "support", "followup"];
  const [activeTab, setActiveTab] = useState<InboxTab>(
    initialTab && validTabs.includes(initialTab) ? initialTab : "all",
  );

  const sessionsQuery = useInfiniteGeneralChatConversations(role, { pageSize: 20 }, true);
  useGeneralChatResumeRefresh(role);

  const patientSupportQuery = usePatientSupportTickets({ page: 1, limit: 20 });
  const practitionerSupportQuery = usePractitionerSupportTickets({ page: 1, limit: 20 });
  const supportQuery = isPatient ? patientSupportQuery : practitionerSupportQuery;

  const patientCareQuery = useMyCareChatRequests({ page: 1, limit: 20 });
  const practitionerCareQuery = usePractitionerCareChatRequests({ page: 1, limit: 20 });
  const careQuery = isPatient ? patientCareQuery : practitionerCareQuery;

  const allItems = useMemo(() => {
    const sessionItems: NormalizedInboxItem[] =
      sessionsQuery.data?.pages.flatMap((page) => page.items).map((conversation) =>
        buildSessionInboxItem(conversation, role, locale),
      ) ?? [];

    const supportItems: NormalizedInboxItem[] = (supportQuery.data?.items ?? []).map((ticket) =>
      buildSupportInboxItem(ticket, role, locale),
    );

    const careItems: NormalizedInboxItem[] = (careQuery.data?.items ?? [])
      .filter((request) => request.status === "APPROVED" || request.status === "PENDING")
      .map((request) => buildCareInboxItem(request, role, locale));

    return sortInboxItemsByActivity([...sessionItems, ...supportItems, ...careItems]);
  }, [
    careQuery.data?.items,
    locale,
    role,
    sessionsQuery.data?.pages,
    supportQuery.data?.items,
  ]);

  const tabItems = useMemo(() => {
    if (activeTab === "all") return allItems;
    if (activeTab === "sessions") return allItems.filter((item) => item.sourceType === "session");
    if (activeTab === "support") return allItems.filter((item) => item.sourceType === "support");
    if (activeTab === "followup") return allItems.filter((item) => item.sourceType === "care");
    return allItems;
  }, [allItems, activeTab]);

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
    const pathname = isPatient
      ? "/(patient)/support/new"
      : "/(practitioner)/support/new";
    router.push(
      {
        pathname,
        params: {
          returnTo: isPatient
            ? "/(patient)/messages?tab=support"
            : "/(practitioner)/messages?tab=support",
        },
      } as any,
    );
  };

  const emptyStateKey = useMemo(() => {
    if (activeTab === "sessions") return "messages.inbox.tabEmptySessions";
    if (activeTab === "support") return "messages.inbox.tabEmptySupport";
    if (activeTab === "followup") return "messages.inbox.tabEmptyFollowup";
    return "messages.inbox.tabEmpty";
  }, [activeTab]);

  return (
    <Screen bg="background">
      <Header title={t("messages.inbox.title", "Messages")} showBack />

      {role === "practitioner" ? (
        <Card
          variant="outlined"
          padding="sm"
          style={[
            styles.introCard,
            {
              borderColor: theme.colors.borderLight,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.introRow}>
            <View style={[styles.introIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.introCopy}>
              <Text weight="700" style={styles.introTitle} color={theme.colors.textPrimary}>
                {t("messages.inbox.practitionerIntroTitle", "التواصل")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.introSubtitle}>
                {t(
                  "messages.inbox.practitionerIntroSubtitle",
                  "كل محادثات الجلسات والدعم والمتابعة في مكان واحد.",
                )}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

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
        {TAB_ORDER.map((tab) => {
          const active = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.78}
              style={[
                styles.tabBtn,
                {
                  borderColor: active ? theme.colors.primary : theme.colors.borderLight,
                  backgroundColor: active ? theme.colors.primaryLight : theme.colors.surface,
                },
              ]}
            >
              <Text
                weight={active ? "700" : "500"}
                style={[
                  styles.tabLabel,
                  {
                    color: active ? theme.colors.primary : theme.colors.textMuted,
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
          );
        })}
      </View>

      {activeTab === "support" ? (
        <View
          style={[
            styles.supportActionRow,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Text
            weight="600"
            style={[styles.supportActionTitle, isRTL ? styles.textRtl : null]}
            color={theme.colors.textPrimary}
          >
            {t("messages.tabs.support")}
          </Text>
          <TouchableOpacity
            onPress={handleStartSupport}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t("messages.inbox.supportCtaBtn")}
            style={[
              styles.supportActionButton,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text
              weight="600"
              style={styles.supportActionButtonText}
              color={theme.colors.primary}
            >
              {t("messages.inbox.supportCtaBtn")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.contentArea}>
        {hasErrorAny && tabItems.length > 0 ? (
          <TouchableOpacity
            style={[
              styles.errorBanner,
              { backgroundColor: (theme.colors.error ?? "#ef4444") + "12" },
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

        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text color={theme.colors.textSecondary} style={styles.loadingText}>
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
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              activeTab === "support" && tabItems.length === 0 ? (
                <Card
                  variant="elevated"
                  padding="sm"
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
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text weight="600" style={styles.supportCtaTitle}>
                    {t("messages.inbox.supportCtaTitle")}
                  </Text>
                  <Text color={theme.colors.textSecondary} style={styles.supportCtaDesc}>
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
                      size={16}
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
                    size={26}
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
      ? `${theme.colors.warning ?? "#f59e0b"}20`
      : `${theme.colors.info ?? "#6366f1"}20`;

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
      ? theme.colors.warning ?? "#f59e0b"
      : theme.colors.info ?? "#6366f1";

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
            <View style={[styles.sourceBadge, { backgroundColor: avatarBg }]}>
              <Text style={[styles.sourceBadgeText, { color: avatarColor }]}>
                {sourceLabel}
              </Text>
            </View>
          </View>
          {item.unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: `${avatarColor}22` }]}>
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
              <StatusPill
                sourceType={item.sourceType}
                status={item.status}
                theme={theme}
                t={t}
                locale={locale}
              />
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
  introCard: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  introIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  introCopy: {
    flex: 1,
  },
  introTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  introSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  tabsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
  },
  tabLabel: {
    fontSize: 12,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
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
    paddingVertical: 32,
    gap: 10,
  },
  tabEmptyText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  supportCtaCard: {
    padding: 14,
    gap: 8,
    alignItems: "center",
    marginBottom: 4,
  },
  supportCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  supportCtaTitle: {
    fontSize: 14,
  },
  supportCtaDesc: {
    fontSize: 11,
    textAlign: "center",
  },
  supportCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  supportCtaBtnText: {
    fontSize: 11,
  },
  supportActionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 10,
  },
  supportActionTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  supportActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  supportActionButtonText: {
    fontSize: 11,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleRow: {
    flex: 1,
    gap: 6,
  },
  cardTitleRowRtl: {
    alignItems: "flex-end",
  },
  cardTitle: {
    fontSize: 13,
    flexShrink: 1,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourceBadgeText: {
    fontSize: 9,
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
  },
  cardBottomRowRtl: {
    flexDirection: "row-reverse",
  },
  cardTime: {
    fontSize: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "600",
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 9,
  },
  cardChevron: {
    marginStart: 2,
  },
  textRtl: {
    textAlign: "right",
  },
  paginationLoader: {
    paddingVertical: 14,
  },
});
