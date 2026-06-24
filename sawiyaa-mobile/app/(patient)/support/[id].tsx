import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
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
  usePatientSupportTicket,
  useAddSupportMessage,
} from "../../../src/features/patient/support/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import type { SupportTicketStatus } from "../../../src/features/patient/support/types";
import { useAuth } from "../../../src/providers/AuthProvider";
import {
  ConversationBubble,
  ConversationComposer,
  ConversationEmptyState,
} from "../../../src/features/messages/components/ConversationPrimitives";

const CLOSED_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

export default function SupportTicketDetailScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const ticketQuery = usePatientSupportTicket(id ?? null);
  const addMessage = useAddSupportMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ticket = ticketQuery.data;
  const isClosed = ticket ? CLOSED_STATUSES.includes(ticket.status) : false;
  const canReply = Boolean(ticket) && !isClosed;

  function formatTime(dateStr: string): string {
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
            <ConversationEmptyState title={t("support.detail.noMessages")} />
          ) : (
            ticket.messages.map((msg, idx) => {
              const isMine =
                msg.senderRole === "PATIENT" ||
                (msg.senderUserId && msg.senderUserId === user?.id);

              return (
                <ConversationBubble
                  key={msg.id ?? idx}
                  isMine={Boolean(isMine)}
                  text={msg.message}
                  timeLabel={formatTime(msg.createdAt)}
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
              {t("support.detail.closedNotice")}
            </Text>
          </View>
        ) : null}

        {canReply ? (
          <ConversationComposer
            value={draft}
            onChangeText={setDraft}
            onSend={() => void handleSend()}
            disabled={addMessage.isPending || !draft.trim()}
            placeholder={t("support.detail.replyPlaceholder")}
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
