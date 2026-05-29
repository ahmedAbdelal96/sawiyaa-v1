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
  Button,
  Card,
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
  useAddPractitionerSupportMessage,
  usePractitionerSupportTicket,
} from "../../../src/features/practitioner/support/hooks";
import type {
  SupportMessageDto,
  SupportTicketStatus,
} from "../../../src/features/practitioner/support/types";

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
      return theme.colors.info ?? "#0284c7";
    case "ESCALATED":
      return theme.colors.error;
    case "RESOLVED":
      return theme.colors.success ?? "#16a34a";
    case "CLOSED":
    default:
      return theme.colors.textMuted;
  }
}

function shortReference(value: string | null) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export default function PractitionerSupportDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();
  const returnToRoute =
    typeof returnTo === "string" && returnTo.trim().length > 0
      ? returnTo
      : null;

  const ticketQuery = usePractitionerSupportTicket(id ?? null);
  const addMessage = useAddPractitionerSupportMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ticket = ticketQuery.data;
  const isClosed = ticket ? CLOSED_STATUSES.includes(ticket.status) : false;
  const canReply = Boolean(ticket && !isClosed);

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      { hour: "2-digit", minute: "2-digit" },
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
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
    } catch (error) {
      setSendError(extractApiErrorMessage(error));
      setDraft(text);
    }
  }

  function renderMessage(msg: SupportMessageDto, idx: number) {
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
            {msg.message}
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

  if (ticketQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header
          showBack
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
        />
        <ErrorState fullScreen onRetry={ticketQuery.refetch} />
      </Screen>
    );
  }

  const color = statusColor(ticket.status, theme);
  const reference =
    shortReference(ticket.relatedSessionId) ??
    shortReference(ticket.relatedPaymentId) ??
    shortReference(ticket.relatedMatchingSessionId) ??
    shortReference(ticket.relatedInstantBookingRequestId) ??
    shortReference(ticket.relatedAssessmentSubmissionId);

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.support.detail.title")}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <View style={styles.summaryWrap}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryMeta}>
                <Text weight="600" style={styles.subject} numberOfLines={2}>
                  {ticket.subject}
                </Text>
                <Text color={theme.colors.textMuted} style={styles.dateText}>
                  {formatDate(ticket.createdAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${color}20` },
                ]}
              >
                <Text style={[styles.statusPillText, { color }]}>
                  {t(`practitioner.support.statuses.${ticket.status}`, ticket.status)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text color={theme.colors.textSecondary} style={styles.metaText}>
                {t(`practitioner.support.categories.${ticket.category}`, ticket.category)}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.metaText}>
                {t(`practitioner.support.priorities.${ticket.priority}`, ticket.priority)}
              </Text>
            </View>

            {ticket.description ? (
              <Text color={theme.colors.textSecondary} style={styles.description}>
                {ticket.description}
              </Text>
            ) : null}

            {reference ? (
              <Text color={theme.colors.textMuted} style={styles.reference}>
                {t("practitioner.support.reference", { value: reference })}
              </Text>
            ) : null}
          </Card>
        </View>

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
              {t("practitioner.support.detail.noMessages")}
            </Text>
          ) : (
            ticket.messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

        {isClosed ? (
          <View
            style={[
              styles.closedNotice,
              { backgroundColor: theme.colors.textMuted + "12" },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.closedText}>
              {t("practitioner.support.detail.closedNotice")}
            </Text>
          </View>
        ) : null}

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
                placeholder={t("practitioner.support.detail.replyPlaceholder")}
                multiline
                style={styles.replyInput}
                containerStyle={styles.replyInputContainer}
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
                accessibilityRole="button"
                accessibilityLabel={t("support.detail.sendMessage")}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Button
              title={t("practitioner.support.detail.backToList")}
              variant="secondary"
              onPress={() => router.back()}
              style={styles.secondaryButton}
            />
          </View>
        ) : (
          <View style={styles.bottomSpacer} />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  summaryWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  summaryCard: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  summaryMeta: {
    flex: 1,
  },
  subject: {
    fontSize: 17,
    lineHeight: 24,
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  reference: {
    fontSize: 12,
  },
  messagesArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },
  noMessagesText: {
    textAlign: "center",
    marginTop: 32,
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
    padding: 11,
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
  closedNotice: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
  },
  closedText: {
    fontSize: 13,
    textAlign: "center",
  },
  replyBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  sendError: {
    fontSize: 12,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  replyInputContainer: {
    flex: 1,
    marginBottom: 0,
    minWidth: 0,
  },
  replyInput: {
    minHeight: 46,
    maxHeight: 120,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    marginTop: 2,
  },
  bottomSpacer: {
    height: 10,
  },
});


