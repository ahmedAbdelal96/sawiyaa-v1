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
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  useAddPractitionerSupportMessage,
  usePractitionerSupportTicket,
} from "../../../src/features/practitioner/support/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { formatViewerTime } from "../../../src/lib/time-formatting";
import type { SupportTicketStatus } from "../../../src/features/practitioner/support/types";
import { useAuth } from "../../../src/providers/AuthProvider";
import {
  ConversationBubble,
  ConversationComposer,
  ConversationEmptyState,
} from "../../../src/features/messages/components/ConversationPrimitives";

const CLOSED_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

export default function PractitionerSupportConversationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const returnToRoute =
    typeof returnTo === "string" && returnTo.trim().length > 0
      ? returnTo
      : "/(practitioner)/messages?tab=support";

  const ticketQuery = usePractitionerSupportTicket(id ?? null);

  React.useEffect(() => {
    if (ticketQuery.data?.conversationId) {
      router.replace(`/(practitioner)/messages/${ticketQuery.data.conversationId}`);
    }
  }, [ticketQuery.data?.conversationId, router]);

  const addMessage = useAddPractitionerSupportMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ticket = ticketQuery.data;
  const isClosed = ticket ? CLOSED_STATUSES.includes(ticket.status) : false;
  const canReply = Boolean(ticket) && !isClosed;

  async function handleSend() {
    if (!draft.trim()) return;
    setSendError(null);
    const text = draft.trim();
    setDraft("");
    try {
      await addMessage.mutateAsync(text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    } catch (err) {
      setSendError(extractApiErrorMessage(err));
      setDraft(text);
    }
  }

  if (ticketQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header
          showBack
          title={t("messages.inbox.sourceSupport", "محادثة الدعم")}
          onBack={() => router.replace(returnToRoute as any)}
        />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <Screen bg="background">
        <Header
          showBack
          title={t("messages.inbox.sourceSupport", "محادثة الدعم")}
          onBack={() => router.replace(returnToRoute as any)}
        />
        <ErrorState fullScreen onRetry={ticketQuery.refetch} />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("messages.inbox.sourceSupport", "محادثة الدعم")}
        showBack
        onBack={() => router.replace(returnToRoute as any)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {(ticket.messages ?? []).length === 0 ? (
            <ConversationEmptyState
              title={t("support.detail.noMessages", "لا توجد رسائل بعد.")}
            />
          ) : (
            ticket.messages.map((message, idx) => {
              const isMine =
                message.senderRole === "PRACTITIONER" ||
                (message.senderUserId && message.senderUserId === user?.id);

              return (
                <ConversationBubble
                  key={message.id ?? idx}
                  isMine={Boolean(isMine)}
                  text={message.message}
                  timeLabel={formatViewerTime(message.createdAt, {
                    locale: i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                    fallbackText: "-",
                  })}
                />
              );
            })
          )}
        </ScrollView>

        {isClosed ? (
          <View
            style={[
              styles.closedBanner,
              { backgroundColor: theme.colors.textMuted + "12" },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.closedText}>
              {t("support.detail.closedNotice", "هذه المحادثة لا تقبل رسائل جديدة حاليًا.")}
            </Text>
          </View>
        ) : null}

        {canReply ? (
          <ConversationComposer
            value={draft}
            onChangeText={setDraft}
            onSend={() => void handleSend()}
            disabled={addMessage.isPending || !draft.trim()}
            placeholder={t("support.detail.replyPlaceholder", "اكتب رسالتك")}
            error={sendError}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closedBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  closedText: {
    fontSize: 12,
    textAlign: "center",
  },
});
