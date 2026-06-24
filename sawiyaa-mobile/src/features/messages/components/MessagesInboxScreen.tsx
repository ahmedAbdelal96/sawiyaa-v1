import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Header, Screen, Text } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useAppDirection } from "../../../i18n/direction";
import {
  buildCareInboxItem,
  buildSessionInboxItem,
  buildSupportInboxItem,
  sortInboxItemsByActivity,
  type NormalizedInboxItem,
} from "../inbox-types";
import { formatMessageTimestamp } from "../utils";
import type {
  MessagesRole,
  GeneralChatConversationListItemDto,
} from "../types";
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

function isTextEnglish(text?: string | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  const firstAlpha = trimmed.match(/[a-zA-Z]/);
  const firstArabic = trimmed.match(/[\u0600-\u06FF]/);
  if (firstAlpha) {
    if (!firstArabic) return true;
    return trimmed.indexOf(firstAlpha[0]) < trimmed.indexOf(firstArabic[0]);
  }
  return false;
}

function statusColor(status: string): string {
  const value = status.trim().toUpperCase();
  if (value === "OPEN" || value === "PENDING" || value === "APPROVED" || value === "ACTIVE") {
    return "#24564F"; // Deep Teal for active/open
  }
  if (value === "IN_PROGRESS" || value === "WAITING_FOR_USER" || value === "FOLLOW_UP") {
    return "#C8A979"; // Warm Gold for warning/pending action
  }
  if (value === "ESCALATED" || value === "REJECTED") {
    return "#ef4444"; // standard error red
  }
  return "#6F7E78"; // Muted Text
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
  t,
  locale,
}: {
  sourceType: SourceType;
  status: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}) {
  const color = statusColor(status);
  const label = getInboxStatusLabel(sourceType, status, t, locale);

  return (
    <View style={[styles.statusPill, { backgroundColor: color + "12", borderColor: color + "24" }]}>
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
  const { isRtl, rowDirection, chevronForward } = useAppDirection();
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
              borderColor: "#E8DED0",
              backgroundColor: "#FCFAF6", // Warm Card
            },
          ]}
        >
          <View style={[styles.introRow, { flexDirection: rowDirection }]}>
            <View style={[styles.introIconWrap, { backgroundColor: "#EEF4EF" }]}>
              <Ionicons name="chatbubbles-outline" size={16} color="#24564F" />
            </View>
            <View style={styles.introCopy}>
              <Text weight="700" style={[styles.introTitle, { textAlign: isRtl ? "right" : "left" }]} color="#1F332F">
                {t("messages.inbox.practitionerIntroTitle", "التواصل")}
              </Text>
              <Text color="#6F7E78" style={[styles.introSubtitle, { textAlign: isRtl ? "right" : "left" }]}>
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
            flexDirection: rowDirection,
          },
        ]}
      >
        {TAB_ORDER.map((tab) => {
          const active = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                tab === "all"
                  ? t("messages.tabs.all")
                  : tab === "sessions"
                  ? t("messages.tabs.sessions")
                  : tab === "support"
                  ? t("messages.tabs.support")
                  : t("messages.tabs.followup")
              }
              style={[
                styles.tabBtn,
                {
                  borderColor: active ? "transparent" : "#E8DED0",
                  backgroundColor: active ? "#24564F" : "#FFFFFF",
                },
              ]}
            >
              <Text
                weight={active ? "700" : "500"}
                style={[
                  styles.tabLabel,
                  {
                    color: active ? "#FFFFFF" : "#6F7E78",
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
              flexDirection: rowDirection,
            },
          ]}
        >
          <Text
            weight="600"
            style={[styles.supportActionTitle, { textAlign: isRtl ? "right" : "left" }]}
            color="#1F332F"
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
              { backgroundColor: "#EEF4EF", borderColor: "#D9E4DB" },
            ]}
          >
            <Ionicons name="add" size={16} color="#24564F" />
            <Text
              weight="600"
              style={styles.supportActionButtonText}
              color="#24564F"
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
              { backgroundColor: `${theme.colors.error}12` },
            ]}
            onPress={handleRefresh}
            activeOpacity={0.85}
          >
            <Ionicons
              name="warning"
              size={15}
              color={theme.colors.error}
            />
            <Text
              style={[
                styles.errorBannerText,
                { color: theme.colors.error, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {t("messages.common.errorBanner")}
            </Text>
          </TouchableOpacity>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#24564F" size="large" />
            <Text color="#6F7E78" style={styles.loadingText}>
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
                tintColor="#24564F"
                colors={["#24564F"]}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              activeTab === "support" && tabItems.length === 0 ? (
                <Card
                  variant="outlined"
                  padding="sm"
                  style={[
                    styles.supportCtaCard,
                    {
                      borderColor: "#E8DED0",
                      backgroundColor: "#FFFFFF",
                    },
                  ]}
                >
                  <View style={[styles.supportCtaIcon, { backgroundColor: "#EEF4EF" }]}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={20}
                      color="#24564F"
                    />
                  </View>
                  <Text weight="700" style={styles.supportCtaTitle} color="#1F332F">
                    {t("messages.inbox.supportCtaTitle")}
                  </Text>
                  <Text color="#6F7E78" style={styles.supportCtaDesc}>
                    {t("messages.inbox.supportCtaDesc")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.supportCtaBtn,
                      { backgroundColor: "#24564F" },
                    ]}
                    onPress={handleStartSupport}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text weight="600" style={styles.supportCtaBtnText} color="#FFFFFF">
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
                        ? "headset-outline"
                        : "chatbubbles-outline"
                    }
                    size={28}
                    color="#6F7E78"
                  />
                  <Text color="#6F7E78" style={styles.tabEmptyText}>
                    {t(emptyStateKey)}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              sessionsQuery.isFetchingNextPage ? (
                <View style={styles.paginationLoader}>
                  <ActivityIndicator color="#24564F" size="small" />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <InboxCard
                item={item}
                locale={locale}
                onPress={() => handleCardPress(item)}
                isRtl={isRtl}
                rowDirection={rowDirection}
                chevronForward={chevronForward}
                role={role}
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
  isRtl,
  rowDirection,
  chevronForward,
  role,
  t,
}: {
  item: NormalizedInboxItem;
  locale: string;
  onPress: () => void;
  isRtl: boolean;
  rowDirection: "row" | "row-reverse";
  chevronForward: string;
  role: MessagesRole;
  t: (key: string) => string;
}) {
  // Check if existing participants have avatarUrl
  const avatarUrl = useMemo(() => {
    if (item.sourceType === "session") {
      const conversation = item.raw as GeneralChatConversationListItemDto;
      const counterpart = conversation.participants?.find(
        (p) =>
          p.role === (role === "patient" ? "PRACTITIONER" : "PATIENT"),
      );
      return counterpart?.identity?.avatarUrl || null;
    }
    return null;
  }, [item, role]);

  const avatarBg =
    item.sourceType === "session"
      ? "#EEF4EF"
      : item.sourceType === "support"
      ? "#FCFAF6"
      : "#EEF4EF";

  const avatarIcon =
    item.sourceType === "session"
      ? "chatbubble-ellipses-outline"
      : item.sourceType === "support"
      ? "headset-outline"
      : "repeat-outline";

  const avatarColor =
    item.sourceType === "session"
      ? "#24564F" // Deep Teal
      : item.sourceType === "support"
      ? "#C8A979" // Gold
      : "#A7BFAE"; // Soft Sage

  const sourceLabel =
    item.sourceType === "session"
      ? t("messages.inbox.sourceSession")
      : item.sourceType === "support"
      ? t("messages.inbox.sourceSupport")
      : t("messages.inbox.sourceFollowup");

  const activityValue = item.latestActivityAt
    ? formatMessageTimestamp(item.latestActivityAt, locale)
    : "-";

  const isUnread = item.unreadCount > 0;

  const isEngTitle = isTextEnglish(item.title);
  const isEngPreview = isTextEnglish(item.preview);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.card,
        {
          borderColor: "#E8DED0",
          backgroundColor: "#FFFFFF",
          flexDirection: rowDirection,
        },
      ]}
    >
      <View style={[styles.cardAvatar, { backgroundColor: avatarBg }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.cardAvatarImage}
          />
        ) : (
          <Ionicons name={avatarIcon as any} size={20} color={avatarColor} />
        )}
      </View>

      <View style={styles.cardBody}>
        {/* Row 1: Title */}
        <View style={[styles.cardTitleRow, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text
            weight={isUnread ? "700" : "600"}
            style={[
              styles.cardTitle,
              {
                textAlign: isEngTitle ? "left" : (isRtl ? "right" : "left"),
                writingDirection: isEngTitle ? "ltr" : (isRtl ? "rtl" : "ltr"),
              },
            ]}
            color={isUnread ? "#24564F" : "#1F332F"}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        {/* Row 2: Preview (if available) */}
        {item.preview ? (
          <Text
            color="#6F7E78"
            style={[
              styles.cardPreviewText,
              {
                textAlign: isEngPreview ? "left" : (isRtl ? "right" : "left"),
                writingDirection: isEngPreview ? "ltr" : (isRtl ? "rtl" : "ltr"),
              },
            ]}
            numberOfLines={1}
          >
            {item.preview}
          </Text>
        ) : null}

        {/* Row 3: category/status/timestamp/unread in a clean layout */}
        <View
          style={[
            styles.cardBottomRow,
            {
              flexDirection: rowDirection,
            },
          ]}
        >
          <View style={[styles.metadataGroup, { flexDirection: rowDirection }]}>
            <View style={[styles.sourceBadge, { backgroundColor: avatarBg, borderColor: "#D9E4DB", borderWidth: 1 }]}>
              <Text style={[styles.sourceBadgeText, { color: isUnread ? "#24564F" : avatarColor }]}>
                {sourceLabel}
              </Text>
            </View>
            <StatusPill
              sourceType={item.sourceType}
              status={item.status}
              t={t}
              locale={locale}
            />
          </View>

          <View style={[styles.metadataGroup, { flexDirection: rowDirection }]}>
            <Text color="#6F7E78" style={styles.cardTime}>
              {activityValue}
            </Text>
            {isUnread ? (
              <View style={[styles.badge, { backgroundColor: "#24564F" }]}>
                <Text weight="700" style={styles.badgeText} color="#FFFFFF">
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Ionicons
        name={chevronForward as any}
        size={16}
        color="#6F7E78"
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
    borderWidth: 1,
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  introRow: {
    alignItems: "center",
    gap: 12,
  },
  introIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  introCopy: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  introSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  tabsBar: {
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tabBtn: {
    paddingVertical: 7,
    paddingHorizontal: 13,
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
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
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
    paddingVertical: 48,
    gap: 12,
  },
  tabEmptyText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  supportCtaCard: {
    padding: 16,
    gap: 10,
    alignItems: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 18,
  },
  supportCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  supportCtaTitle: {
    fontSize: 15,
  },
  supportCtaDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  supportCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginTop: 4,
  },
  supportCtaBtnText: {
    fontSize: 12,
  },
  supportActionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 10,
  },
  supportActionTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  supportActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  supportActionButtonText: {
    fontSize: 11,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    elevation: 2,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    width: "100%",
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    lineHeight: 19,
    width: "100%",
  },
  cardPreviewText: {
    fontSize: 12.5,
    lineHeight: 17.5,
    marginTop: 2,
    marginBottom: 2,
    color: "#6F7E78",
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  cardBottomRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  metadataGroup: {
    alignItems: "center",
    gap: 6,
  },
  cardTime: {
    fontSize: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "600",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 8.5,
  },
  cardChevron: {
    marginHorizontal: 2,
  },
  paginationLoader: {
    paddingVertical: 14,
  },
});
