import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useAppDirection } from "../../../i18n/direction";
import {
  formatMessageTime,
  getConversationHeaderPresentation,
  getMessageSenderLabel,
  getMessageSenderRoleLabel,
  getMessageStatusLabel,
  isSameSenderMessage,
} from "../utils";
import type {
  GeneralChatMessageItemDto,
  MessagesRole,
  CanonicalMessage,
  GeneralChatConversationDetailItemDto,
} from "../types";
import {
  useCanonicalConversation,
  useUnifiedMessages,
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
  showDateSeparator: boolean;
  dateSeparatorText?: string;
};

// Helper function to format date cleanly like WhatsApp
function getMessageDateString(sentAt: string, locale: string): string {
  const date = new Date(sentAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isArabic = locale.startsWith("ar");

  if (isSameDay(date, today)) {
    return isArabic ? "اليوم" : "Today";
  }
  if (isSameDay(date, yesterday)) {
    return isArabic ? "أمس" : "Yesterday";
  }

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function MessageThreadScreen({
  role,
  conversationId,
}: MessageThreadScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isRtl } = useAppDirection();
  const locale = i18n.language || "en";
  const currentUserId = user?.id || null;

  const conversationQuery = useCanonicalConversation(role, conversationId);
  const conversation = conversationQuery.data?.item ?? null;

  const {
    messages,
    isLoading,
    isError,
    loadMore,
    hasMore,
    isLoadingMore,
    sendMessage,
    retryMessage,
    markRead,
  } = useUnifiedMessages({ conversationId, currentUserId });

  const listRef = useRef<FlatList<ThreadMessageRow> | null>(null);
  const didInitialScrollRef = useRef(false);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const autoFillInFlightRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    didInitialScrollRef.current = false;
    setDraft("");
    setComposerError(null);
  }, [conversationId]);

  const legacyMessages = useMemo<GeneralChatMessageItemDto[]>(() => {
    return messages.map((m: CanonicalMessage) => ({
      messageId: m.id,
      conversationId: m.conversationId,
      senderUserId: m.sender.userId,
      senderIdentity: {
        participantId: m.sender.userId,
        userId: m.sender.userId,
        displayName: m.sender.displayName,
        avatarUrl: m.sender.avatarUrl,
        role: m.sender.publicRoleLabel === "Patient" ? "PATIENT" : "PRACTITIONER",
        subtitle: m.sender.publicRoleLabel === "Support team" || m.sender.publicRoleLabel === "Admin"
          ? t("messages.thread.supportRoleLabel")
          : (m.sender.publicRoleLabel === "Patient"
              ? (isRtl ? "المريض" : "Patient")
              : (isRtl ? "المختص" : "Practitioner")),
        status: null,
        verificationStatus: null,
      },
      messageType: m.body ? "TEXT" : "SYSTEM",
      status: m.status,
      contentText: m.body,
      sentAt: m.sentAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
      attachments: [],
      conversationLatestActivityAt: m.sentAt,
      clientMessageId: m.clientMessageId,
      deliveryState: m.deliveryState,
      deliveryErrorCode: m.deliveryErrorCode,
    }));
  }, [messages, isRtl, t]);

  const legacyConversation = useMemo<GeneralChatConversationDetailItemDto | null>(() => {
    if (!conversation) return null;
    return {
      conversationId: conversation.conversationId,
      conversationRef: conversation.conversationId,
      status: conversation.status,
      linkedSessionId: conversation.contextId,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        role: p.publicRoleLabel === "Patient" ? "PATIENT" : "PRACTITIONER",
        identity: {
          participantId: p.userId,
          userId: p.userId,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          role: p.publicRoleLabel === "Patient" ? "PATIENT" : "PRACTITIONER",
          subtitle: p.publicRoleLabel,
          status: null,
          verificationStatus: null,
        },
      })),
      createdAt: conversation.createdAt,
      latestActivityAt: conversation.lastActivityAt,
      latestMessage: null,
      unreadCount: conversation.unreadCount,
      hasUnread: conversation.unreadCount > 0,
      lastReadMessageId: null,
      lastReadAt: null,
      chatAvailability: {
        canRead: true,
        canSend: conversation.canSend,
        readOnly: conversation.isReadOnly || conversation.isResolved,
        reason: conversation.sendDisabledReason as any || "ALLOWED",
      },
      hasMessages: true,
    };
  }, [conversation]);

  const messageRows = useMemo<ThreadMessageRow[]>(() => {
    return legacyMessages.map((message: GeneralChatMessageItemDto, index: number) => {
      const previous = index > 0 ? legacyMessages[index - 1] : null;

      let showDateSeparator = false;
      let dateSeparatorText = "";

      if (!previous) {
        showDateSeparator = true;
        dateSeparatorText = getMessageDateString(message.sentAt, locale);
      } else {
        const prevDate = new Date(previous.sentAt);
        const currDate = new Date(message.sentAt);
        const isDifferentDay =
          prevDate.getFullYear() !== currDate.getFullYear() ||
          prevDate.getMonth() !== currDate.getMonth() ||
          prevDate.getDate() !== currDate.getDate();

        if (isDifferentDay) {
          showDateSeparator = true;
          dateSeparatorText = getMessageDateString(message.sentAt, locale);
        }
      }

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
        showDateSeparator,
        dateSeparatorText,
      };
    });
  }, [locale, legacyMessages, role, user?.id]);

  const headerPresentation = useMemo(() => {
    if (!conversation) {
      return { title: t("messages.thread.sessionTitle", "Session chat"), subtitle: undefined };
    }
    const result = getConversationHeaderPresentation(conversation, role, t);
    return { title: result.title, subtitle: result.subtitle || undefined };
  }, [conversation, role, t]);

  const headerTitle = headerPresentation.title;
  const headerSubtitle = headerPresentation.subtitle;

  const isInitialLoading =
    (conversationQuery.isLoading && !conversationQuery.data) ||
    (isLoading && legacyMessages.length === 0);
  const isInitialError =
    (conversationQuery.isError && !conversationQuery.data) ||
    (isError && legacyMessages.length === 0);
  const isRefreshing = conversationQuery.isRefetching && !isLoadingMore;

  const maybeAutoFillOlderMessages = useCallback(async () => {
    if (
      autoFillInFlightRef.current ||
      isLoadingMore ||
      !hasMore
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
      await loadMore();
    } finally {
      autoFillInFlightRef.current = false;
    }
  }, [isLoadingMore, hasMore, loadMore]);

  const lastIncomingMessage = useMemo(() => {
    return [...legacyMessages].reverse().find((msg) => msg.senderUserId !== currentUserId) || null;
  }, [legacyMessages, currentUserId]);

  useEffect(() => {
    if (lastIncomingMessage?.messageId) {
      void markRead(lastIncomingMessage.messageId);
    }
  }, [lastIncomingMessage?.messageId, markRead]);

  useEffect(() => {
    if (didInitialScrollRef.current || legacyMessages.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
      didInitialScrollRef.current = true;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [legacyMessages.length]);

  useEffect(() => {
    void maybeAutoFillOlderMessages();
  }, [legacyMessages.length, maybeAutoFillOlderMessages]);

  const chatAvailability = legacyConversation?.chatAvailability ?? null;
  const showComposer =
    chatAvailability?.canSend === true && chatAvailability?.readOnly !== true;
  const showAvailabilityLoading = conversationQuery.isLoading;
  const showReadOnlyNotice =
    !showAvailabilityLoading &&
    (chatAvailability?.canSend !== true || chatAvailability?.readOnly === true);

  const handleRefresh = () => {
    void conversationQuery.refetch();
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !conversationId || isSending) {
      return;
    }

    setComposerError(null);
    setIsSending(true);

    try {
      await sendMessage(trimmed);
      setDraft("");
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

  const handleRetryMessage = useCallback((clientMessageId: string) => {
    void retryMessage(clientMessageId).catch(() => {
      setComposerError(
        t("messages.thread.sendError", "Could not send this message right now."),
      );
    });
  }, [retryMessage, t]);

  if (isInitialError || !conversation) {
    return (
      <Screen bg="background">
        <Header showBack title={headerTitle} />
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
        title={headerTitle}
        subtitle={headerSubtitle}
      />

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
              tintColor="#24564F"
              colors={["#24564F"]}
            />
          }
          onScroll={(event) => {
            if (!didInitialScrollRef.current) {
              return;
            }

            if (
              event.nativeEvent.contentOffset.y < 120 &&
              hasMore &&
              !isLoadingMore
            ) {
              void loadMore();
            }
          }}
          scrollEventThrottle={16}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              {isLoadingMore ? (
                <View style={styles.topState}>
                  <ActivityIndicator color="#24564F" size="small" />
                  <Text color="#6F7E78" style={styles.topStateText}>
                    {t(
                      "messages.common.loadingOlder",
                      "Loading older messages...",
                    )}
                  </Text>
                </View>
              ) : !hasMore && legacyMessages.length > 0 ? (
                <Text color="#6F7E78" style={styles.startHint}>
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
            <View>
              {item.showDateSeparator && item.dateSeparatorText ? (
                <View style={styles.dateSeparatorWrap}>
                  <View style={styles.dateSeparatorBubble}>
                    <Text style={styles.dateSeparatorText} color="#6F7E78" weight="600">
                      {item.dateSeparatorText}
                    </Text>
                  </View>
                </View>
              ) : null}
              <MessageBubble
                message={item.message}
                locale={locale}
                isMine={
                  item.message.senderUserId === user?.id ||
                  (role === "patient" && item.message.senderIdentity?.role === "PATIENT") ||
                  (role === "practitioner" && item.message.senderIdentity?.role === "PRACTITIONER")
                }
                showIdentity={item.isGroupStart}
                senderLabel={item.senderLabel}
                senderRoleLabel={item.senderRoleLabel}
                onRetry={item.message.deliveryState === "failed" &&
                  item.message.deliveryErrorCode !== "MESSAGE_IDEMPOTENCY_CONFLICT" &&
                  item.message.clientMessageId
                  ? () => handleRetryMessage(item.message.clientMessageId!)
                  : undefined}
                retryLabel={t("messages.common.retryNext", "Try again")}
              />
            </View>
          )}
        />

        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          {showAvailabilityLoading ? (
            <View
              style={[
                styles.readOnlyNotice,
                {
                  borderColor: "#E8DED0",
                  backgroundColor: "#FCFAF6",
                },
              ]}
            >
              <Text weight="600" color="#1F332F" style={[styles.readOnlyTitle, { textAlign: isRtl ? "right" : "left" }]}>
                {t("messages.thread.availabilityLoadingTitle", "Loading availability...")}
              </Text>
            </View>
          ) : showReadOnlyNotice ? (
            <View
              style={[
                styles.readOnlyNotice,
                {
                  borderColor: "#E8DED0",
                  backgroundColor: "#FCFAF6",
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  marginHorizontal: 12,
                  marginVertical: 8,
                },
              ]}
            >
              {conversation?.type === "SESSION" && (
                <Text color="#6F7E78" style={{ fontSize: 14, textAlign: isRtl ? "right" : "left", lineHeight: 20 }}>
                  {t("messages.thread.endedSessionNotice")}
                </Text>
              )}
              {conversation?.type === "CARE" && (
                <Text color="#6F7E78" style={{ fontSize: 14, textAlign: isRtl ? "right" : "left", lineHeight: 20 }}>
                  {t("messages.thread.expiredCareNotice")}
                </Text>
              )}
              {conversation?.type === "SUPPORT" && (
                <View style={{ gap: 12 }}>
                  <Text color="#6F7E78" style={{ fontSize: 14, textAlign: isRtl ? "right" : "left", lineHeight: 20 }}>
                    {t("messages.thread.resolvedSupportNotice")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const pathname = role === "patient"
                        ? "/(patient)/support/new"
                        : "/(practitioner)/support/new";
                      router.push(pathname as any);
                    }}
                    style={{
                      backgroundColor: "#24564F",
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: isRtl ? "flex-start" : "flex-end",
                    }}
                  >
                    <Text color="#FFFFFF" weight="600" style={{ fontSize: 14 }}>
                      {t("messages.thread.startNewSupport")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : showComposer ? (
            <ConversationComposer
              value={draft}
              onChangeText={setDraft}
              onSend={() => void handleSend()}
              disabled={!draft.trim() || isSending}
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
  onRetry,
  retryLabel,
}: {
  message: GeneralChatMessageItemDto;
  locale: string;
  isMine: boolean;
  showIdentity: boolean;
  senderLabel: string;
  senderRoleLabel: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  const contentText = resolveMessageText(message, locale);
  const timeValue = formatMessageTime(message.sentAt, locale);
  const statusLabel = isMine
    ? getMessageStatusLabel(message.status, locale, message.deliveryState)
    : null;
  const avatarUrl = message.senderIdentity?.avatarUrl || null;

  if (message.messageType === "SYSTEM") {
    return (
      <View style={styles.systemWrap}>
        <View
          style={[
            styles.systemBubble,
            {
              backgroundColor: "#EEF4EF",
              borderColor: "#D9E4DB",
            },
          ]}
        >
          <Text color="#6F7E78" style={styles.systemText}>
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
      avatarUrl={avatarUrl}
      senderLabel={senderLabel}
      header={
        showIdentity && !isMine ? (
          <View style={styles.identityHeader}>
            <Text
              weight="600"
              color="#1F332F"
              style={styles.identityName}
            >
              {senderLabel}
            </Text>
            <Text color="#6F7E78" style={styles.identityRole}>
              {senderRoleLabel}
            </Text>
          </View>
        ) : undefined
      }
      attachments={message.attachments.map((attachment) => ({
        key: attachment.fileId,
        label: attachment.originalName || attachment.mimeType || "Attachment",
      }))}
      onRetry={onRetry}
      retryLabel={retryLabel}
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
    paddingVertical: 16,
  },
  headerWrap: {
    gap: 8,
    marginBottom: 4,
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
  dateSeparatorWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  dateSeparatorBubble: {
    backgroundColor: "#EEF4EF",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E4DB",
  },
  dateSeparatorText: {
    fontSize: 11,
  },
  identityHeader: {
    gap: 1,
    marginBottom: 2,
    alignItems: "flex-start",
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
    lineHeight: 18,
    textAlign: "center",
  },
  readOnlyNotice: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    elevation: 1,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
