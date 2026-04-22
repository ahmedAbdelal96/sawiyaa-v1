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
  Card,
  LoadingState,
  ErrorState,
  Input,
  Button,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  usePatientSupportTicket,
  useAddSupportMessage,
} from "../../../src/features/patient/support/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import type {
  SupportMessageDto,
  SupportTicketStatus,
} from "../../../src/features/patient/support/types";
import { useAuth } from "../../../src/providers/AuthProvider";

const CLOSED_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

function statusColor(
  status: SupportTicketStatus,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (status) {
    case "OPEN":
      return theme.colors.primary;
    case "IN_PROGRESS":
      return theme.colors.warning ?? "#f59e0b";
    case "WAITING_FOR_USER":
      return theme.colors.info ?? "#6366f1";
    case "ESCALATED":
      return theme.colors.error;
    case "RESOLVED":
      return theme.colors.success ?? "#22c55e";
    case "CLOSED":
      return theme.colors.textMuted;
    default:
      return theme.colors.textMuted;
  }
}

export default function SupportTicketDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const { id } = useLocalSearchParams<{ id: string }>();

  const ticketQuery = usePatientSupportTicket(id ?? null);
  const addMessage = useAddSupportMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ticket = ticketQuery.data;
  const isClosed = ticket ? CLOSED_STATUSES.includes(ticket.status) : false;
  const canReply = ticket && !isClosed;

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      { hour: "2-digit", minute: "2-digit" },
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      { day: "numeric", month: "short", year: "numeric" },
    );
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setSendError(null);
    const text = draft.trim();
    setDraft("");
    try {
      await addMessage.mutateAsync(text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setSendError(extractApiErrorMessage(err));
      setDraft(text);
    }
  }

  function renderMessage(msg: SupportMessageDto, idx: number) {
    const isPatient =
      msg.senderRole === "PATIENT" ||
      (msg.senderUserId && msg.senderUserId === user?.id);
    return (
      <View
        key={msg.id ?? idx}
        style={[
          styles.messageRow,
          isPatient ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isPatient
              ? [
                  styles.bubblePatient,
                  { backgroundColor: theme.colors.primary },
                ]
              : [styles.bubbleAgent, { backgroundColor: theme.colors.surface }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isPatient ? "#fff" : theme.colors.textPrimary },
            ]}
          >
            {msg.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              {
                color: isPatient
                  ? "rgba(255,255,255,0.7)"
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

  if (ticketQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <ErrorState fullScreen onRetry={ticketQuery.refetch} />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("support.detail.title")}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Ticket info card */}
        <View style={styles.infoCard}>
          <Text weight="bold" style={styles.ticketSubject} numberOfLines={2}>
            {ticket.subject}
          </Text>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: statusColor(ticket.status, theme) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: statusColor(ticket.status, theme) },
                ]}
              >
                {t(`support.statuses.${ticket.status}`, ticket.status)}
              </Text>
            </View>
            <Text color={theme.colors.textMuted} style={styles.dateLabel}>
              {formatDate(ticket.createdAt)}
            </Text>
          </View>
          {ticket.description ? (
            <Text color={theme.colors.textSecondary} style={styles.description}>
              {ticket.description}
            </Text>
          ) : null}
        </View>

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
          {(ticket.messages ?? []).length === 0 ? (
            <Text color={theme.colors.textMuted} style={styles.noMessagesText}>
              {t("support.detail.noMessages")}
            </Text>
          ) : (
            ticket.messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

        {/* Closed notice */}
        {isClosed ? (
          <View
            style={[
              styles.closedNotice,
              { backgroundColor: theme.colors.textMuted + "15" },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.closedText}>
              {t("support.detail.closedNotice")}
            </Text>
          </View>
        ) : null}

        {/* Reply input */}
        {canReply ? (
          <View
            style={[
              styles.replyBar,
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
            <View style={styles.replyRow}>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder={t("support.detail.replyPlaceholder")}
                multiline
                style={styles.replyInput}
                maxLength={4000}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={addMessage.isPending || !draft.trim()}
                style={[
                  styles.sendBtn,
                  { backgroundColor: theme.colors.primary },
                  (!draft.trim() || addMessage.isPending) &&
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
  flex: {
    flex: 1,
  },
  infoCard: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "transparent",
    gap: 6,
  },
  ticketSubject: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateLabel: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  messagesArea: {
    flex: 1,
    paddingHorizontal: 14,
  },
  messagesContent: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  noMessagesText: {
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
  bubblePatient: {
    borderBottomEndRadius: 4,
  },
  bubbleAgent: {
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
  closedNotice: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  closedText: {
    fontSize: 13,
    textAlign: "center",
  },
  replyBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sendError: {
    fontSize: 12,
    marginBottom: 6,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  replyInput: {
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
