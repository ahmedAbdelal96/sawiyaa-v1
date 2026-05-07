import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ErrorState,
  Header,
  Input,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAuth } from "../../../src/providers/AuthProvider";
import { extractApiErrorMessage } from "../../../src/lib/api";
import {
  usePractitionerCareChatConversation,
  useSendPractitionerCareChatMessage,
} from "../../../src/features/practitioner/care-chat/hooks";
import { localizeCareChatMessageText } from "../../../src/features/care-chat/message-utils";
import type { CareChatMessageDto } from "../../../src/features/practitioner/care-chat/types";

export default function PractitionerCareChatConversationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const convQuery = usePractitionerCareChatConversation(id ?? null);
  const sendMessage = useSendPractitionerCareChatMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const conversation = convQuery.data;
  const canSend = conversation?.canSendMessage ?? false;

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
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
    } catch (error) {
      setSendError(extractApiErrorMessage(error));
      setDraft(text);
    }
  }

  function renderMessage(msg: CareChatMessageDto, idx: number) {
    const isMine =
      msg.senderRole === "PRACTITIONER" ||
      (msg.senderUserId && msg.senderUserId === user?.id);

    return (
      <View
        key={msg.id ?? idx}
        style={[
          styles.messageRow,
          isMine ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine
              ? [styles.bubbleMine, { backgroundColor: theme.colors.primary }]
              : [styles.bubbleTheirs, { backgroundColor: theme.colors.surface }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isMine ? "#fff" : theme.colors.textPrimary },
            ]}
          >
            {localizeCareChatMessageText(msg, t)}
          </Text>
          <Text
            style={[
              styles.messageTime,
              {
                color: isMine
                  ? "rgba(255,255,255,0.72)"
                  : theme.colors.textMuted,
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
        <Header showBack onBack={() => router.back()} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (convQuery.isError || !conversation) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <ErrorState fullScreen onRetry={convQuery.refetch} />
      </Screen>
    );
  }

  const patientName =
    conversation.patient.displayName ?? t("practitioner.careChat.fallbackPatient");
  const stateLabel = t(
    `practitioner.careChat.activityState.${conversation.activityState}`,
    conversation.activityState,
  );

  return (
    <Screen bg="background">
      <Header
        title={`${patientName} · ${stateLabel}`}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {conversation.activityState === "ACTIVE" && conversation.expiresAt ? (
          <View
            style={[
              styles.expiryBar,
              { backgroundColor: `${theme.colors.warning ?? "#f59e0b"}15` },
            ]}
          >
            <Text
              style={[
                styles.expiryText,
                { color: theme.colors.warning ?? "#f59e0b" },
              ]}
            >
              {t("practitioner.careChat.expiresOn", {
                date: new Date(conversation.expiresAt).toLocaleDateString(
                  i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" },
                ),
              })}
            </Text>
          </View>
        ) : null}

        {conversation.activityState !== "ACTIVE" ? (
          <View
            style={[
              styles.inactiveBar,
              { backgroundColor: `${theme.colors.textMuted}15` },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.inactiveText}>
              {t(
                `practitioner.careChat.inactiveNotice.${conversation.activityState}`,
                t("practitioner.careChat.inactiveNotice.default"),
              )}
            </Text>
          </View>
        ) : null}

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
              {t("practitioner.careChat.conversation.empty")}
            </Text>
          ) : (
            conversation.messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

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
                placeholder={t("practitioner.careChat.conversation.inputPlaceholder")}
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
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    maxWidth: "82%",
    padding: 10,
    borderRadius: 16,
    gap: 4,
  },
  bubbleMine: {
    borderBottomEndRadius: 4,
  },
  bubbleTheirs: {
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
