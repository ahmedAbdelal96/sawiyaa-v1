import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  LoadingState,
  ErrorState,
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
import {
  ConversationBubble,
  ConversationComposer,
  ConversationEmptyState,
} from "../../../src/features/messages/components/ConversationPrimitives";

export default function CareChatConversationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  React.useEffect(() => {
    if (id) {
      router.replace(`/(patient)/messages/${id}`);
    }
  }, [id, router]);

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

  if (convQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header
          showBack
          title={t("messages.inbox.sourceFollowup", "المتابعة")}
        />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (convQuery.isError || !conversation) {
    return (
      <Screen bg="background">
        <Header
          showBack
          title={t("messages.inbox.sourceFollowup", "المتابعة")}
        />
        <ErrorState fullScreen onRetry={convQuery.refetch} />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("messages.inbox.sourceFollowup", "المتابعة")}
        showBack
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
              {t("careChat.expiresOn", {
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
            <ConversationEmptyState title={t("careChat.conversation.empty")} />
          ) : (
            conversation.messages.map((msg: CareChatMessageDto, idx: number) => {
              const isMine =
                msg.senderRole === "PATIENT" ||
                (msg.senderUserId && msg.senderUserId === user?.id);

              return (
                <ConversationBubble
                  key={msg.id ?? idx}
                  isMine={Boolean(isMine)}
                  text={localizeCareChatMessageText(msg, t)}
                  timeLabel={formatTime(msg.createdAt)}
                />
              );
            })
          )}
        </ScrollView>

        {canSend ? (
          <ConversationComposer
            value={draft}
            onChangeText={setDraft}
            onSend={() => void handleSend()}
            disabled={sendMessage.isPending || !draft.trim()}
            placeholder={t("careChat.conversation.inputPlaceholder")}
            error={sendError}
          />
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
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
  },
});
