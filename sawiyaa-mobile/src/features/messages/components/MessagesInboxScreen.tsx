import React, { useMemo, useState } from "react";
import {
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
import { ErrorState, Header, Screen, Skeleton, Text } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useAppDirection } from "../../../i18n/direction";
import {
  sortInboxItemsByActivity,
  type NormalizedInboxItem,
} from "../inbox-types";
import {
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
import { mapCanonicalConversationToInboxItem } from "../inbox-view-model";

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
}: {
  role: MessagesRole;
  /** Kept for existing deep links; all conversations now share one inbox. */
  initialTab?: string;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { isRtl, rowDirection, chevronForward } = useAppDirection();
  const locale = i18n.language || "en";
  const isPatient = role === "patient";
  const isPractitioner = role === "practitioner";

  const canonicalQuery = useCanonicalConversations(role, { page: 1, limit: 100 }, true);

  const allItems = useMemo(() => {
    const conversations = canonicalQuery.data?.items ?? [];
    const mapped: NormalizedInboxItem[] = conversations.map((conversation: CanonicalConversation) =>
      mapCanonicalConversationToInboxItem(conversation, role, locale, t),
    );

    return sortInboxItemsByActivity(mapped);
  }, [canonicalQuery.data?.items, locale, role, t]);

  const isLoadingAny = canonicalQuery.isLoading;
  const hasErrorAny = canonicalQuery.isError;
  const isRefreshing = canonicalQuery.isRefetching;

  const isInitialLoading = isLoadingAny && allItems.length === 0;

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

  return (
    <Screen bg="background" testID="messages-inbox-screen">
      <Header
        title={t("messages.inbox.title", "Messages")}
        showBack={!isPractitioner}
        hideMessages={isPractitioner}
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

      <View style={styles.contentArea}>
        {hasErrorAny && allItems.length > 0 ? (
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

        {hasErrorAny && allItems.length === 0 ? (
          <ErrorState
            title={t("messages.common.errorTitle")}
            message={t("messages.common.errorMessage")}
            retryText={t("messages.common.retry")}
            onRetry={handleRefresh}
          />
        ) : isInitialLoading ? (
          <ConversationListSkeleton />
        ) : (
          <FlatList
            data={allItems}
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
            ListHeaderComponent={null}
            ListEmptyComponent={
              allItems.length === 0 && !isInitialLoading ? (
                <View style={styles.inboxEmptyState}>
                  <View style={[styles.tabEmptyIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={32}
                      color={theme.colors.textMuted}
                    />
                  </View>
                  <Text color={theme.colors.textSecondary} weight="600" style={styles.tabEmptyText}>
                    {t("messages.inbox.emptyTitle")}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <ConversationRow
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

function ConversationListSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <Skeleton width={42} height={42} borderRadius={21} />
          <View style={styles.skeletonCopy}>
            <View style={styles.skeletonHeader}>
              <Skeleton width="48%" height={15} />
              <Skeleton width={48} height={12} />
            </View>
            <Skeleton width="82%" height={13} />
            <Skeleton width="30%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ConversationRow({
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
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const { theme } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const conversation = item.raw as unknown as CanonicalConversation;
  const avatarUrl = conversation.otherParty?.avatarUrl || null;
  const isUnread = item.unreadCount > 0;
  const status = getConversationStatusPresentation(conversation, locale);
  const activity = formatInboxRelativeTime(item.latestActivityAt, locale);
  const preview = item.preview || t("messages.inbox.noPreview");
  const accessibilityLabel = [
    item.title,
    item.subtitle,
    preview,
    activity,
    isUnread ? t("messages.inbox.unreadAccessibility", { count: item.unreadCount }) : null,
  ].filter(Boolean).join(", ");

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      testID={`messages-conversation-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("messages.inbox.openConversationHint")}
      style={[styles.conversationRow, { flexDirection: rowDirection }]}
    >
      <View style={[styles.conversationAvatar, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.borderLight }]}>
        {avatarUrl && !imageFailed ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.conversationAvatarImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.conversationBody}>
        <View style={[styles.conversationHeader, { flexDirection: rowDirection }]}>
          <Text
            weight={isUnread ? "700" : "600"}
            color={isUnread ? theme.colors.primary : theme.colors.textPrimary}
            numberOfLines={1}
            style={[styles.conversationTitle, { textAlign: isRtl ? "right" : "left" }]}
          >
            {item.title}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.conversationTime}>
            {activity}
          </Text>
        </View>
        <Text
          color={isUnread ? theme.colors.textPrimary : theme.colors.textSecondary}
          numberOfLines={1}
          style={[styles.conversationPreview, { textAlign: isRtl ? "right" : "left" }]}
        >
          {preview}
        </Text>
        <View style={[styles.conversationMeta, { flexDirection: rowDirection }]}>
          <Text color={theme.colors.textMuted} style={[styles.conversationContext, { textAlign: isRtl ? "right" : "left" }]}>
            {item.subtitle}
          </Text>
          {status && status.tone !== "active" ? <StatusPill conversation={conversation} locale={locale} /> : null}
          {isUnread ? (
            <View
              style={[styles.badge, { backgroundColor: theme.colors.primary }]}
              accessible
              accessibilityLabel={t("messages.inbox.unreadAccessibility", { count: item.unreadCount })}
            >
              <Text weight="700" style={styles.badgeText} color="#FFFFFF">
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name={chevronForward as any} size={17} color={theme.colors.textMuted} />
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
  // Empty states
  inboxEmptyState: {
    alignItems: "center",
    paddingVertical: 52,
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
  skeletonList: {
    paddingHorizontal: 16,
  },
  skeletonRow: {
    minHeight: 84,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DED0",
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  conversationRow: {
    minHeight: 84,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DED0",
  },
  conversationAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  conversationAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  conversationBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  conversationHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  conversationTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
  },
  conversationTime: {
    fontSize: 11,
  },
  conversationPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  conversationMeta: {
    alignItems: "center",
    gap: 6,
  },
  conversationContext: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 16,
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
});
