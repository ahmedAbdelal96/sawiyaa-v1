import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  I18nManager,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Input,
  LoadingState,
  Screen,
  StatusChip,
  SummaryRow,
  Text,
} from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { resolveMediaUrl } from "../../../lib/resolve-media-url";
import {
  formatMessageTime,
  getConversationDisplayName,
  getConversationIdentitySummary,
  getConversationPrimaryParticipant,
  getConversationStatusTone,
  getConversationSubLabel,
  getConversationParticipantLabels,
  getParticipantAvatarUrl,
  getParticipantDisplayName,
  getParticipantInitials,
  getMessageSenderLabel,
  getMessageSenderRoleLabel,
  getMessageStatusLabel,
  isSameSenderMessage,
  sortMessagesChronologically,
  uniqByMessageId,
} from "../utils";
import type {
  GeneralChatMessageItemDto,
  MessagesRole,
} from "../types";
import {
  useGeneralChatConversation,
  useGeneralChatResumeRefresh,
  useInfiniteGeneralChatMessages,
  useMarkGeneralChatConversationReadMutation,
  useSendGeneralChatMessageMutation,
} from "../hooks";

type MessageThreadScreenProps = {
  role: MessagesRole;
  conversationId: string;
};

type ThreadMessageRow = {
  message: GeneralChatMessageItemDto;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  senderLabel: string;
  senderRoleLabel: string;
};

