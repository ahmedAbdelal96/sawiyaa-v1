import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import {
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { getApiAccessToken } from "../../../lib/api";
import { MOBILE_API_URL } from "../../../config/mobile-environment";
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
  CanonicalConversation,
} from "../types";
import {
  useCanonicalConversation,
  useChatAttachmentPolicy,
  useUnifiedMessages,
} from "../hooks";
import { uploadCanonicalChatAttachment } from "../api";
import {
  attachmentErrorCode,
  attachmentErrorKey,
  isAttachmentImage,
  PendingChatAttachment,
  validatePendingAttachment,
} from "../attachment-utils";
import {
  ConversationBubble,
  ConversationComposer,
  ConversationEmptyState,
} from "./ConversationPrimitives";
import {
  formatViewerDate,
  getDatePartsInTimeZone,
  getEffectiveViewerTimeZone,
} from "../../../lib/time-formatting";

type MessageThreadScreenProps = {
  role: MessagesRole;
  conversationId: string;
};

function absoluteAttachmentUrl(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const path = fileUrl.startsWith("/api/v1/")
    ? fileUrl.slice("/api/v1".length)
    : fileUrl;
  return `${MOBILE_API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

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
  const timeZone = getEffectiveViewerTimeZone();
  const target = getDatePartsInTimeZone(date, timeZone);
  const today = getDatePartsInTimeZone(new Date(), timeZone);
  const dayKey = (parts: ReturnType<typeof getDatePartsInTimeZone>) =>
    parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
  const targetKey = dayKey(target);
  const todayKey = dayKey(today);
  const targetDay = target
    ? Date.UTC(target.year, target.month - 1, target.day)
    : NaN;
  const todayDay = today
    ? Date.UTC(today.year, today.month - 1, today.day)
    : NaN;

  const isArabic = locale.startsWith("ar");

  if (targetKey && targetKey === todayKey) {
    return isArabic ? "اليوم" : "Today";
  }
  if (
    Number.isFinite(targetDay) &&
    Number.isFinite(todayDay) &&
    todayDay - targetDay === 86_400_000
  ) {
    return isArabic ? "أمس" : "Yesterday";
  }

  return formatViewerDate(date, {
    locale,
    day: "numeric",
    month: "long",
    year: "numeric",
    fallbackText: "-",
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
  const isThreadFocused = useIsFocused();

  const conversationQuery = useCanonicalConversation(role, conversationId);
  const conversation = conversationQuery.data?.item ?? null;
  const attachmentPolicyQuery = useChatAttachmentPolicy(
    role,
    Boolean(conversation),
  );
  const attachmentPolicy = attachmentPolicyQuery.data?.item ?? null;

  const {
    messages,
    isError,
    isLoading: isMessagesLoading,
    loadMore,
    hasMore,
    isLoadingMore,
    sendMessage,
    retryMessage,
    markRead,
  } = useUnifiedMessages({ role, conversationId, currentUserId, isThreadFocused });

  const listRef = useRef<FlatList<ThreadMessageRow> | null>(null);
  const didInitialScrollRef = useRef(false);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const autoFillInFlightRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingChatAttachment[]
  >([]);
  const [previewAttachment, setPreviewAttachment] = useState<
    GeneralChatMessageItemDto["attachments"][number] | null
  >(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !previewAttachment) {
      setPreviewUri(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const token = getApiAccessToken();

    void fetch(absoluteAttachmentUrl(previewAttachment.fileUrl), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((response) => {
        if (!response.ok) throw new Error("ATTACHMENT_PREVIEW_FAILED");
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUri(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPreviewUri(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewAttachment]);

  useEffect(() => {
    didInitialScrollRef.current = false;
    setDraft("");
    setComposerError(null);
    setPendingAttachments([]);
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
        role:
          m.sender.publicRoleLabel === "Patient" ? "PATIENT" : "PRACTITIONER",
        subtitle:
          m.sender.publicRoleLabel === "Support team" ||
          m.sender.publicRoleLabel === "Admin"
            ? t("messages.thread.supportRoleLabel")
            : m.sender.publicRoleLabel === "Patient"
              ? isRtl
                ? "المريض"
                : "Patient"
              : isRtl
                ? "المختص"
                : "Practitioner",
        status: null,
        verificationStatus: null,
      },
      messageType: m.body || m.attachments?.length ? "TEXT" : "SYSTEM",
      status: m.status,
      contentText: m.body,
      sentAt: m.sentAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
      attachments: (m.attachments ?? []).map((attachment) => ({
        fileId: attachment.id,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize ?? null,
        originalName: attachment.originalName ?? null,
      })),
      conversationLatestActivityAt: m.sentAt,
      clientMessageId: m.clientMessageId,
      deliveryState: m.deliveryState,
      deliveryErrorCode: m.deliveryErrorCode,
    }));
  }, [messages, isRtl, t]);

  const legacyConversation =
    useMemo<GeneralChatConversationDetailItemDto | null>(() => {
      if (!conversation) return null;
      return {
        conversationId: conversation.conversationId,
        conversationRef: conversation.conversationId,
        status: conversation.status,
        linkedSessionId: conversation.contextId,
        participants: conversation.participants.map(
          (p: CanonicalConversation["participants"][number]) => ({
            userId: p.userId,
            role: p.publicRoleLabel === "Patient" ? "PATIENT" : "PRACTITIONER",
            identity: {
              participantId: p.userId,
              userId: p.userId,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              role:
                p.publicRoleLabel === "Patient" ? "PATIENT" : "PRACTITIONER",
              subtitle: p.publicRoleLabel,
              status: null,
              verificationStatus: null,
            },
          }),
        ),
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
          reason: (conversation.sendDisabledReason as any) || "ALLOWED",
        },
        hasMessages: true,
      };
    }, [conversation]);

  const messageRows = useMemo<ThreadMessageRow[]>(() => {
    return legacyMessages.map(
      (message: GeneralChatMessageItemDto, index: number) => {
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
      },
    );
  }, [locale, legacyMessages, role, user?.id]);

  const headerPresentation = useMemo(() => {
    if (!conversation) {
      return {
        title: t("messages.thread.sessionTitle", "Session chat"),
        subtitle: undefined,
      };
    }
    const result = getConversationHeaderPresentation(conversation, role, t);
    return { title: result.title, subtitle: result.subtitle || undefined };
  }, [conversation, role, t]);

  const headerTitle = headerPresentation.title;
  const headerSubtitle = headerPresentation.subtitle;

  const isInitialError =
    (conversationQuery.isError && !conversationQuery.data) ||
    (isError && legacyMessages.length === 0 && !isMessagesLoading);
  const isRefreshing = conversationQuery.isRefetching && !isLoadingMore;

  const maybeAutoFillOlderMessages = useCallback(async () => {
    if (autoFillInFlightRef.current || isLoadingMore || !hasMore) {
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
    return (
      [...legacyMessages]
        .reverse()
        .find((msg) => msg.senderUserId !== currentUserId) || null
    );
  }, [legacyMessages, currentUserId]);

  useEffect(() => {
    if (isThreadFocused && lastIncomingMessage?.messageId) {
      void markRead(lastIncomingMessage.messageId);
    }
  }, [isThreadFocused, lastIncomingMessage?.messageId, markRead]);

  useEffect(() => {
    if (didInitialScrollRef.current || legacyMessages.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
      didInitialScrollRef.current = true;
    }, 0);

    return () => clearTimeout(timer);
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

  const uploadPendingAttachment = async (item: PendingChatAttachment) => {
    setPendingAttachments((current) =>
      current.map((entry) =>
        entry.localId === item.localId
          ? { ...entry, state: "uploading", errorCode: null }
          : entry,
      ),
    );
    try {
      const response = await uploadCanonicalChatAttachment(conversationId, {
        uri: item.uri,
        name: item.name,
        type: item.mimeType,
      });
      const remote = {
        id: response.item.fileId,
        fileUrl: response.item.fileUrl,
        mimeType: response.item.mimeType,
        fileSize: response.item.fileSize,
        originalName: response.item.originalName ?? item.name,
      };
      setPendingAttachments((current) =>
        current.map((entry) =>
          entry.localId === item.localId
            ? { ...entry, state: "ready", remote, errorCode: null }
            : entry,
        ),
      );
    } catch (error) {
      setPendingAttachments((current) =>
        current.map((entry) =>
          entry.localId === item.localId
            ? {
                ...entry,
                state: "failed",
                errorCode: attachmentErrorCode(error),
              }
            : entry,
        ),
      );
    }
  };

  const addPendingAttachment = (input: {
    uri: string;
    name: string;
    mimeType: string;
    size: number | null;
  }) => {
    if (!attachmentPolicy) return;
    const errorCode = validatePendingAttachment(
      input,
      pendingAttachments,
      attachmentPolicy,
    );
    if (errorCode) {
      setComposerError(t(attachmentErrorKey(errorCode)));
      return;
    }
    const item: PendingChatAttachment = {
      ...input,
      localId: `${Date.now()}-${Math.random()}`,
      state: "selected",
    };
    setComposerError(null);
    setPendingAttachments((current) => [...current, item]);
    void uploadPendingAttachment(item);
  };

  const handleChooseAttachment = () => {
    if (!attachmentPolicy?.enabled) return;

    if (Platform.OS === "web") {
      void DocumentPicker.getDocumentAsync({
        type: ["image/*", ...attachmentPolicy.documentTypes],
        copyToCacheDirectory: true,
        multiple: false,
      }).then((result) => {
        if (!result.canceled && result.assets?.[0]) {
          const asset = result.assets[0];
          addPendingAttachment({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType ?? "application/octet-stream",
            size: asset.size ?? null,
          });
        }
      });
      return;
    }

    Alert.alert(t("messages.thread.chooseAttachment"), undefined, [
      {
        text: t("messages.thread.choosePhoto"),
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
            allowsEditing: false,
          });
          const asset = result.canceled ? null : result.assets?.[0];
          if (asset)
            addPendingAttachment({
              uri: asset.uri,
              name: asset.fileName ?? `image-${Date.now()}.jpg`,
              mimeType: asset.mimeType ?? "image/jpeg",
              size: asset.fileSize ?? null,
            });
        },
      },
      {
        text: t("messages.thread.chooseFile"),
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: [...attachmentPolicy.documentTypes],
            copyToCacheDirectory: true,
            multiple: false,
          });
          if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            addPendingAttachment({
              uri: asset.uri,
              name: asset.name,
              mimeType: asset.mimeType ?? "application/octet-stream",
              size: asset.size ?? null,
            });
          }
        },
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const removePendingAttachment = (localId: string) =>
    setPendingAttachments((current) =>
      current.filter((item) => item.localId !== localId),
    );
  const retryPendingAttachment = (localId: string) => {
    const item = pendingAttachments.find((entry) => entry.localId === localId);
    if (item) void uploadPendingAttachment(item);
  };

  const openAttachment = async (
    attachment: GeneralChatMessageItemDto["attachments"][number],
  ) => {
    if (isAttachmentImage(attachment.mimeType)) {
      setPreviewAttachment(attachment);
      return;
    }
    try {
      const token = getApiAccessToken();
      if (Platform.OS === "web") {
        const response = await fetch(
          absoluteAttachmentUrl(attachment.fileUrl),
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        if (!response.ok) throw new Error("ATTACHMENT_OPEN_FAILED");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const webWindow = (globalThis as any).window;
        const webDocument = (globalThis as any).document;
        const opened = webWindow?.open(
          objectUrl,
          "_blank",
          "noopener,noreferrer",
        );
        if (!opened && webDocument) {
          const link = webDocument.createElement("a");
          link.href = objectUrl;
          link.download = attachment.originalName || "attachment";
          webDocument.body.appendChild(link);
          link.click();
          link.remove();
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }
      const target = `${FileSystem.cacheDirectory ?? ""}sawiyaa-${attachment.fileId}`;
      const result = await FileSystem.downloadAsync(
        absoluteAttachmentUrl(attachment.fileUrl),
        target,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || ("size" in info && !info.size))
        throw new Error("EMPTY_ATTACHMENT");
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(result.uri, {
          mimeType: attachment.mimeType,
          dialogTitle: t("messages.thread.openAttachment"),
        });
      else setComposerError(t("messages.thread.attachmentOpenError"));
    } catch {
      setComposerError(t("messages.thread.attachmentOpenError"));
    }
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    const readyAttachments = pendingAttachments
      .filter((item) => item.state === "ready" && item.remote)
      .map((item) => item.remote!);
    if (
      (!trimmed && readyAttachments.length === 0) ||
      !conversationId ||
      isSending ||
      pendingAttachments.some(
        (item) => item.state === "uploading" || item.state === "failed",
      )
    ) {
      return;
    }

    setComposerError(null);
    setIsSending(true);

    try {
      await sendMessage(trimmed, readyAttachments);
      setDraft("");
      setPendingAttachments([]);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch {
      setComposerError(
        t(
          "messages.thread.sendError",
          "Could not send this message right now.",
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryMessage = useCallback(
    (clientMessageId: string) => {
      void retryMessage(clientMessageId).catch(() => {
        setComposerError(
          t(
            "messages.thread.sendError",
            "Could not send this message right now.",
          ),
        );
      });
    },
    [retryMessage, t],
  );

  if (!conversation && conversationQuery.isLoading) {
    return (
      <Screen bg="background" testID={`${role}-message-thread-screen`}>
        <Header
          showBack
          hideMessages={role === "practitioner"}
          title={t("messages.thread.title", "Conversation")}
        />
        <LoadingState fullScreen message={t("messages.common.loading")} />
      </Screen>
    );
  }

  if (isInitialError || !conversation) {
    return (
      <Screen bg="background" testID={`${role}-message-thread-screen`}>
        <Header
          showBack
          hideMessages={role === "practitioner"}
          title={headerTitle}
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
    <Screen bg="background" testID={`${role}-message-thread-screen`}>
      <Header
        showBack
        hideMessages={role === "practitioner"}
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
            isMessagesLoading ? (
              <LoadingState
                fullScreen={false}
                message={t("messages.common.loading")}
              />
            ) : (
              <ConversationEmptyState
                title={t("messages.thread.emptyTitle", "No messages yet")}
              />
            )
          }
          renderItem={({ item }) => (
            <View>
              {item.showDateSeparator && item.dateSeparatorText ? (
                <View style={styles.dateSeparatorWrap}>
                  <View style={styles.dateSeparatorBubble}>
                    <Text
                      style={styles.dateSeparatorText}
                      color="#6F7E78"
                      weight="600"
                    >
                      {item.dateSeparatorText}
                    </Text>
                  </View>
                </View>
              ) : null}
              <MessageBubble
                message={item.message}
                locale={locale}
                isMine={Boolean(
                  user?.id && item.message.senderUserId === user.id,
                )}
                showIdentity={item.isGroupStart}
                senderLabel={item.senderLabel}
                senderRoleLabel={item.senderRoleLabel}
                onRetry={
                  item.message.deliveryState === "failed" &&
                  item.message.deliveryErrorCode !==
                    "MESSAGE_IDEMPOTENCY_CONFLICT" &&
                  item.message.clientMessageId
                    ? () => handleRetryMessage(item.message.clientMessageId!)
                    : undefined
                }
                retryLabel={t("messages.common.retryNext", "Try again")}
                onAttachmentOpen={openAttachment}
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
              <Text
                weight="600"
                color="#1F332F"
                style={[
                  styles.readOnlyTitle,
                  { textAlign: isRtl ? "right" : "left" },
                ]}
              >
                {t(
                  "messages.thread.availabilityLoadingTitle",
                  "Loading availability...",
                )}
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
                <Text
                  color="#6F7E78"
                  style={{
                    fontSize: 14,
                    textAlign: isRtl ? "right" : "left",
                    lineHeight: 20,
                  }}
                >
                  {t("messages.thread.endedSessionNotice")}
                </Text>
              )}
              {conversation?.type === "CARE" && (
                <Text
                  color="#6F7E78"
                  style={{
                    fontSize: 14,
                    textAlign: isRtl ? "right" : "left",
                    lineHeight: 20,
                  }}
                >
                  {t("messages.thread.expiredCareNotice")}
                </Text>
              )}
              {conversation?.type === "SUPPORT" && (
                <View style={{ gap: 12 }}>
                  <Text
                    color="#6F7E78"
                    style={{
                      fontSize: 14,
                      textAlign: isRtl ? "right" : "left",
                      lineHeight: 20,
                    }}
                  >
                    {t("messages.thread.resolvedSupportNotice")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const pathname =
                        role === "patient"
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
              disabled={
                (!draft.trim() &&
                  pendingAttachments.every((item) => item.state !== "ready")) ||
                isSending ||
                pendingAttachments.some(
                  (item) =>
                    item.state === "uploading" || item.state === "failed",
                )
              }
              placeholder={t(
                "messages.thread.composerPlaceholder",
                "Write your message",
              )}
              error={composerError}
              attachments={pendingAttachments}
              onRemoveAttachment={removePendingAttachment}
              onRetryAttachment={retryPendingAttachment}
              onChooseAttachment={handleChooseAttachment}
              attachmentEnabled={Boolean(attachmentPolicy?.enabled)}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={Boolean(previewAttachment)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewAttachment(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            onPress={() => setPreviewAttachment(null)}
            accessibilityRole="button"
            accessibilityLabel={t("messages.thread.closePreview")}
            style={styles.previewClose}
          >
            <Text color="#FFFFFF" style={styles.previewCloseText}>
              ×
            </Text>
          </TouchableOpacity>
          {previewAttachment ? (
            <Image
              source={{
                uri:
                  previewUri ??
                  absoluteAttachmentUrl(previewAttachment.fileUrl),
                headers:
                  Platform.OS === "web"
                    ? undefined
                    : getApiAccessToken()
                      ? { Authorization: `Bearer ${getApiAccessToken()}` }
                      : undefined,
              }}
              style={styles.previewImage}
              resizeMode="contain"
              accessible
              accessibilityLabel={t("messages.thread.previewAttachment")}
            />
          ) : null}
        </View>
      </Modal>
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
  onAttachmentOpen,
}: {
  message: GeneralChatMessageItemDto;
  locale: string;
  isMine: boolean;
  showIdentity: boolean;
  senderLabel: string;
  senderRoleLabel: string;
  onRetry?: () => void;
  retryLabel: string;
  onAttachmentOpen: (
    attachment: GeneralChatMessageItemDto["attachments"][number],
  ) => void;
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
            <Text weight="600" color="#1F332F" style={styles.identityName}>
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
        fileUrl: absoluteAttachmentUrl(attachment.fileUrl),
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        imageHeaders: getApiAccessToken()
          ? { Authorization: `Bearer ${getApiAccessToken()}` }
          : undefined,
      }))}
      onAttachmentOpen={(attachment) =>
        onAttachmentOpen({
          fileId: attachment.key,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize ?? null,
          originalName: attachment.label,
        })
      }
      onRetry={onRetry}
      retryLabel={retryLabel}
    />
  );
}

/*
function resolveMessageText(
  message: GeneralChatMessageItemDto,
  locale?: string,
) {
  const isArabic = locale?.startsWith("ar") ?? false;
  const text = message.contentText?.trim();
  if (text) {
    return text;
  }

  if (message.attachments.length > 0) {
    const genericAttachmentText = isArabic ? "مرفق" : "Attachment";
    if (genericAttachmentText) return genericAttachmentText;
    return "مرفق";
  }

  // Legacy attachment summary branch retained below for source compatibility.
  if (message.attachments.length > 0 && !message.attachments.length) {
    return isArabic ? "مرفق" : "Attachment";
    // eslint-disable-next-line no-unreachable
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

  */
function resolveMessageText(
  message: GeneralChatMessageItemDto,
  locale?: string,
) {
  const text = message.contentText?.trim();
  if (text) return text;
  if (message.attachments.length > 0)
    return locale?.startsWith("ar") ? "مرفق" : "Attachment";
  return locale?.startsWith("ar") ? "رسالة" : "Message";
}

const styles = StyleSheet.create({
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 30, 28, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewClose: {
    position: "absolute",
    top: 54,
    end: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.35)",
  },
  previewCloseText: {
    fontSize: 30,
    lineHeight: 32,
  },
  previewImage: {
    width: "100%",
    height: "75%",
  },
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
