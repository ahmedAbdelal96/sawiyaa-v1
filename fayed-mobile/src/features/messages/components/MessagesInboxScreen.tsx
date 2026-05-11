import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  CompactActionRow,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
} from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { resolveMediaUrl } from "../../../lib/resolve-media-url";
import {
  getConversationDisplayName,
  getConversationLatestPreview,
  getConversationPrimaryParticipant,
  getConversationStatusTone,
  getConversationSubLabel,
  getParticipantAvatarUrl,
  getParticipantInitials,
  getParticipantSubtitle,
  uniqByConversationId,
  formatMessageTimestamp,
} from "../utils";
import type {
  GeneralChatConversationListItemDto,
  MessagesRole,
} from "../types";
import {
  useGeneralChatUnreadSummary,
  useInfiniteGeneralChatConversations,
  useGeneralChatResumeRefresh,
} from "../hooks";

type MessagesInboxScreenProps = {
  role: MessagesRole;
};

function getConversationActivityValue(
  conversation: GeneralChatConversationListItemDto,
  locale: string,
) {
  return formatMessageTimestamp(conversation.latestActivityAt, locale);
}

export function MessagesInboxScreen({ role }: MessagesInboxScreenProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isRTL = I18nManager.isRTL;

  const unreadSummaryQuery = useGeneralChatUnreadSummary(role, true, {
    refetchInterval: 30_000,
  });
  const conversationsQuery = useInfiniteGeneralChatConversations(
    role,
    { pageSize: 20 },
    true,
  );
  useGeneralChatResumeRefresh(role);

  const locale = i18n.language || "en";
  const hasUserInteractedRef = useRef(false);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const autoFillInFlightRef = useRef(false);

  const conversations = useMemo(() => {
    const pages = conversationsQuery.data?.pages ?? [];
    const rows = pages.flatMap((page) => page.items);

    return uniqByConversationId(rows).sort((left, right) => {
      const leftAt = new Date(left.latestActivityAt).getTime();
      const rightAt = new Date(right.latestActivityAt).getTime();

      if (leftAt !== rightAt) {
        return rightAt - leftAt;
      }

      return left.conversationId.localeCompare(right.conversationId);
    });
  }, [conversationsQuery.data?.pages]);

  const unreadSummary = unreadSummaryQuery.data?.item ?? null;
  const isInitialLoading = conversationsQuery.isLoading && !conversationsQuery.data;
  const isInitialError = conversationsQuery.isError && !conversationsQuery.data;
  const isEmpty = !isInitialLoading && !isInitialError && conversations.length === 0;
  const isRefreshing = conversationsQuery.isRefetching && !conversationsQuery.isFetchingNextPage;

  const handleRefresh = () => {
    void conversationsQuery.refetch();
    void unreadSummaryQuery.refetch();
  };

  const maybeAutoFillViewport = useCallback(async () => {
    if (hasUserInteractedRef.current) {
      return;
    }

    if (
      autoFillInFlightRef.current ||
      conversationsQuery.isFetchingNextPage ||
      !conversationsQuery.hasNextPage
    ) {
      return;
    }

    if (!listViewportHeightRef.current || !listContentHeightRef.current) {
      return;
    }

    if (listContentHeightRef.current > listViewportHeightRef.current) {
      return;
    }

    autoFillInFlightRef.current = true;
    try {
      await conversationsQuery.fetchNextPage();
    } finally {
      autoFillInFlightRef.current = false;
    }
  }, [conversationsQuery]);

  useEffect(() => {
    void maybeAutoFillViewport();
  }, [
    conversations.length,
    conversationsQuery.hasNextPage,
    conversationsQuery.isFetchingNextPage,
    maybeAutoFillViewport,
  ]);

  const emptyActionLabel =
    role === "patient"
      ? t("messages.inbox.emptyActionPatient", "View sessions")
      : t("messages.inbox.emptyActionPractitioner", "View sessions");
  const supportActionLabel =
    role === "patient"
      ? t("messages.inbox.supportActionPatient", "Need help?")
      : t("messages.inbox.supportActionPractitioner", "Need help?");

  const buildThreadHref = (conversationId: string) =>
    role === "patient"
      ? `/(patient)/messages/${conversationId}`
      : `/(practitioner)/messages/${conversationId}`;

  const buildSupportHref = () =>
    role === "patient"
      ? "/(patient)/support"
      : "/(practitioner)/support";

  return (
    <ListPageScaffold
      title={t("messages.inbox.title", "Messages")}
      showBack
      loading={isInitialLoading}
      loadingMessage={t("messages.common.loading", "Loading conversations...")}
      error={isInitialError}
      errorTitle={t("messages.common.errorTitle", "Could not load messages")}
      errorMessage={t(
        "messages.common.errorMessage",
        "Please try again in a moment.",
      )}
      onRetry={handleRefresh}
      retryText={t("messages.common.retry", "Try again")}
      empty={isEmpty}
      emptyTitle={t("messages.inbox.emptyTitle", "No conversations yet")}
      emptyDescription={t(
        "messages.inbox.emptyDescription",
        role === "patient"
          ? "Open a session to start a conversation with your practitioner."
          : "Open a session to continue practitioner conversations.",
      )}
      emptyActionLabel={emptyActionLabel}
      onEmptyAction={() =>
        router.push(
          (role === "patient" ? "/(patient)/sessions" : "/(practitioner)/sessions") as any,
        )
      }
    >
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onLayout={(event) => {
          listViewportHeightRef.current = event.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, height) => {
          listContentHeightRef.current = height;
          void maybeAutoFillViewport();
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onScrollBeginDrag={() => {
          hasUserInteractedRef.current = true;
        }}
        onMomentumScrollBegin={() => {
          hasUserInteractedRef.current = true;
        }}
        onEndReached={() => {
          if (!hasUserInteractedRef.current) {
            return;
          }

          if (conversationsQuery.hasNextPage && !conversationsQuery.isFetchingNextPage) {
            void conversationsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Card
              variant="elevated"
              padding="lg"
              style={[
                styles.startCard,
                {
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <SectionHeader
                title={t("messages.inbox.startTitle", "Start a conversation")}
                subtitle={t(
                  "messages.inbox.startSubtitle",
                  role === "patient"
                    ? "Open a session to chat with your practitioner, or reach support for help with your account."
                    : "Open a session to continue care conversations, or use support if you need help.",
                )}
              />
              <View style={styles.startActions}>
                <CompactActionRow
                  label={t("messages.inbox.startSessions", "View sessions")}
                  onPress={() =>
                    router.push(
                      (role === "patient"
                        ? "/(patient)/sessions"
                        : "/(practitioner)/sessions") as any,
                    )
                  }
                />
                <CompactActionRow
                  label={supportActionLabel}
                  onPress={() => router.push(buildSupportHref() as any)}
                />
              </View>
            </Card>

            <Card
              variant="elevated"
              padding="lg"
              style={[
                styles.summaryCard,
                {
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <SectionHeader
                title={t("messages.inbox.summaryTitle", "Inbox summary")}
                subtitle={t(
                  "messages.inbox.summarySubtitle",
                  "A quick look at unread conversations and messages.",
                )}
              />
              <View style={styles.summaryRows}>
                <SummaryRow
                  label={t(
                    "messages.inbox.summary.unreadMessages",
                    "Unread messages",
                  )}
                  value={unreadSummary?.totalUnreadMessages ?? 0}
                />
                <SummaryRow
                  label={t(
                    "messages.inbox.summary.unreadConversations",
                    "Unread conversations",
                  )}
                  value={unreadSummary?.totalUnreadConversations ?? 0}
                />
              </View>
            </Card>
          </View>
        }
        ListEmptyComponent={null}
        ListFooterComponent={
          <View style={styles.footerState}>
            {conversationsQuery.isFetchingNextPage ? (
              <View style={styles.nextPageState}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text color={theme.colors.textSecondary} style={styles.footerText}>
                  {t("messages.common.loadingMore", "Loading more conversations...")}
                </Text>
              </View>
            ) : conversationsQuery.isFetchNextPageError ? (
              <TouchableOpacity
                style={[
                  styles.retryState,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surfaceSecondary,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => void conversationsQuery.fetchNextPage()}
              >
                <Text weight="600" style={{ color: theme.colors.primary }}>
                  {t("messages.common.retryNext", "Try again")}
                </Text>
              </TouchableOpacity>
            ) : conversationsQuery.hasNextPage ? null : conversations.length > 0 ? (
              <Text color={theme.colors.textSecondary} style={styles.endOfListText}>
                {t(
                  "messages.common.endOfList",
                  "You have reached the end of the conversation list.",
                )}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            role={role}
            locale={locale}
            currentUserId={user?.id ?? null}
            onPress={() => router.push(buildThreadHref(item.conversationId) as any)}
          />
        )}
      />
    </ListPageScaffold>
  );
}

function ConversationCard({
  conversation,
  role,
  locale,
  currentUserId,
  onPress,
}: {
  conversation: GeneralChatConversationListItemDto;
  role: MessagesRole;
  locale: string;
  currentUserId: string | null;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const primaryParticipant = getConversationPrimaryParticipant(conversation, currentUserId);
  const title = getConversationDisplayName(conversation, role, currentUserId);
  const subLabel = getConversationSubLabel(conversation, currentUserId);
  const preview = getConversationLatestPreview(conversation);
  const activityValue = getConversationActivityValue(conversation, locale);
  const unreadCount = conversation.unreadCount ?? 0;
  const avatarUrl = getParticipantAvatarUrl(primaryParticipant);
  const avatarText = getParticipantInitials(primaryParticipant, title);
  const subtitle = getParticipantSubtitle(
    primaryParticipant,
    role === "patient" ? "Practitioner" : "Patient",
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.cardTouchable,
        {
          borderColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
          flexDirection: isRTL ? "row-reverse" : "row",
          width: "100%",
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: resolveMediaUrl(avatarUrl) ?? avatarUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text weight="600" color={theme.colors.primary} style={styles.avatarText}>
              {avatarText}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text weight="600" style={styles.cardTitle}>
            {title}
          </Text>
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryLight }]}>
              <Text color={theme.colors.primary} weight="600" style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {subtitle ? (
          <Text color={theme.colors.textMuted} style={styles.cardMeta}>
            {subtitle}
          </Text>
        ) : null}
        {subLabel ? (
          <Text color={theme.colors.textMuted} style={styles.cardMetaSecondary}>
            {subLabel}
          </Text>
        ) : null}
        <Text color={theme.colors.textSecondary} style={styles.cardPreview}>
          {preview}
        </Text>

        <View style={styles.cardBottomRow}>
          <StatusChip
            label={formatStatusLabel(conversation.status)}
            tone={getConversationStatusTone(conversation.status)}
            showDot={false}
          />
          <Text color={theme.colors.textMuted} style={styles.cardTime}>
            {activityValue}
          </Text>
        </View>
      </View>

      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={18}
        color={theme.colors.textMuted}
        style={styles.cardChevron}
      />
    </TouchableOpacity>
  );
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 4,
  },
  startCard: {
    gap: 14,
  },
  startActions: {
    gap: 8,
  },
  summaryCard: {
    gap: 12,
  },
  summaryRows: {
    gap: 8,
  },
  cardTouchable: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    lineHeight: 18,
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  badge: {
    minWidth: 28,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardMetaSecondary: {
    fontSize: 11,
    lineHeight: 16,
  },
  cardPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  cardTime: {
    fontSize: 11,
    flexShrink: 0,
  },
  cardChevron: {
    marginTop: 10,
  },
  footerState: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  nextPageState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 10,
  },
  retryState: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
  },
  endOfListText: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
});

