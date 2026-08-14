import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Header, Screen, Text } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useAppDirection } from "../../../i18n/direction";
import {
  sortInboxItemsByActivity,
  type NormalizedInboxItem,
} from "../inbox-types";
import {
  getConversationHeaderPresentation,
  getConversationStatusPresentation,
  CONVERSATION_STATUS_TONE_COLORS,
  formatInboxRelativeTime,
} from "../utils";
import type {
  MessagesRole,
  CanonicalConversation,
} from "../types";
import {
  useCanonicalConversations,
} from "../hooks";

const FALLBACK_AVATAR = require("../../../../assets/user.avif");

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

function StatusPill({
  conversation,
  locale,
}: {
  conversation: CanonicalConversation;
  locale: string;
}) {
  const status = getConversationStatusPresentation(conversation, locale);
  if (!status) return null;
  const color = CONVERSATION_STATUS_TONE_COLORS[status.tone];

  return (
    <View style={[styles.statusPill, { backgroundColor: color + "14", borderColor: color + "30" }]}>
      <Text style={[styles.statusPillText, { color }]} weight="600">{status.label}</Text>
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

  const canonicalQuery = useCanonicalConversations(role, { page: 1, limit: 100 }, true);

  const allItems = useMemo(() => {
    const conversations = canonicalQuery.data?.items ?? [];
    const mapped: NormalizedInboxItem[] = conversations.map((conversation) => {
      const header = getConversationHeaderPresentation(conversation, role, t);

      const preview = conversation.lastMessage?.body ||
        (locale.startsWith("ar") ? "لا توجد رسائل بعد." : "No messages yet.");

      const destinationRoute = role === "patient"
        ? `/(patient)/messages/${conversation.conversationId}`
        : `/(practitioner)/messages/${conversation.conversationId}`;

      return {
        id: conversation.conversationId,
        sourceType: conversation.type.toLowerCase() as "session" | "support" | "care",
        title: header.title,
        subtitle: header.subtitle,
        preview,
        latestActivityAt: conversation.lastActivityAt || conversation.createdAt,
        unreadCount: conversation.unreadCount,
        status: conversation.status,
        destinationRoute,
        raw: conversation as any,
      };
    });

    return sortInboxItemsByActivity(mapped);
  }, [canonicalQuery.data?.items, locale, role, t]);

  const tabItems = useMemo(() => {
    if (activeTab === "all") return allItems;
    if (activeTab === "sessions") {
      return allItems.filter((item) => {
        if (item.sourceType !== "session") return false;
        const conversation = item.raw as unknown as CanonicalConversation;
        return Boolean(conversation.lastMessage) || conversation.canSend;
      });
    }
    if (activeTab === "support") return allItems.filter((item) => item.sourceType === "support");
    if (activeTab === "followup") return allItems.filter((item) => item.sourceType === "care");
    return allItems;
  }, [allItems, activeTab]);

  const isLoadingAny = canonicalQuery.isLoading;
  const hasErrorAny = canonicalQuery.isError;
  const isRefreshing = canonicalQuery.isRefetching;

  const isInitialLoading = isLoadingAny && tabItems.length === 0;

  const handleRefresh = () => {
    void canonicalQuery.refetch();
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

  const getTabIcon = (tab: InboxTab): keyof typeof Ionicons.glyphMap => {
    switch (tab) {
      case "all":
        return "chatbubbles-outline";
      case "sessions":
        return "videocam-outline";
      case "support":
        return "headset-outline";
      case "followup":
        return "repeat-outline";
    }
  };

  return (
    <Screen bg="background" testID="messages-inbox-screen">
      <Header
        title={t("messages.inbox.title", "Messages")}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={handleStartSupport}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t("messages.inbox.supportCtaBtn")}
            style={[styles.headerSupportBtn, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary + "30" }]}
          >
            <Ionicons name="headset" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Practitioner intro card */}
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
          <View style={[styles.introRow, { flexDirection: rowDirection }]}>
            <View style={[styles.introIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="chatbubbles" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.introCopy}>
              <Text weight="bold" style={[styles.introTitle, { textAlign: isRtl ? "right" : "left" }]} color={theme.colors.textPrimary}>
                {t("messages.inbox.practitionerIntroTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.introSubtitle, { textAlign: isRtl ? "right" : "left" }]}>
                {t("messages.inbox.practitionerIntroSubtitle")}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* ── Filter Tabs Bar (for Patient and Practitioner) ── */}
      <View style={styles.filterScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsBar, { flexDirection: rowDirection }]}
        >
          {TAB_ORDER.map((tab) => {
            const active = activeTab === tab;
            const iconName = getTabIcon(tab);

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={14}
                  color={active ? "#FFFFFF" : theme.colors.textSecondary}
                />
                <Text
                  weight={active ? "bold" : "600"}
                  style={styles.tabLabel}
                  color={active ? "#FFFFFF" : theme.colors.textSecondary}
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
        </ScrollView>
      </View>

      {/* ── New Support Ticket Action Strip ── */}
      <View style={[styles.supportActionRow, { flexDirection: rowDirection }]}>
        <View style={styles.supportActionLabelGroup}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.colors.primary} />
          <Text weight="bold" style={styles.supportActionTitle} color={theme.colors.textPrimary}>
            {t("messages.inbox.supportHeaderTitle", "محادثات الدعم والمتابعة")}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleStartSupport}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={[
            styles.supportActionButton,
            { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          ]}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text weight="bold" style={styles.supportActionButtonText} color="#FFFFFF">
            {t("messages.inbox.supportCtaBtn")}
          </Text>
        </TouchableOpacity>
      </View>

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
              size={16}
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
                  padding="md"
                  style={[
                    styles.supportCtaCard,
                    {
                      borderColor: theme.colors.borderLight,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <View style={[styles.supportCtaIcon, { backgroundColor: theme.colors.primaryLight }]}>
                    <Ionicons
                      name="headset"
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text weight="bold" style={styles.supportCtaTitle} color={theme.colors.textPrimary}>
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
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text weight="bold" style={styles.supportCtaBtnText} color="#FFFFFF">
                      {t("messages.inbox.supportCtaBtn")}
                    </Text>
                  </TouchableOpacity>
                </Card>
              ) : null
            }
            ListEmptyComponent={
              tabItems.length === 0 && !isInitialLoading ? (
                <View style={styles.tabEmptyState}>
                  <View style={[styles.tabEmptyIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
                    <Ionicons
                      name={
                        activeTab === "sessions"
                          ? "calendar-outline"
                          : activeTab === "support"
                          ? "headset-outline"
                          : "chatbubbles-outline"
                      }
                      size={32}
                      color={theme.colors.textMuted}
                    />
                  </View>
                  <Text color={theme.colors.textSecondary} weight="600" style={styles.tabEmptyText}>
                    {t(emptyStateKey)}
                  </Text>
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
  t,
}: {
  item: NormalizedInboxItem;
  locale: string;
  onPress: () => void;
  isRtl: boolean;
  rowDirection: "row" | "row-reverse";
  chevronForward: string;
  t: (key: string) => string;
}) {
  const { theme } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  const avatarUrl = useMemo(() => {
    const conversation = item.raw as unknown as CanonicalConversation;
    return conversation?.otherParty?.avatarUrl || null;
  }, [item]);

  const avatarBg =
    item.sourceType === "session"
      ? theme.colors.primaryLight
      : item.sourceType === "support"
      ? "rgba(200, 169, 121, 0.15)"
      : theme.colors.surfaceTertiary;

  const avatarIcon =
    item.sourceType === "session"
      ? "chatbubble-ellipses"
      : item.sourceType === "support"
      ? "headset"
      : "repeat";

  const avatarColor =
    item.sourceType === "session"
      ? theme.colors.primary
      : item.sourceType === "support"
      ? "#C8A979"
      : theme.colors.textSecondary;

  const sourceLabel =
    item.sourceType === "session"
      ? t("messages.inbox.sourceSession")
      : item.sourceType === "support"
      ? t("messages.inbox.sourceSupport")
      : t("messages.inbox.sourceFollowup");

  const activityValue = item.latestActivityAt
    ? formatInboxRelativeTime(item.latestActivityAt, locale)
    : "-";

  const rawConversation = item.raw as unknown as CanonicalConversation;
  const isUnread = item.unreadCount > 0;
  const isEngTitle = isTextEnglish(item.title);
  const isEngPreview = isTextEnglish(item.preview);
  const showAvatarImage = avatarUrl && !imageFailed;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.card,
        {
          borderColor: isUnread ? theme.colors.primary + "50" : theme.colors.borderLight,
          backgroundColor: isUnread ? theme.colors.primaryLight + "30" : theme.colors.surface,
          flexDirection: rowDirection,
        },
      ]}
    >
      {/* Avatar / Icon */}
      <View style={[styles.cardAvatar, { backgroundColor: avatarBg, borderColor: theme.colors.borderLight }]}>
        {showAvatarImage ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.cardAvatarImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Ionicons name={avatarIcon as any} size={20} color={avatarColor} />
        )}
      </View>

      {/* Main Content */}
      <View style={styles.cardBody}>
        <View style={[styles.cardTitleRow, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text
            weight={isUnread ? "bold" : "600"}
            style={[
              styles.cardTitle,
              {
                textAlign: isEngTitle ? "left" : (isRtl ? "right" : "left"),
                writingDirection: isEngTitle ? "ltr" : (isRtl ? "rtl" : "ltr"),
              },
            ]}
            color={isUnread ? theme.colors.primary : theme.colors.textPrimary}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        {item.preview ? (
          <Text
            color={isUnread ? theme.colors.textPrimary : theme.colors.textSecondary}
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

        {/* Footer Badges & Date */}
        <View
          style={[
            styles.cardBottomRow,
            {
              flexDirection: rowDirection,
            },
          ]}
        >
          <View style={[styles.metadataGroup, { flexDirection: rowDirection }]}>
            <View style={[styles.sourceBadge, { backgroundColor: avatarBg, borderColor: avatarColor + "30" }]}>
              <Text weight="600" style={[styles.sourceBadgeText, { color: avatarColor }]}>
                {sourceLabel}
              </Text>
            </View>
            {rawConversation ? (
              <StatusPill
                conversation={rawConversation}
                locale={locale}
              />
            ) : null}
          </View>

          <View style={[styles.metadataGroup, { flexDirection: rowDirection }]}>
            <Text color={theme.colors.textMuted} style={styles.cardTime}>
              {activityValue}
            </Text>
            {isUnread ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text weight="bold" style={styles.badgeText} color="#FFFFFF">
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons
        name={chevronForward as any}
        size={16}
        color={theme.colors.textMuted}
        style={styles.cardChevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerSupportBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // Practitioner intro card
  introCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 16,
  },
  introRow: {
    alignItems: "center",
    gap: 12,
  },
  introIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  introCopy: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  introSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  // Filter Tabs
  filterScrollWrap: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabsBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 13,
  },

  // Support Action Bar
  supportActionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
  },
  supportActionLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  supportActionTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  supportActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  supportActionButtonText: {
    fontSize: 12,
  },

  // Content Area
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
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

  // Empty states
  tabEmptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  tabEmptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabEmptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  // Support CTA card inside empty tab
  supportCtaCard: {
    padding: 20,
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 18,
  },
  supportCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  supportCtaTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  supportCtaDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  supportCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 4,
  },
  supportCtaBtnText: {
    fontSize: 13,
  },

  // Inbox Card
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    alignItems: "center",
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    width: "100%",
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 21,
    width: "100%",
  },
  cardPreviewText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 2,
  },
  cardBottomRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  metadataGroup: {
    alignItems: "center",
    gap: 6,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 10,
  },
  cardTime: {
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
  },
  cardChevron: {
    marginHorizontal: 2,
  },
});