export function MessageThreadScreen({
  role,
  conversationId,
}: MessageThreadScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language || "en";

  const conversationQuery = useGeneralChatConversation(role, conversationId);
  const messagesQuery = useInfiniteGeneralChatMessages(role, conversationId, { pageSize: 25 });
  const sendMutation = useSendGeneralChatMessageMutation(role, conversationId);
  const markReadMutation = useMarkGeneralChatConversationReadMutation(role, conversationId);
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
  const primaryParticipant = getConversationPrimaryParticipant(conversation, user?.id ?? null);
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const rows = pages.flatMap((page) => page.items);

    return sortMessagesChronologically(uniqByMessageId(rows));
  }, [messagesQuery.data?.pages]);
  const participantLabels = getConversationParticipantLabels(role);
  const messageRows = useMemo<ThreadMessageRow[]>(() => {
    return messages.map((message, index) => {
      const previous = index > 0 ? messages[index - 1] : null;
      const next = index < messages.length - 1 ? messages[index + 1] : null;

      return {
        message,
        isGroupStart: !previous || !isSameSenderMessage(previous, message),
        isGroupEnd: !next || !isSameSenderMessage(message, next),
        senderLabel: getMessageSenderLabel(message, user?.id, role),
        senderRoleLabel: getMessageSenderRoleLabel(message, user?.id, role),
      };
    });
  }, [messages, role, user?.id]);

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

  const canSend =
    Boolean(draft.trim()) &&
    Boolean(conversation) &&
    conversation?.status !== "CLOSED" &&
    conversation?.status !== "EXPIRED" &&
    conversation?.status !== "SUSPENDED" &&
    !sendMutation.isPending &&
    !isSending;

  const canOpenSession = Boolean(conversation?.linkedSessionId);
  const composerBottomOffset = Math.max(tabBarHeight, insets.bottom) + 12;

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

  const handleOpenSession = () => {
    if (!conversation?.linkedSessionId) {
      return;
    }

    const sessionHref =
      role === "patient"
        ? `/(patient)/sessions/${conversation.linkedSessionId}`
        : `/(practitioner)/sessions/${conversation.linkedSessionId}`;

    router.push(sessionHref as any);
  };

  if (isInitialLoading) {
    return (
      <Screen bg="background">
        <Header
          showBack
          title={t("messages.thread.title", "Conversation")}
        />
        <LoadingState fullScreen message={t("messages.common.loading", "Loading...")} />
      </Screen>
    );
  }

  if (isInitialError || !conversation) {
    return (
      <Screen bg="background">
        <Header
          showBack
          title={t("messages.thread.title", "Conversation")}
        />
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
      <Header
        showBack
        title={t("messages.thread.title", "Conversation")}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
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
                <View style={styles.summaryHeader}>
                  <View
                    style={[
                      styles.headerAvatar,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    {getParticipantAvatarUrl(primaryParticipant) ? (
                      <Image
                        source={{
                          uri:
                            resolveMediaUrl(getParticipantAvatarUrl(primaryParticipant)) ??
                            getParticipantAvatarUrl(primaryParticipant)!,
                        }}
                        style={styles.headerAvatarImage}
                      />
                    ) : (
                      <Text weight="600" color={theme.colors.primary} style={styles.headerAvatarText}>
                        {getParticipantInitials(
                          primaryParticipant,
                          getParticipantDisplayName(
                            primaryParticipant,
                            role === "patient" ? "Practitioner" : "Patient",
                          ),
                        )}
                      </Text>
                    )}
                  </View>
                  <View style={styles.summaryHeaderText}>
                    <Text weight="bold" style={styles.summaryTitle}>
                      {getConversationDisplayName(conversation, role, user?.id ?? null)}
                    </Text>
                    <Text color={theme.colors.textSecondary} style={styles.summarySubtitle}>
                      {getConversationSubLabel(conversation, user?.id ?? null)}
                    </Text>
                    <Text color={theme.colors.textMuted} style={styles.summaryIdentity}>
                      {getConversationIdentitySummary(conversation, role, user?.id ?? null)}
                    </Text>
                  </View>
                  <StatusChip
                    label={formatStatusLabel(conversation.status)}
                    tone={getConversationStatusTone(conversation.status)}
                    showDot={false}
                  />
                </View>

                <View style={styles.participantRow}>
                  <StatusChip label={participantLabels.self} tone="info" showDot={false} />
                  <Text color={theme.colors.textMuted} style={styles.participantSeparator}>
                    {"·"}
                  </Text>
                  <StatusChip label={participantLabels.other} tone="default" showDot={false} />
                </View>

                <View style={styles.summaryRows}>
                  <SummaryRow
                    label={t("messages.thread.summary.status", "Status")}
                    value={conversation.status.replaceAll("_", " ")}
                  />
                  <SummaryRow
                    label={t("messages.thread.summary.unread", "Unread")}
                    value={conversation.unreadCount}
                  />
                  <SummaryRow
                    label={t("messages.thread.summary.lastActivity", "Last activity")}
                    value={formatMessageTime(conversation.latestActivityAt, locale)}
                  />
                </View>

                {canOpenSession ? (
                  <TouchableOpacity
                    style={[
                      styles.linkRow,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                    activeOpacity={0.85}
                    onPress={handleOpenSession}
                  >
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                    <Text weight="600" color={theme.colors.primary} style={styles.linkRowText}>
                      {t("messages.thread.openSession", "Open session")}
                    </Text>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </Card>

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
                <TouchableOpacity
                  style={[
                    styles.topRetry,
                    {
                      borderColor: theme.colors.borderLight,
                      backgroundColor: theme.colors.surfaceSecondary,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => void messagesQuery.fetchNextPage()}
                >
                  <Text weight="600" style={{ color: theme.colors.primary }}>
                    {t("messages.common.retryNext", "Try again")}
                  </Text>
                </TouchableOpacity>
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
            <EmptyState
              title={t("messages.thread.emptyTitle", "No messages yet")}
              description={t(
                "messages.thread.emptyDescription",
                "Start the conversation with a short message.",
              )}
              icon={<Ionicons name="chatbubbles-outline" size={32} color={theme.colors.primary} />}
            />
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item.message}
              locale={locale}
              isMine={item.message.senderUserId === user?.id}
              showIdentity={item.isGroupStart}
              isGroupEnd={item.isGroupEnd}
              senderLabel={item.senderLabel}
              senderRoleLabel={item.senderRoleLabel}
            />
          )}
        />

        <View
          style={[
            styles.composerBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.borderLight,
              marginBottom: composerBottomOffset,
            },
          ]}
        >
          <View style={[styles.composerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={t(
                "messages.thread.composerPlaceholder",
                "Write a message",
              )}
              multiline
              numberOfLines={3}
              style={[
                styles.composerInput,
                {
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
              containerStyle={styles.composerInputContainer}
            />

            <Button
              title={
                sendMutation.isPending || isSending
                  ? t("messages.thread.sending", "Sending...")
                  : t("messages.thread.send", "Send")
              }
              onPress={() => void handleSend()}
              disabled={!canSend}
              style={styles.sendButton}
            />
          </View>

          {composerError ? (
            <Text color="#ef4444" style={styles.composerError}>
              {composerError}
            </Text>
          ) : null}

          {!canSend && conversation.status !== "OPEN" && conversation.status !== "PENDING" ? (
            <Text color={theme.colors.textMuted} style={styles.composerHint}>
              {t(
                "messages.thread.closedHint",
                "This conversation is not accepting new messages right now.",
              )}
            </Text>
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
  isGroupEnd,
  senderLabel,
  senderRoleLabel,
}: {
  message: GeneralChatMessageItemDto;
  locale: string;
  isMine: boolean;
  showIdentity: boolean;
  isGroupEnd: boolean;
  senderLabel: string;
  senderRoleLabel: string;
}) {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const contentText = resolveMessageText(message);
  const timeValue = formatMessageTime(message.sentAt, locale);
  const statusLabel = isMine ? getMessageStatusLabel(message.status) : null;
  const messageIdentity = message.senderIdentity;
  const bubbleDisplayName = isMine
    ? "You"
    : messageIdentity?.displayName?.trim() || senderLabel;
  const bubbleRoleLabel = isMine
    ? senderRoleLabel
    : messageIdentity?.subtitle?.trim() || senderRoleLabel;
  const bubbleAvatarUrl = messageIdentity?.avatarUrl?.trim() || null;
  const bubbleAvatarText = getParticipantInitials(
    messageIdentity
      ? { userId: messageIdentity.userId, role: messageIdentity.role, identity: messageIdentity }
      : null,
    bubbleDisplayName,
  );

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
    <View
      style={[
        styles.messageRow,
        {
          marginTop: showIdentity ? 10 : 2,
          alignSelf: isMine ? "flex-end" : "flex-start",
          alignItems: isMine ? "flex-end" : "flex-start",
        },
      ]}
    >
      {showIdentity ? (
        <View
          style={[
            styles.identityRow,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View style={[styles.messageAvatar, { backgroundColor: theme.colors.primaryLight }]}>
            {bubbleAvatarUrl ? (
              <Image
                source={{ uri: resolveMediaUrl(bubbleAvatarUrl) ?? bubbleAvatarUrl }}
                style={styles.messageAvatarImage}
              />
            ) : (
              <Text weight="600" color={theme.colors.primary} style={styles.messageAvatarText}>
                {bubbleAvatarText}
              </Text>
            )}
          </View>
          <View style={styles.identityTextWrap}>
            <Text weight="600" style={styles.identityName} color={theme.colors.textPrimary}>
              {bubbleDisplayName}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.identityRole}>
              {bubbleRoleLabel}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isMine ? theme.colors.primaryLight : theme.colors.surface,
            borderColor: isMine ? theme.colors.primaryLight : theme.colors.borderLight,
            marginTop: showIdentity ? 4 : 0,
            marginBottom: isGroupEnd ? 0 : 2,
          },
        ]}
      >
        <Text style={styles.messageText} color={theme.colors.textPrimary}>
          {contentText}
        </Text>

        {message.attachments.length > 0 ? (
          <View style={styles.attachmentWrap}>
            {message.attachments.map((attachment) => (
              <View
                key={attachment.fileId}
                style={[
                  styles.attachmentChip,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="attach-outline" size={14} color={theme.colors.textMuted} />
                <Text color={theme.colors.textSecondary} style={styles.attachmentText}>
                  {attachment.originalName || attachment.mimeType}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.messageMetaRow}>
          <Text color={theme.colors.textMuted} style={styles.messageMeta}>
            {timeValue}
          </Text>
          {statusLabel ? (
            <>
              <Text color={theme.colors.textMuted} style={styles.messageMeta}>
                •
              </Text>
              <Text color={theme.colors.textMuted} style={styles.messageMeta}>
                {statusLabel}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      {isMine ? null : (
        <View style={styles.messageAvatarSpacer} />
      )}
    </View>
  );
}

function resolveMessageText(message: GeneralChatMessageItemDto) {
  const text = message.contentText?.trim();
  if (text) {
    return text;
  }

  if (message.attachments.length > 0) {
    if (message.attachments.length === 1) {
      return message.attachments[0]?.originalName || message.attachments[0]?.mimeType || "Attachment";
    }

    return `${message.attachments.length} attachments`;
  }

  return "Message";
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
    gap: 10,
  },
  headerWrap: {
    gap: 10,
    marginBottom: 6,
  },
  summaryCard: {
    gap: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryHeaderText: {
    flex: 1,
    gap: 4,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  headerAvatarText: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  summarySubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  summaryIdentity: {
    fontSize: 12,
    lineHeight: 18,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  participantSeparator: {
    fontSize: 18,
    lineHeight: 18,
  },
  summaryRows: {
    gap: 8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  linkRowText: {
    flex: 1,
    fontSize: 13,
  },
  topState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 6,
  },
  topStateText: {
    fontSize: 13,
  },
  topRetry: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startHint: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 4,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  identityRow: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  identityTextWrap: {
    gap: 1,
  },
  identityName: {
    fontSize: 13,
    lineHeight: 18,
  },
  identityRole: {
    fontSize: 11,
    lineHeight: 16,
  },
  messageBubble: {
    maxWidth: "84%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  messageMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    overflow: "hidden",
  },
  messageAvatarImage: {
    width: "100%",
    height: "100%",
  },
  messageAvatarText: {
    fontSize: 11,
    lineHeight: 14,
  },
  messageAvatarSpacer: {
    width: 28,
    height: 28,
    marginTop: 2,
  },
  systemWrap: {
    alignItems: "center",
  },
  systemBubble: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: "90%",
  },
  systemText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  attachmentWrap: {
    gap: 8,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attachmentText: {
    fontSize: 12,
  },
  composerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  composerRow: {
    alignItems: "flex-end",
    gap: 10,
  },
  composerInputContainer: {
    flex: 1,
    marginBottom: 0,
    minWidth: 0,
  },
  composerInput: {
    minHeight: 72,
    maxHeight: 120,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  composerError: {
    fontSize: 12,
    lineHeight: 18,
  },
  composerHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  sendButton: {
    alignSelf: "flex-end",
    width: 96,
    minHeight: 52,
    borderRadius: 14,
    flexShrink: 0,
  },
});

