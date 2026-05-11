import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  LoadingState,
  ErrorState,
  Input,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  useCareChatConversation,
  useSendCareChatMessage,
} from "../../../src/features/patient/care-chat/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { useAuth } from "../../../src/providers/AuthProvider";
import { localizeCareChatMessageText } from "../../../src/features/care-chat/message-utils";
import type { CareChatMessageDto } from "../../../src/features/patient/care-chat/types";

export default function CareChatConversationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const { id } = useLocalSearchParams<{ id: string }>();

  const convQuery = useCareChatConversation(id ?? null);
  const sendMessage = useSendCareChatMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const conversation = convQuery.data;
  const canSend = conversation?.canSendMessage ?? false;

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      { hour: "2-digit", minute: "2-digit" },
    );
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setSendError(null);
    const text = draft.trim();
    setDraft("");
    try {
      await sendMessage.mutateAsync(text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setSendError(extractApiErrorMessage(err));
      setDraft(text);
    }
  }

  function renderMessage(msg: CareChatMessageDto, idx: number) {
    const isMe =
      msg.senderRole === "PATIENT" ||
      (msg.senderUserId && msg.senderUserId === user?.id);

    return (
      <View
        key={msg.id ?? idx}
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.bubbleMe, { backgroundColor: theme.colors.primary }]
              : [styles.bubbleThem, { backgroundColor: theme.colors.surface }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isMe ? "#fff" : theme.colors.textPrimary },
            ]}
          >
            {localizeCareChatMessageText(msg, t)}
          </Text>
          <Text
            style={[
              styles.messageTime,
              {
                color: isMe ? "rgba(255,255,255,0.7)" : theme.colors.textMuted,
              },
            ]}
          >
            {formatTime(msg.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  if (convQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (convQuery.isError || !conversation) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <ErrorState fullScreen onRetry={convQuery.refetch} />
      </Screen>
    );
  }

  const practitionerName =
    conversation.practitioner.displayName ?? t("careChat.unknownPractitioner");
  const activityStateLabel = t(
    `careChat.activityState.${conversation.activityState}`,
    conversation.activityState,
  );
  const headerTitle = `${practitionerName} — ${activityStateLabel}`;

  return (
    <Screen bg="background">
      <Header title={headerTitle} showBack  />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Expiry notice if available */}
        {conversation.activityState === "ACTIVE" && conversation.expiresAt ? (
          <View
            style={[
              styles.expiryBar,
              { backgroundColor: theme.colors.warning ?? "#f59e0b" + "15" },
            ]}
          >
            <Text
              style={[
                styles.expiryText,
                { color: theme.colors.warning ?? "#f59e0b" },
              ]}
            >
              {t("careChat.expiresOn", {
                date: new Date(conversation.expiresAt).toLocaleDateString(
                  i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" },
                ),
              })}
            </Text>
          </View>
        ) : null}

        {/* Inactive state notice */}
        {conversation.activityState !== "ACTIVE" ? (
          <View
            style={[
              styles.inactiveBar,
              { backgroundColor: theme.colors.textMuted + "15" },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.inactiveText}>
              {t(
                `careChat.inactiveNotice.${conversation.activityState}`,
                t("careChat.inactiveNotice.default"),
              )}
            </Text>
          </View>
        ) : null}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {conversation.messages.length === 0 ? (
            <Text color={theme.colors.textMuted} style={styles.emptyText}>
              {t("careChat.conversation.empty")}
            </Text>
          ) : (
            conversation.messages.map((msg: CareChatMessageDto, idx: number) =>
              renderMessage(msg, idx),
            )
          )}
        </ScrollView>

        {/* Input */}
        {canSend ? (
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: theme.colors.borderLight,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            {sendError ? (
              <Text style={[styles.sendError, { color: theme.colors.error }]}>
                {sendError}
              </Text>
            ) : null}
            <View style={styles.inputRow}>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder={t("careChat.conversation.inputPlaceholder")}
                multiline
                style={styles.input}
                maxLength={4000}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={sendMessage.isPending || !draft.trim()}
                style={[
                  styles.sendBtn,
                  { backgroundColor: theme.colors.primary },
                  (!draft.trim() || sendMessage.isPending) &&
                    styles.sendBtnDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRtl ? "arrow-back" : "arrow-forward"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  expiryBar: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  expiryText: {
    fontSize: 12,
    textAlign: "center",
  },
  inactiveBar: {
    marginHorizontal: 14,
    marginVertical: 6,
    padding: 10,
    borderRadius: 8,
  },
  inactiveText: {
    fontSize: 13,
    textAlign: "center",
  },
  messagesArea: {
    flex: 1,
    paddingHorizontal: 14,
  },
  messagesContent: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "78%",
    padding: 10,
    borderRadius: 14,
    gap: 4,
  },
  bubbleMe: {
    borderBottomEndRadius: 4,
  },
  bubbleThem: {
    borderBottomStartRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    textAlign: "right",
  },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sendError: {
    fontSize: 12,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

