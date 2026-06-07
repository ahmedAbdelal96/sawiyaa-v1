import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import {
  formatMessageTime,
  formatMessageTimestamp,
  getConversationDisplayName,
  getConversationSubLabel,
  getMessageSenderLabel,
  getMessageSenderRoleLabel,
  getMessageStatusLabel,
  isSameSenderMessage,
  sortMessagesChronologically,
  uniqByMessageId,
} from "../utils";
import type { GeneralChatMessageItemDto, MessagesRole } from "../types";
import {
  useGeneralChatConversation,
  useGeneralChatResumeRefresh,
  useInfiniteGeneralChatMessages,
  useMarkGeneralChatConversationReadMutation,
  useSendGeneralChatMessageMutation,
} from "../hooks";
import {
  ConversationBubble,
  ConversationComposer,
  ConversationEmptyState,
} from "./ConversationPrimitives";

type MessageThreadScreenProps = {
  role: MessagesRole;
  conversationId: string;
};

type ThreadMessageRow = {
  message: GeneralChatMessageItemDto;
  isGroupStart: boolean;
  senderLabel: string;
  senderRoleLabel: string;
};

export function MessageThreadScreen({
  role,
  conversationId,
}: MessageThreadScreenProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const locale = i18n.language || "en";

  const conversationQuery = useGeneralChatConversation(role, conversationId);
  const messagesQuery = useInfiniteGeneralChatMessages(role, conversationId, {
    pageSize: 25,
  });
  const sendMutation = useSendGeneralChatMessageMutation(role, conversationId);
  const markReadMutation = useMarkGeneralChatConversationReadMutation(
    role,
    conversationId,
  );
  useGeneralChatResumeRefresh(role, conversationId);

  const listRef = useRef<FlatList<ThreadMessageRow> | null>(null);
  const didInitialScrollRef = useRef(false);
  const didMarkReadRef = useRef<string | null>(null);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const autoFillInFlightRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    didInitialScrollRef.current = false;
    didMarkReadRef.current = null;
    setDraft("");
    setComposerError(null);
  }, [conversationId]);

  const conversation = conversationQuery.data?.item ?? null;
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const rows = pages.flatMap((page) => page.items);

    return sortMessagesChronologically(uniqByMessageId(rows));
  }, [messagesQuery.data?.pages]);

  const messageRows = useMemo<ThreadMessageRow[]>(() => {
    return messages.map((message, index) => {
      const previous = index > 0 ? messages[index - 1] : null;

      return {
        message,
        isGroupStart: !previous || !isSameSenderMessage(previous, message),
        senderLabel: getMessageSenderLabel(message, user?.id, role, locale),
        senderRoleLabel: getMessageSenderRoleLabel(
          message,
          user?.id,
          role,
          locale,
        ),
      };
    });
  }, [locale, messages, role, user?.id]);

  const threadTitle = t("messages.thread.sessionTitle", "Session chat");
  const contextLabel = useMemo(() => {
    if (!conversation) {
      return null;
    }

    const parts = [
      getConversationDisplayName(conversation, role, user?.id ?? null, locale),
      getConversationSubLabel(conversation, user?.id ?? null, locale),
      formatMessageTimestamp(conversation.latestActivityAt, locale),
    ].filter((value, index, arr) => Boolean(value) && arr.indexOf(value) === index) as string[];

    return parts.join(" · ");
  }, [conversation, locale, role, user?.id]);

  const isInitialLoading =
    (conversationQuery.isLoading && !conversationQuery.data) ||
    (messagesQuery.isLoading && messages.length === 0);
  const isInitialError =
    (conversationQuery.isError && !conversationQuery.data) ||
    (messagesQuery.isError && messages.length === 0);
  const isRefreshing =
    (conversationQuery.isRefetching || messagesQuery.isRefetching) &&
    !messagesQuery.isFetchingNextPage;

  const maybeAutoFillOlderMessages = useCallback(async () => {
    if (
      autoFillInFlightRef.current ||
      messagesQuery.isFetchingNextPage ||
      !messagesQuery.hasNextPage
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
      await messagesQuery.fetchNextPage();
    } finally {
      autoFillInFlightRef.current = false;
    }
  }, [messagesQuery]);

  useEffect(() => {
    if (!conversation || didMarkReadRef.current === conversationId) {
      return;
    }

    if (conversation.unreadCount <= 0 && messages.length === 0) {
      return;
    }

    didMarkReadRef.current = conversationId;
    void markReadMutation.mutateAsync().catch(() => {
      didMarkReadRef.current = null;
    });
  }, [conversation, conversationId, markReadMutation, messages.length]);

  useEffect(() => {
    if (didInitialScrollRef.current || messages.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
      didInitialScrollRef.current = true;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    void maybeAutoFillOlderMessages();
  }, [messages.length, maybeAutoFillOlderMessages]);

  const chatAvailability = conversation?.chatAvailability ?? null;
  const showComposer =
    chatAvailability?.canSend === true && chatAvailability?.readOnly !== true;
  const showAvailabilityLoading = chatAvailability == null;
  const showReadOnlyNotice =
    !showAvailabilityLoading &&
    (chatAvailability?.canSend !== true || chatAvailability?.readOnly === true);

  const handleRefresh = () => {
    void conversationQuery.refetch();
    void messagesQuery.refetch();
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !conversationId || isSending) {
      return;
    }

    setComposerError(null);
    setIsSending(true);

    try {
      await sendMutation.mutateAsync({ message: trimmed });
      setDraft("");
      await Promise.allSettled([
        conversationQuery.refetch(),
        messagesQuery.refetch(),
        markReadMutation.mutateAsync().catch(() => null),
      ]);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch {
      setComposerError(
        t("messages.thread.sendError", "Could not send this message right now."),
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isInitialLoading) {
    return (
      <Screen bg="background">
        <Header showBack title={threadTitle} />
        <LoadingState
          fullScreen
          message={t("messages.common.loading", "Loading...")}
        />
      </Screen>
    );
  }

  if (isInitialError || !conversation) {
    return (
      <Screen bg="background">
        <Header showBack title={threadTitle} />
        <ErrorState
          fullScreen
          title={t("messages.common.errorTitle", "Could not load conversation")}
          message={t(
            "messages.common.errorMessage",
            "Please try again in a moment.",
          )}
          onRetry={handleRefresh}
          retryText={t("messages.common.retry", "Try again")}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header showBack title={threadTitle} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList<ThreadMessageRow>
          ref={listRef}
          data={messageRows}
          keyExtractor={(item) => item.message.messageId}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onLayout={(event) => {
            listViewportHeightRef.current = event.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_, height) => {
            listContentHeightRef.current = height;
            void maybeAutoFillOlderMessages();
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onScroll={(event) => {
            if (!didInitialScrollRef.current) {
              return;
            }

            if (
              event.nativeEvent.contentOffset.y < 120 &&
              messagesQuery.hasNextPage &&
              !messagesQuery.isFetchingNextPage
            ) {
              void messagesQuery.fetchNextPage();
            }
          }}
          scrollEventThrottle={16}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              {contextLabel ? (
                <View
                  style={[
                    styles.contextStrip,
                    {
                      backgroundColor: theme.colors.surface,
                      borderBottomColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.contextText}
                    numberOfLines={1}
                  >
                    {contextLabel}
                  </Text>
                </View>
              ) : null}

              {messagesQuery.isFetchingNextPage ? (
                <View style={styles.topState}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text color={theme.colors.textSecondary} style={styles.topStateText}>
                    {t(
                      "messages.common.loadingOlder",
                      "Loading older messages...",
                    )}
                  </Text>
                </View>
              ) : messagesQuery.isFetchNextPageError ? (
                <View
                  style={[
                    styles.topRetry,
                    {
                      borderColor: theme.colors.borderLight,
                      backgroundColor: theme.colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text weight="600" style={{ color: theme.colors.primary }}>
                    {t("messages.common.retryNext", "Try again")}
                  </Text>
                </View>
              ) : !messagesQuery.hasNextPage && messages.length > 0 ? (
                <Text color={theme.colors.textSecondary} style={styles.startHint}>
                  {t(
                    "messages.common.startOfConversation",
                    "You have reached the start of this conversation.",
                  )}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <ConversationEmptyState
              title={t("messages.thread.emptyTitle", "No messages yet")}
            />
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item.message}
              locale={locale}
              isMine={item.message.senderUserId === user?.id}
              showIdentity={item.isGroupStart}
              senderLabel={item.senderLabel}
              senderRoleLabel={item.senderRoleLabel}
            />
          )}
        />

        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          {showAvailabilityLoading ? (
            <View
              style={[
                styles.readOnlyNotice,
                {
                  borderColor: theme.colors.borderLight,
                  backgroundColor: theme.colors.surfaceSecondary,
                },
              ]}
            >
              <Text weight="600" color={theme.colors.textPrimary} style={styles.readOnlyTitle}>
                {t("messages.thread.availabilityLoadingTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.readOnlyLine}>
                {t("messages.thread.availabilityLoadingNote")}
              </Text>
            </View>
          ) : showReadOnlyNotice ? (
            <View
              style={[
                styles.readOnlyNotice,
                {
                  borderColor: theme.colors.borderLight,
                  backgroundColor: theme.colors.surfaceSecondary,
                },
              ]}
            >
              <Text weight="600" color={theme.colors.textPrimary} style={styles.readOnlyTitle}>
                {t("messages.thread.readOnlyTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.readOnlyLine}>
                {t("messages.thread.readOnlyReviewNote")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.readOnlyLine}>
                {t("messages.thread.readOnlySendNote")}
              </Text>
            </View>
          ) : showComposer ? (
            <ConversationComposer
              value={draft}
              onChangeText={setDraft}
              onSend={() => void handleSend()}
              disabled={!draft.trim() || sendMutation.isPending || isSending}
              placeholder={t(
                "messages.thread.composerPlaceholder",
                "Write your message",
              )}
              error={composerError}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({
  message,
  locale,
  isMine,
  showIdentity,
  senderLabel,
  senderRoleLabel,
}: {
  message: GeneralChatMessageItemDto;
  locale: string;
  isMine: boolean;
  showIdentity: boolean;
  senderLabel: string;
  senderRoleLabel: string;
}) {
  const { theme } = useTheme();

  const contentText = resolveMessageText(message, locale);
  const timeValue = formatMessageTime(message.sentAt, locale);
  const statusLabel = isMine ? getMessageStatusLabel(message.status, locale) : null;

  if (message.messageType === "SYSTEM") {
    return (
      <View style={styles.systemWrap}>
        <View
          style={[
            styles.systemBubble,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <Text color={theme.colors.textSecondary} style={styles.systemText}>
            {contentText}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ConversationBubble
      isMine={isMine}
      text={contentText}
      timeLabel={timeValue}
      statusLabel={statusLabel}
      header={
        showIdentity && !isMine ? (
          <View style={styles.identityHeader}>
            <Text
              weight="600"
              color={theme.colors.textPrimary}
              style={styles.identityName}
            >
              {senderLabel}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.identityRole}>
              {senderRoleLabel}
            </Text>
          </View>
        ) : undefined
      }
      attachments={message.attachments.map((attachment) => ({
        key: attachment.fileId,
        label: attachment.originalName || attachment.mimeType || "Attachment",
      }))}
    />
  );
}

function resolveMessageText(message: GeneralChatMessageItemDto, locale?: string) {
  const isArabic = locale?.startsWith("ar") ?? false;
  const text = message.contentText?.trim();
  if (text) {
    return text;
  }

  if (message.attachments.length > 0) {
    if (message.attachments.length === 1) {
      return (
        message.attachments[0]?.originalName ||
        message.attachments[0]?.mimeType ||
        (isArabic ? "مرفق" : "Attachment")
      );
    }

    return isArabic
      ? `${message.attachments.length} مرفقات`
      : `${message.attachments.length} attachments`;
  }

  return isArabic ? "رسالة" : "Message";
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  headerWrap: {
    gap: 8,
    marginBottom: 4,
  },
  contextStrip: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contextText: {
    fontSize: 13,
    textAlign: "center",
  },
  topState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 6,
  },
  topStateText: {
    fontSize: 12,
  },
  topRetry: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  startHint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  identityHeader: {
    alignItems: "flex-start",
    gap: 1,
    marginBottom: 2,
  },
  identityName: {
    fontSize: 12,
    lineHeight: 16,
  },
  identityRole: {
    fontSize: 10,
    lineHeight: 14,
  },
  systemWrap: {
    alignItems: "center",
    marginVertical: 6,
  },
  systemBubble: {
    maxWidth: "88%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  systemText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  readOnlyNotice: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  readOnlyTitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  readOnlyLine: {
    fontSize: 12,
    lineHeight: 18,
  },
});
